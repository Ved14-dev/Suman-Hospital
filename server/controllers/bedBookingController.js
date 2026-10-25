import BedBooking from '../models/BedBooking.js';
import Bed from '../models/Bed.js';
import Ward from '../models/Ward.js';
import Admission from '../models/Admission.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import { getNextBookingNumber } from '../utils/counter.js';
import { getTodayIST, isValidDateString } from '../utils/dateUtils.js';
import { recordBedEvent } from './ipdController.js';
import { releaseExpiredHolds } from './ipdController.js';

export const VALID_BOOKING_TRANSITIONS = {
  Requested: ['Approved', 'Rejected', 'Cancelled'],
  Approved: ['Admitted', 'Cancelled', 'Expired'],
  Admitted: [],
  Rejected: [],
  Cancelled: [],
  Expired: [],
};

/**
 * Calculates end of day for today in IST
 */
const getEndOfDayIST = () => {
  const [year, month, day] = getTodayIST().split('-').map(Number);
  // 23:59:59.999 IST = 18:29:59.999 UTC
  return new Date(Date.UTC(year, month - 1, day, 18, 29, 59, 999));
};

/**
 * Calculates hold expiration time: default 6 hours from now, capped at end of day IST
 */
export const calculateHoldUntil = (hours = 6) => {
  const now = new Date();
  const target = new Date(now.getTime() + hours * 60 * 60 * 1000);
  const endOfDay = getEndOfDayIST();
  return target < endOfDay ? target : endOfDay;
};

/**
 * Creates a bed booking request
 */
export const createBedBooking = async (req, res) => {
  try {
    await releaseExpiredHolds();

    const { wardType, expectedDate, doctorId, reason } = req.body;
    let { patientId } = req.body;
    const role = req.user.role;

    if (!['patient', 'receptionist', 'doctor', 'admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Your role cannot create bed booking requests' });
    }

    if (!wardType || !expectedDate) {
      return res.status(400).json({ success: false, message: 'wardType and expectedDate are required' });
    }

    if (!['General', 'Pediatric', 'Maternity/Gynae', 'Private'].includes(wardType)) {
      return res.status(400).json({ success: false, message: 'Invalid wardType' });
    }

    if (!isValidDateString(expectedDate)) {
      return res.status(400).json({ success: false, message: 'expectedDate must be YYYY-MM-DD' });
    }

    const today = getTodayIST();
    // Expected date must be between today and today + 7 days
    const [y, m, d] = today.split('-').map(Number);
    const maxDateObj = new Date(Date.UTC(y, m - 1, d + 7, 12, 0, 0));
    const maxDateStr = maxDateObj.toISOString().slice(0, 10);

    if (expectedDate < today || expectedDate > maxDateStr) {
      return res.status(400).json({
        success: false,
        message: `expectedDate must be between today (${today}) and ${maxDateStr}`,
      });
    }

    // Role-specific patientId resolution and verification
    if (role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient profile not linked to user' });
      }
      patientId = patient._id;
    } else if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required for staff booking' });
    } else {
      const patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }
    }

    // 1. Check if patient currently has an active admission
    const activeAdmission = await Admission.findOne({ patientId, status: 'Admitted' });
    if (activeAdmission) {
      return res.status(409).json({
        success: false,
        message: 'Patient currently has an active admission and cannot create a bed booking',
      });
    }

    // 2. Check if patient already has an active booking (Requested or Approved)
    const existingActive = await BedBooking.findOne({
      patientId,
      status: { $in: ['Requested', 'Approved'] },
    });
    if (existingActive) {
      return res.status(409).json({
        success: false,
        message: `Patient already has an active bed booking (${existingActive.bookingNumber}) in status '${existingActive.status}'`,
      });
    }

    const bookingNumber = await getNextBookingNumber();
    const booking = await BedBooking.create({
      bookingNumber,
      patientId,
      requestedByRole: role,
      requestedByUserId: req.user._id,
      wardType,
      expectedDate,
      doctorId: doctorId || undefined,
      reason,
      status: 'Requested',
    });

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * List bed bookings with filtering and pagination
 */
