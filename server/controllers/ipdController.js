/**
 * IPD Controller — Wards, Beds, Admissions, Round Notes, Bed Events
 * Suman Multispecialty Hospital
 */

import Ward from '../models/Ward.js';
import Bed from '../models/Bed.js';
import BedBooking from '../models/BedBooking.js';
import BedEvent from '../models/BedEvent.js';
import Admission from '../models/Admission.js';
import RoundNote from '../models/RoundNote.js';
import Invoice from '../models/Invoice.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import { getNextAdmissionNumber, getNextInvoiceNumber } from '../utils/counter.js';
import { getTodayIST, toISTDateString } from '../utils/dateUtils.js';

export const VALID_BED_TRANSITIONS = {
  Available: ['Reserved', 'Occupied', 'Maintenance'],
  Reserved: ['Occupied', 'Available'],
  Occupied: ['Cleaning'], // Occupied cannot go directly to Maintenance or Available
  Cleaning: ['Available'],
  Maintenance: ['Available'],
};

/**
 * Appends an entry to the append-only BedEvent ledger
 */
export const recordBedEvent = async ({
  bedId,
  from,
  to,
  action,
  user,
  reason = '',
  refs = {},
}) => {
  return await BedEvent.create({
    bedId,
    from,
    to,
    action,
    by: user
      ? {
          userId: user._id,
          role: user.role,
          name: user.name || user.role,
        }
      : { role: 'system', name: 'System Auto-Expiry' },
    at: new Date(),
    reason,
    refs,
  });
};

/**
 * Lazy expiry helper — runs before bed board, availability, bookings, and admissions.
 * Releases Reserved beds whose holdUntil has passed, and expires bookings whose date passed.
 */
export const releaseExpiredHolds = async () => {
  const now = new Date();
  const today = getTodayIST();

  // 1. Expire beds whose holdUntil <= now
  const expiredBeds = await Bed.find({
    status: 'Reserved',
    holdUntil: { $lte: now, $ne: null },
  });

  for (const bed of expiredBeds) {
    const bookingId = bed.heldForBookingId;
    const updatedBed = await Bed.findOneAndUpdate(
      { _id: bed._id, status: 'Reserved', holdUntil: { $lte: now } },
      { status: 'Available', heldForBookingId: null, holdUntil: null },
      { new: true }
    );
    if (updatedBed) {
      if (bookingId) {
        await BedBooking.findByIdAndUpdate(bookingId, {
          status: 'Expired',
          decisionReason: 'Hold reservation time expired',
        });
      }
      await recordBedEvent({
        bedId: bed._id,
        from: 'Reserved',
        to: 'Available',
        action: 'expired_release',
        user: null,
        reason: 'Hold reservation time expired',
        refs: { bookingId },
      });
    }
  }

  // 2. Expire approved bookings whose expectedDate is before today IST
  await BedBooking.updateMany(
    {
      status: 'Approved',
      expectedDate: { $lt: today },
    },
    {
      $set: {
        status: 'Expired',
        decisionReason: 'Expected admission date has passed without admission',
      },
    }
  );
};

// ─── Ward Availability (Public / Patient / Staff) ──────────────────────────

/**
 * Availability counts + daily rate per ward type (no occupant info).
 * Available for all roles: patient, receptionist, nurse, doctor, admin.
 */
export const getWardAvailability = async (req, res) => {
  try {
    await releaseExpiredHolds();

    const wardTypes = ['General', 'Pediatric', 'Maternity/Gynae', 'Private'];
    const results = [];

    for (const type of wardTypes) {
      const wards = await Ward.find({ type, isActive: true }).select('_id');
      const wardIds = wards.map((w) => w._id);

      const totalBeds = await Bed.countDocuments({
        wardId: { $in: wardIds },
        isActive: true,
      });

      const rawAvailable = await Bed.countDocuments({
        wardId: { $in: wardIds },
        status: 'Available',
        isActive: true,
      });

      // Beds held for approved same-day bookings
      const heldSameDay = await Bed.countDocuments({
        wardId: { $in: wardIds },
        status: 'Reserved',
        heldForBookingId: { $ne: null },
        isActive: true,
      });

      // Patient availability = Available beds minus beds held for approved same-day bookings
      const availableCount = Math.max(0, rawAvailable - heldSameDay);

      // Representative daily rate for this ward type
      const sampleBed = await Bed.findOne({ wardId: { $in: wardIds }, isActive: true }).sort({ dailyCharge: 1 });
      const dailyRate = sampleBed ? sampleBed.dailyCharge : 0;

      results.push({
        wardType: type,
        totalBeds,
        availableBeds: availableCount,
        dailyRatePaise: dailyRate,
        dailyRateRupees: dailyRate / 100,
      });
    }

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Wards Management ──────────────────────────────────────────────────────

export const listWards = async (req, res) => {
  try {
    const wards = await Ward.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: wards });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createWard = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can manage wards' });
    }
    const ward = await Ward.create(req.body);
    res.status(201).json({ success: true, data: ward });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateWard = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can manage wards' });
    }
    const ward = await Ward.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ward) return res.status(404).json({ success: false, message: 'Ward not found' });
    res.json({ success: true, data: ward });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Beds Management & Bed Board ───────────────────────────────────────────

/**
 * Full Bed Board — Role-enforced occupant visibility:
 * - Patient: 403 Forbidden
 * - Receptionist, Nurse, Admin: full occupant name + UHID
 * - Doctor: own patients named with UHID; others masked as "Occupied"
 */