export const listBedBookings = async (req, res) => {
  try {
    await releaseExpiredHolds();

    const role = req.user.role;
    const q = {};

    if (role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) {
        return res.json({ success: true, data: [], total: 0 });
      }
      q.patientId = patient._id;
    } else if (role === 'doctor') {
      const doc = await Doctor.findOne({ userId: req.user._id });
      // Doctors can see bookings requested by themselves or where doctorId is them
      q.$or = [{ requestedByUserId: req.user._id }, { doctorId: doc?._id }];
    }

    if (req.query.status) q.status = req.query.status;
    if (req.query.expectedDate) q.expectedDate = req.query.expectedDate;
    if (req.query.wardType) q.wardType = req.query.wardType;
    if (req.query.patientId && role !== 'patient') q.patientId = req.query.patientId;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      BedBooking.find(q)
        .populate('patientId', 'uhid name phone gender dob approxAge')
        .populate('doctorId', 'name specialization')
        .populate('bedId', 'bedNumber wardId dailyCharge')
        .populate('decisionBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BedBooking.countDocuments(q),
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Approve a bed booking (Receptionist or Admin only)
 */
export const approveBedBooking = async (req, res) => {
  try {
    await releaseExpiredHolds();

    if (!['receptionist', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only receptionist or admin can approve bed bookings' });
    }

    const { id } = req.params;
    const { bedId, reason } = req.body;
    const booking = await BedBooking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== 'Requested') {
      return res.status(409).json({
        success: false,
        message: `Cannot approve booking in status '${booking.status}'. Only 'Requested' bookings can be approved.`,
      });
    }

    const today = getTodayIST();

    if (booking.expectedDate === today) {
      // Same-day approval MUST assign and hold an Available bed of matching ward type
      if (!bedId) {
        return res.status(400).json({
          success: false,
          message: 'Same-day booking approval requires selecting an available bed',
        });
      }

      const bed = await Bed.findById(bedId).populate('wardId');
      if (!bed || !bed.wardId || bed.wardId.type !== booking.wardType) {
        return res.status(400).json({
          success: false,
          message: `Selected bed must belong to a ${booking.wardType} ward`,
        });
      }

      const holdUntil = calculateHoldUntil(6);

      // Atomically claim bed
      const claimedBed = await Bed.findOneAndUpdate(
        { _id: bedId, status: 'Available' },
        { status: 'Reserved', heldForBookingId: booking._id, holdUntil },
        { new: true }
      );

      if (!claimedBed) {
        return res.status(409).json({
          success: false,
          message: 'Selected bed is no longer available. Please choose another bed.',
        });
      }

      booking.status = 'Approved';
      booking.bedId = bedId;
      booking.holdUntil = holdUntil;
      booking.decisionBy = req.user._id;
      booking.decisionAt = new Date();
      booking.decisionReason = reason || 'Approved with same-day bed hold';
      await booking.save();

      await recordBedEvent({
        bedId,
        from: 'Available',
        to: 'Reserved',
        action: 'hold',
        user: req.user,
        reason: `Bed reserved for booking ${booking.bookingNumber}`,
        refs: { bookingId: booking._id },
      });

      return res.json({ success: true, data: booking });
    } else {
      // Future date approval: no bed held yet.
      // Approval allowed only while approved bookings for that ward type & date < non-Maintenance beds
      const wards = await Ward.find({ type: booking.wardType, isActive: true }).select('_id');
      const wardIds = wards.map((w) => w._id);

      const nonMaintenanceBeds = await Bed.countDocuments({
        wardId: { $in: wardIds },
        status: { $ne: 'Maintenance' },
        isActive: true,
      });

      const approvedCount = await BedBooking.countDocuments({
        wardType: booking.wardType,
        expectedDate: booking.expectedDate,
        status: 'Approved',
      });

      if (approvedCount >= nonMaintenanceBeds) {
        return res.status(409).json({
          success: false,
          message: `Capacity exceeded: All ${nonMaintenanceBeds} beds of type '${booking.wardType}' are booked for ${booking.expectedDate}`,
        });
      }

      booking.status = 'Approved';
      booking.decisionBy = req.user._id;
      booking.decisionAt = new Date();
      booking.decisionReason = reason || 'Approved for future date';
      await booking.save();

      return res.json({ success: true, data: booking });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Reject a bed booking (Receptionist or Admin only)
 */
export const rejectBedBooking = async (req, res) => {
  try {
    await releaseExpiredHolds();

    if (!['receptionist', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only receptionist or admin can reject bed bookings' });
    }

    const { id } = req.params;
    const { reason } = req.body;
    const booking = await BedBooking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status !== 'Requested') {
      return res.status(409).json({
        success: false,
        message: `Cannot reject booking in status '${booking.status}'`,
      });
    }

    booking.status = 'Rejected';
    booking.decisionBy = req.user._id;
    booking.decisionAt = new Date();
    booking.decisionReason = reason || 'Rejected by hospital staff';
    await booking.save();

    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Cancel a bed booking
 * Allowed:
 *  - Patient: own booking in Requested or Approved
 *  - Receptionist: any Requested or Approved
 *  - Doctor: ones they created
 *  - Admin: any
 */
export const cancelBedBooking = async (req, res) => {
  try {
    await releaseExpiredHolds();

    const { id } = req.params;
    const { reason } = req.body;
    const role = req.user.role;
    const booking = await BedBooking.findById(id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Role checks
    if (role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient || !booking.patientId.equals(patient._id)) {
        return res.status(403).json({ success: false, message: 'Cannot cancel another patient’s booking' });
      }
    } else if (role === 'doctor') {
      if (!booking.requestedByUserId.equals(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Doctors can only cancel bookings they created' });
      }
    } else if (!['receptionist', 'admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Your role cannot cancel bookings' });
    }

    if (!['Requested', 'Approved'].includes(booking.status)) {
      return res.status(409).json({
        success: false,
        message: `Cannot cancel booking in status '${booking.status}'. Only Requested or Approved bookings can be cancelled.`,
      });
    }

    // If bed was held, atomically release it
    if (booking.bedId) {
      const releasedBed = await Bed.findOneAndUpdate(
        { _id: booking.bedId, status: 'Reserved', heldForBookingId: booking._id },
        { status: 'Available', heldForBookingId: null, holdUntil: null },
        { new: true }
      );

      if (releasedBed) {
        await recordBedEvent({
          bedId: booking.bedId,
          from: 'Reserved',
          to: 'Available',
          action: 'release',
          user: req.user,
          reason: `Released due to booking cancellation: ${reason || 'Cancelled'}`,
          refs: { bookingId: booking._id },
        });
      }
    }

    booking.status = 'Cancelled';
    booking.decisionReason = reason || 'Cancelled by user';
    await booking.save();

    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