export const listBeds = async (req, res) => {
  try {
    await releaseExpiredHolds();

    if (req.user.role === 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Patients are not permitted to view the hospital bed board',
      });
    }

    const q = { isActive: true };
    if (req.query.wardId) q.wardId = req.query.wardId;
    if (req.query.status) q.status = req.query.status;

    let doctorId = null;
    if (req.user.role === 'doctor') {
      const doc = await Doctor.findOne({ userId: req.user._id });
      doctorId = doc?._id;
    }

    const beds = await Bed.find(q)
      .populate('wardId', 'name type isActive')
      .populate({
        path: 'currentAdmissionId',
        select: 'admissionNumber patientId admittingDoctorId admittedAt',
        populate: [
          { path: 'patientId', select: 'uhid name phone gender dob approxAge' },
          { path: 'admittingDoctorId', select: 'name specialization' },
        ],
      })
      .populate({
        path: 'heldForBookingId',
        select: 'bookingNumber patientId expectedDate holdUntil',
        populate: { path: 'patientId', select: 'uhid name' },
      })
      .sort({ 'wardId': 1, bedNumber: 1 });

    // Doctor privacy filter: mask other doctors' patients
    const sanitizedBeds = beds.map((b) => {
      const bedObj = b.toObject();
      if (req.user.role === 'doctor' && bedObj.status === 'Occupied' && bedObj.currentAdmissionId) {
        const isOwn =
          doctorId &&
          bedObj.currentAdmissionId.admittingDoctorId &&
          bedObj.currentAdmissionId.admittingDoctorId._id.toString() === doctorId.toString();

        if (!isOwn) {
          bedObj.currentAdmissionId = {
            _id: bedObj.currentAdmissionId._id,
            admissionNumber: '***',
            patientId: {
              _id: null,
              name: 'Occupied',
              uhid: '***',
            },
            admittingDoctorId: null,
            admittedAt: bedObj.currentAdmissionId.admittedAt,
          };
        }
      }
      return bedObj;
    });

    res.json({ success: true, data: sanitizedBeds });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getOccupancySummary = async (req, res) => {
  try {
    await releaseExpiredHolds();

    if (req.user.role === 'patient') {
      return res.status(403).json({ success: false, message: 'Patients cannot access occupancy summary' });
    }

    const summary = await Bed.aggregate([
      { $lookup: { from: 'wards', localField: 'wardId', foreignField: '_id', as: 'ward' } },
      { $unwind: '$ward' },
      { $match: { 'ward.isActive': true, isActive: true } },
      {
        $group: {
          _id: { wardId: '$wardId', wardName: '$ward.name', wardType: '$ward.type' },
          total: { $sum: 1 },
          available: { $sum: { $cond: [{ $eq: ['$status', 'Available'] }, 1, 0] } },
          reserved: { $sum: { $cond: [{ $eq: ['$status', 'Reserved'] }, 1, 0] } },
          occupied: { $sum: { $cond: [{ $eq: ['$status', 'Occupied'] }, 1, 0] } },
          cleaning: { $sum: { $cond: [{ $eq: ['$status', 'Cleaning'] }, 1, 0] } },
          maintenance: { $sum: { $cond: [{ $eq: ['$status', 'Maintenance'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.wardName': 1 } },
    ]);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createBed = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can add beds' });
    }
    const bed = await Bed.create({
      ...req.body,
      dailyCharge: Math.round(req.body.dailyCharge || 0),
    });
    res.status(201).json({ success: true, data: bed });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Bed number already exists in this ward' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateBed = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can update bed details' });
    }
    const bed = await Bed.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
    res.json({ success: true, data: bed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Bed status transitions with atomic concurrency and state machine enforcement:
 * - Available -> Reserved (manual hold) [Receptionist, Admin]
 * - Reserved -> Available (manual release) [Receptionist, Admin]
 * - Cleaning -> Available [Nurse, Admin]
 * - Available -> Maintenance [Nurse, Admin]
 * - Maintenance -> Available [Admin only; reason required]
 * Occupied cannot transition directly to Maintenance or Available (409).
 */
export const updateBedStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: targetStatus, reason = '', holdHours = 6 } = req.body;
    const role = req.user.role;

    const currentBed = await Bed.findById(id);
    if (!currentBed) {
      return res.status(404).json({ success: false, message: 'Bed not found' });
    }

    const currentStatus = currentBed.status;

    // Check state machine validity
    const allowedTargets = VALID_BED_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(targetStatus)) {
      return res.status(409).json({
        success: false,
        message: `Cannot transition bed from '${currentStatus}' to '${targetStatus}'. Valid transitions are: ${allowedTargets.join(', ') || 'none'}.`,
      });
    }

    // Role-specific permission check per transition
    if (currentStatus === 'Cleaning' && targetStatus === 'Available') {
      if (!['nurse', 'admin'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Only nurse or admin can mark Cleaning bed as Available' });
      }
    } else if (currentStatus === 'Available' && targetStatus === 'Maintenance') {
      if (!['nurse', 'admin'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Only nurse or admin can report bed Maintenance' });
      }
    } else if (currentStatus === 'Maintenance' && targetStatus === 'Available') {
      if (role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admin can clear bed Maintenance' });
      }
      if (!reason?.trim()) {
        return res.status(400).json({ success: false, message: 'A reason note is required to clear Maintenance' });
      }
    } else if (currentStatus === 'Available' && targetStatus === 'Reserved') {
      if (!['receptionist', 'admin'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Only receptionist or admin can hold a bed manually' });
      }
    } else if (currentStatus === 'Reserved' && targetStatus === 'Available') {
      if (!['receptionist', 'admin'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Only receptionist or admin can release a bed manually' });
      }
    } else {
      // Admitting or discharging have dedicated endpoints (admitPatient, dischargePatient)
      return res.status(409).json({
        success: false,
        message: `Transition '${currentStatus}' -> '${targetStatus}' must be performed through its dedicated workflow endpoint`,
      });
    }

    // Prepare update payload
    const updatePayload = { status: targetStatus };
    let actionName = 'status_change';

    if (targetStatus === 'Reserved') {
      // Calculate holdUntil capped at end of day IST
      const now = new Date();
      const targetTime = new Date(now.getTime() + holdHours * 60 * 60 * 1000);
      const [year, month, day] = getTodayIST().split('-').map(Number);
      const endOfDay = new Date(Date.UTC(year, month - 1, day, 18, 29, 59, 999));
      updatePayload.holdUntil = targetTime < endOfDay ? targetTime : endOfDay;
      actionName = 'hold';
    } else if (targetStatus === 'Available') {
      updatePayload.heldForBookingId = null;
      updatePayload.holdUntil = null;
      updatePayload.maintenanceReason = null;
      if (currentStatus === 'Cleaning') actionName = 'clean';
      else if (currentStatus === 'Maintenance') actionName = 'maintenance_clear';
      else if (currentStatus === 'Reserved') actionName = 'release';
    } else if (targetStatus === 'Maintenance') {
      updatePayload.maintenanceReason = reason || 'Maintenance reported';
      actionName = 'maintenance_report';
    }

    // Atomic conditional update
    const updatedBed = await Bed.findOneAndUpdate(
      { _id: id, status: currentStatus },
      updatePayload,
      { new: true }
    );

    if (!updatedBed) {
      return res.status(409).json({
        success: false,
        message: 'Concurrent modification conflict: bed status has already changed.',
      });
    }

    // Record BedEvent
    await recordBedEvent({
      bedId: id,
      from: currentStatus,
      to: targetStatus,
      action: actionName,
      user: req.user,
      reason,
    });

    res.json({ success: true, data: updatedBed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Bed Event History (Admin only, append-only ledger)
 */
export const getBedEvents = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can view bed audit events' });
    }
    const events = await BedEvent.find({ bedId: req.params.id })
      .populate('refs.bookingId', 'bookingNumber')
      .populate('refs.admissionId', 'admissionNumber')
      .sort({ at: -1 })
      .limit(100);
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Admissions Management ─────────────────────────────────────────────────

export const listAdmissions = async (req, res) => {
  try {
    const role = req.user.role;
    const q = {};

    if (role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) return res.json({ success: true, data: [] });
      q.patientId = patient._id;
    } else if (role === 'doctor') {
      const doc = await Doctor.findOne({ userId: req.user._id });
      if (req.query.myPatientsOnly === 'true' && doc) {
        q.admittingDoctorId = doc._id;
      }
    }

    if (req.query.status) q.status = req.query.status;
    if (req.query.patientId && role !== 'patient') q.patientId = req.query.patientId;

    const admissions = await Admission.find(q)
      .populate('patientId', 'uhid name phone gender dob approxAge')
      .populate('admittingDoctorId', 'name specialization')
      .populate('departmentId', 'name')
      .populate('bedId', 'bedNumber wardId dailyCharge')
      .sort({ admittedAt: -1 })
      .limit(100);

    res.json({ success: true, data: admissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Patient: Read-only current admission card
 */
export const getMyAdmission = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.json({ success: true, data: null });
    }

    const admission = await Admission.findOne({
      patientId: patient._id,
      status: 'Admitted',
    })
      .populate({
        path: 'bedId',
        select: 'bedNumber dailyCharge',
        populate: { path: 'wardId', select: 'name type' },
      })
      .populate('admittingDoctorId', 'name specialization');

    if (!admission) {
      return res.json({ success: true, data: null });
    }

    // Calculate days so far (calendar days touched)
    const admittedDateStr = toISTDateString(admission.admittedAt);
    const todayDateStr = getTodayIST();
    const [y1, m1, d1] = admittedDateStr.split('-').map(Number);
    const [y2, m2, d2] = todayDateStr.split('-').map(Number);
    const daysSoFar = Math.max(1, Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1);

    res.json({
      success: true,
      data: {
        admissionNumber: admission.admissionNumber,
        ward: admission.bedId?.wardId?.name,
        wardType: admission.bedId?.wardId?.type,
        bedNumber: admission.bedId?.bedNumber,
        dailyCharge: admission.bedId?.dailyCharge,
        admittedDate: admittedDateStr,
        admittedAt: admission.admittedAt,
        doctorName: admission.admittingDoctorId?.name,
        specialization: admission.admittingDoctorId?.specialization,
        daysSoFar,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAdmission = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id)
      .populate('patientId', 'uhid name phone gender dob approxAge bloodGroup')
      .populate('admittingDoctorId', 'name specialization qualification')
      .populate('departmentId', 'name')
      .populate({
        path: 'bedId',
        populate: { path: 'wardId', select: 'name type' },
      })
      .populate('admittedBy', 'name role')
      .populate('dischargedBy', 'name role')
      .populate('transfers.fromBedId', 'bedNumber')
      .populate('transfers.toBedId', 'bedNumber')
      .populate('transfers.by', 'name role');

    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });

    // Patient can only view their own admission
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient || !admission.patientId.equals(patient._id)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.json({ success: true, data: admission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Admit Patient (Receptionist, Doctor for own patient, Admin)
 * Invariant: Never leave a bed Occupied without an Admission, or Admission without a bed.
 * Atomically claims bed first; rolls back if later steps fail.
 */
export const admitPatient = async (req, res) => {
  try {
    await releaseExpiredHolds();

    const role = req.user.role;
    if (!['receptionist', 'doctor', 'admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Your role is not authorized to admit patients' });
    }

    const {
      patientId,
      admittingDoctorId,
      departmentId,
      bedId,
      bookingId,
      expectedDischargeDate,
      reasonForAdmission,
      provisionalDiagnosis,
    } = req.body;

    if (!patientId || !admittingDoctorId || !departmentId || !bedId || !reasonForAdmission) {
      return res.status(400).json({
        success: false,
        message: 'patientId, admittingDoctorId, departmentId, bedId, and reasonForAdmission are required',
      });
    }

    // Doctor can only admit own patient
    if (role === 'doctor') {
      const doc = await Doctor.findOne({ userId: req.user._id });
      if (!doc || doc._id.toString() !== admittingDoctorId.toString()) {
        return res.status(403).json({ success: false, message: 'Doctors can only admit their own patients' });
      }
    }

    // Check if patient already has an active admission
    const existingAdmission = await Admission.findOne({ patientId, status: 'Admitted' });
    if (existingAdmission) {
      return res.status(409).json({
        success: false,
        message: `Patient is already admitted (Admission: ${existingAdmission.admissionNumber})`,
      });
    }

    // Verify booking if provided
    let booking = null;
    if (bookingId) {
      booking = await BedBooking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking record not found' });
      }
      if (booking.status !== 'Approved') {
        return res.status(409).json({
          success: false,
          message: `Booking must be in 'Approved' status to admit. Current status: '${booking.status}'`,
        });
      }
    }

    // Atomic bed claim:
    // Bed must be either Available, OR Reserved specifically for this booking
    const bedClaimFilter = booking
      ? { _id: bedId, $or: [{ status: 'Available' }, { status: 'Reserved', heldForBookingId: booking._id }] }
      : { _id: bedId, status: 'Available' };

    const originalBed = await Bed.findById(bedId);
    if (!originalBed) {
      return res.status(404).json({ success: false, message: 'Bed not found' });
    }
    const previousStatus = originalBed.status;

    const claimedBed = await Bed.findOneAndUpdate(
      bedClaimFilter,
      { status: 'Occupied', heldForBookingId: null, holdUntil: null },
      { new: true }
    );

    if (!claimedBed) {
      return res.status(409).json({
        success: false,
        message: 'Bed is not available for admission. It may have been taken or reservation expired.',
      });
    }

    // Proceed to create admission; rollback if anything fails
    let admission;
    try {
      const admissionNumber = await getNextAdmissionNumber();
      admission = await Admission.create({
        admissionNumber,
        bookingId: booking?._id || undefined,
        patientId,
        admittingDoctorId,
        departmentId,
        bedId,
        admittedAt: new Date(),
        expectedDischargeDate: expectedDischargeDate ? new Date(expectedDischargeDate) : undefined,
        reasonForAdmission,
        provisionalDiagnosis,
        status: 'Admitted',
        admittedBy: req.user._id,
      });

      // Back-link bed to admission
      claimedBed.currentAdmissionId = admission._id;
      await claimedBed.save();

      // If admitted from booking, update booking status
      if (booking) {
        booking.status = 'Admitted';
        booking.admissionId = admission._id;
        await booking.save();
      }

      // Record BedEvent
      await recordBedEvent({
        bedId,
        from: previousStatus,
        to: 'Occupied',
        action: 'admit',
        user: req.user,
        reason: `Admitted: ${admissionNumber}`,
        refs: { admissionId: admission._id, bookingId: booking?._id },
      });

      res.status(201).json({ success: true, data: admission });
    } catch (err) {
      // Compensating rollback
      await Bed.findByIdAndUpdate(bedId, {
        status: previousStatus,
        currentAdmissionId: null,
        heldForBookingId: previousStatus === 'Reserved' ? booking?._id : null,
      });

      await recordBedEvent({
        bedId,
        from: 'Occupied',
        to: previousStatus,
        action: 'rollback_admit',
        user: req.user,
        reason: `Admission creation failed, rolled back: ${err.message}`,
        refs: { bookingId: booking?._id },
      });

      throw err;
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Transfer Bed (Receptionist, Nurse, Doctor, Admin)
 * Reason is strictly required. Atomic for both beds.
 */
export const transferBed = async (req, res) => {
  try {
    const role = req.user.role;
    if (!['receptionist', 'nurse', 'doctor', 'admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Your role cannot transfer beds' });
    }

    const { toBedId, reason } = req.body;
    if (!toBedId || !reason?.trim()) {
      return res.status(400).json({ success: false, message: 'Target bed (toBedId) and transfer reason are required' });
    }

    const admission = await Admission.findById(req.params.id);
    if (!admission || admission.status !== 'Admitted') {
      return res.status(404).json({ success: false, message: 'Active admission not found' });
    }

    const oldBedId = admission.bedId;
    if (oldBedId.toString() === toBedId.toString()) {
      return res.status(400).json({ success: false, message: 'Target bed cannot be the same as current bed' });
    }

    // Atomically claim the new bed
    const newBed = await Bed.findOneAndUpdate(
      { _id: toBedId, status: 'Available' },
      { status: 'Occupied', currentAdmissionId: admission._id },
      { new: true }
    );

    if (!newBed) {
      return res.status(409).json({ success: false, message: 'Target bed is not available for transfer' });
    }

    // Release old bed to Cleaning
    const oldBed = await Bed.findOneAndUpdate(
      { _id: oldBedId, status: 'Occupied' },
      { status: 'Cleaning', currentAdmissionId: null },
      { new: true }
    );

    admission.transfers.push({
      fromBedId: oldBedId,
      toBedId,
      reason: reason.trim(),
      by: req.user._id,
      at: new Date(),
    });
    admission.bedId = toBedId;
    await admission.save();

    // Record BedEvents
    await recordBedEvent({
      bedId: oldBedId,
      from: 'Occupied',
      to: 'Cleaning',
      action: 'transfer_out',
      user: req.user,
      reason: `Transfer to bed ${newBed.bedNumber}: ${reason}`,
      refs: { admissionId: admission._id },
    });

    await recordBedEvent({
      bedId: toBedId,
      from: 'Available',
      to: 'Occupied',
      action: 'transfer_in',
      user: req.user,
      reason: `Transfer from bed ${oldBed?.bedNumber || oldBedId}: ${reason}`,
      refs: { admissionId: admission._id },
    });

    res.json({ success: true, data: admission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Discharge Patient:
 * - Admitting doctor, or Admin with override reason
 * - Summary completion
 * - Days calculation = calendar days touched, a day started counts as a full day
 * - Store finalChargeSummary
 * - Unpaid invoice check if billing module enabled
 * - Bed goes to Cleaning
 */
export const dischargePatient = async (req, res) => {
  try {
    const { dischargeSummary, dischargeOverrideReason } = req.body;
    const role = req.user.role;

    if (!['doctor', 'admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only treating doctors or admins can discharge patients' });
    }

    const admission = await Admission.findById(req.params.id);
    if (!admission || admission.status !== 'Admitted') {
      return res.status(404).json({ success: false, message: 'Active admission not found' });
    }

    // Doctor role check: must be admitting doctor
    if (role === 'doctor') {
      const doc = await Doctor.findOne({ userId: req.user._id });
      if (!doc || !admission.admittingDoctorId.equals(doc._id)) {
        return res.status(403).json({
          success: false,
          message: 'Only the admitting doctor can discharge the patient',
        });
      }
    } else if (role === 'admin') {
      // Admin override requires a reason if not the admitting doctor
      if (!dischargeOverrideReason?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Admin discharge override requires an explicit dischargeOverrideReason',
        });
      }
    }

    // Validate summary
    if (
      !dischargeSummary ||
      !dischargeSummary.finalDiagnosis?.trim() ||
      !dischargeSummary.treatmentGiven?.trim() ||
      !dischargeSummary.conditionAtDischarge
    ) {
      return res.status(400).json({
        success: false,
        message: 'finalDiagnosis, treatmentGiven, and conditionAtDischarge are required in discharge summary',
      });
    }

    const dischargedAt = new Date();

    // Bed days calculation: calendar days touched, with a day started counting as a full day
    const admittedDateStr = toISTDateString(admission.admittedAt);
    const dischargedDateStr = toISTDateString(dischargedAt);
    const [y1, m1, d1] = admittedDateStr.split('-').map(Number);
    const [y2, m2, d2] = dischargedDateStr.split('-').map(Number);
    const days = Math.max(1, Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1);

    const bed = await Bed.findById(admission.bedId);
    const dailyCharge = bed?.dailyCharge || 0;
    const totalBedCharge = dailyCharge * days;
    const finalChargeSummary = {
      days,
      dailyCharge,
      total: totalBedCharge,
    };

    // If Billing module is enabled, handle invoice creation & unpaid check
    const isBillingEnabled = process.env.ENABLE_BILLING === 'true';
    if (isBillingEnabled) {
      if (admission.dischargeInvoiceId) {
        const inv = await Invoice.findById(admission.dischargeInvoiceId);
        if (inv && inv.balanceDue > 0 && !dischargeOverrideReason) {
          return res.status(400).json({
            success: false,
            message: `Unpaid balance of ₹${(inv.balanceDue / 100).toFixed(2)}. Provide dischargeOverrideReason to override.`,
          });
        }
      } else if (dailyCharge > 0) {
        const invoiceNumber = await getNextInvoiceNumber();
        const lineItem = {
          description: `Bed charges: ${days} day(s) @ ₹${(dailyCharge / 100).toFixed(2)}/day`,
          quantity: days,
          unitPrice: dailyCharge,
          discount: 0,
          amount: totalBedCharge,
        };
        const invoice = await Invoice.create({
          invoiceNumber,
          patientId: admission.patientId,
          admissionId: admission._id,
          lineItems: [lineItem],
          subtotal: totalBedCharge,
          discountTotal: 0,
          netTotal: totalBedCharge,
          amountPaid: 0,
          balanceDue: totalBedCharge,
          status: 'Issued',
          createdBy: req.user._id,
          issuedAt: new Date(),
        });
        admission.dischargeInvoiceId = invoice._id;
      }
    }

    // Release bed to Cleaning
    await Bed.findOneAndUpdate(
      { _id: admission.bedId, status: 'Occupied' },
      { status: 'Cleaning', currentAdmissionId: null }
    );

    // Record BedEvent
    await recordBedEvent({
      bedId: admission.bedId,
      from: 'Occupied',
      to: 'Cleaning',
      action: 'discharge',
      user: req.user,
      reason: `Patient discharged: ${admission.admissionNumber}`,
      refs: { admissionId: admission._id },
    });

    admission.status = 'Discharged';
    admission.dischargedAt = dischargedAt;
    admission.dischargeSummary = dischargeSummary;
    admission.finalChargeSummary = finalChargeSummary;
    admission.dischargedBy = req.user._id;
    if (dischargeOverrideReason) {
      admission.dischargeOverrideReason = dischargeOverrideReason;
    }
    await admission.save();

    res.json({ success: true, data: admission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Doctor Round Notes ────────────────────────────────────────────────────

/**
 * Add doctor round note (Doctor only; Admin is read-only)
 */
export const addRoundNote = async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Only doctors can add round notes. Admins and nurses are read-only.',
      });
    }

    const { admissionId, note, vitals } = req.body;
    if (!admissionId || !note?.trim()) {
      return res.status(400).json({ success: false, message: 'admissionId and note are required' });
    }

    const admission = await Admission.findById(admissionId);
    if (!admission || admission.status !== 'Admitted') {
      return res.status(404).json({ success: false, message: 'Active admission not found' });
    }

    const roundNote = await RoundNote.create({
      admissionId,
      type: 'DoctorRound',
      note: note.trim(),
      vitals: vitals || {},
      by: req.user._id,
      at: new Date(),
    });

    const populated = await RoundNote.findById(roundNote._id).populate('by', 'name role');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRoundNotes = async (req, res) => {
  try {
    if (!['doctor', 'admin', 'nurse'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const notes = await RoundNote.find({ admissionId: req.params.admissionId })
      .populate('by', 'name role')
      .sort({ at: 1 });
    res.json({ success: true, data: notes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
