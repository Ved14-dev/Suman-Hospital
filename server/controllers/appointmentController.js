import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Department from '../models/Department.js';
import Patient from '../models/Patient.js';
import { getOpenSlots } from '../utils/availability.js';
import { getNextDailyToken, getNextUHID } from '../utils/counter.js';
import {
  getTodayIST,
  isValidDateString,
  isPastDate,
  isSlotTimePassed,
  getCurrentTimeStringIST,
} from '../utils/dateUtils.js';

// Helper to populate appointment details consistently
const appointmentPopulate = (query) =>
  query
    .populate('doctorId', 'name specialization photo roomNumber isHOD')
    .populate('departmentId', 'name slug')
    .populate('patientId', 'uhid name phone gender approxAge dob email bloodGroup')
    .populate('rescheduledFromId', 'date timeSlot')
    .populate('rescheduledToId', 'date timeSlot')
    .sort({ date: -1, timeSlot: 1 });

/**
 * Calculate open slots for a doctor on a specific date
 * GET /api/appointments/availability/:id?date=YYYY-MM-DD
 */
export const availability = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!isValidDateString(date)) {
      return res.status(400).json({
        success: false,
        message: 'A valid date in YYYY-MM-DD format is required',
        slots: [],
      });
    }

    const doctor = await Doctor.findById(id);
    if (!doctor || !doctor.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found or inactive',
        slots: [],
      });
    }

    const slots = await getOpenSlots(doctor, date);
    res.json({
      success: true,
      date,
      slots,
      message: slots.length === 0 ? 'No slots available for this date' : '',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to calculate availability',
      error: error.message,
    });
  }
};

/**
 * Create online booking appointment
 * POST /api/appointments
 */
export const createAppointment = async (req, res) => {
  try {
    const { doctorId, departmentId, date, timeSlot, reasonForVisit, patientId } = req.body;

    if (!isValidDateString(date) || isPastDate(date)) {
      return res.status(400).json({
        success: false,
        message: 'A valid future or today date in YYYY-MM-DD format is required',
      });
    }

    if (!timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Time slot is required',
      });
    }

    // Determine target patient
    let resolvedPatientId = patientId;
    if (req.user.role === 'patient') {
      let patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) {
        // Auto-link/create patient record
        const uhid = await getNextUHID();
        patient = await Patient.create({
          uhid,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone || 'N/A',
          userId: req.user._id,
        });
      }
      resolvedPatientId = patient._id;
    } else {
      if (!resolvedPatientId) {
        return res.status(400).json({
          success: false,
          message: 'Patient ID is required for staff booking',
        });
      }
    }

    const [patient, doctor, department] = await Promise.all([
      Patient.findById(resolvedPatientId),
      Doctor.findOne({ _id: doctorId, isActive: true }),
      Department.findById(departmentId),
    ]);

    if (!patient || !doctor || !department) {
      return res.status(400).json({
        success: false,
        message: 'Valid patient, active doctor, and department are required',
      });
    }

    // Verify slot is available
    const openSlots = await getOpenSlots(doctor, date);
    if (!openSlots.includes(timeSlot)) {
      return res.status(409).json({
        success: false,
        message: 'That slot is no longer available. Please select another slot.',
      });
    }

    // Explicit check for existing active booking to avoid race conditions
    const existingBooking = await Appointment.findOne({
      doctorId,
      date,
      timeSlot,
      source: 'online',
      status: { $in: ['Pending', 'Confirmed'] },
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message: 'Slot was just booked by another patient. Please choose another time.',
      });
    }

    const initialStatus = req.user.role === 'patient' ? 'Pending' : 'Confirmed';

    const appointment = await Appointment.create({
      patientId: patient._id,
      doctorId,
      departmentId,
      date,
      timeSlot,
      reasonForVisit: reasonForVisit ? reasonForVisit.trim() : '',
      source: 'online',
      status: initialStatus,
      queueStatus: 'Not Arrived',
      bookedBy: req.user._id,
    });

    const populated = await appointmentPopulate(Appointment.findById(appointment._id));

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: populated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'That slot was just booked by another user.',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Unable to create appointment',
      error: error.message,
    });
  }
};

/**
 * Register a walk-in patient visit and issue daily token
 * POST /api/appointments/walkin
 */
export const createWalkInAppointment = async (req, res) => {
  try {
    const { doctorId, departmentId, patientId, reasonForVisit, newPatientData } = req.body;

    let targetPatientId = patientId;

    // Support inline patient registration for walk-in
    if (!targetPatientId && newPatientData) {
      if (!newPatientData.name || !newPatientData.phone) {
        return res.status(400).json({
          success: false,
          message: 'Name and phone are required for inline patient registration',
        });
      }
      const uhid = await getNextUHID();
      const createdPatient = await Patient.create({
        ...newPatientData,
        uhid,
        registeredBy: req.user._id,
        registeredAt: new Date(),
      });
      targetPatientId = createdPatient._id;
    }

    if (!targetPatientId) {
      return res.status(400).json({
        success: false,
        message: 'Existing patient ID or inline newPatientData is required',
      });
    }

    const [patient, doctor, department] = await Promise.all([
      Patient.findById(targetPatientId),
      Doctor.findOne({ _id: doctorId, isActive: true }),
      Department.findById(departmentId),
    ]);

    if (!patient || !doctor || !department) {
      return res.status(400).json({
        success: false,
        message: 'Valid patient, doctor, and department are required',
      });
    }

    const todayIST = getTodayIST();
    // Issue daily token number atomically
    const tokenNumber = await getNextDailyToken(doctor._id, todayIST);

    const appointment = await Appointment.create({
      patientId: patient._id,
      doctorId: doctor._id,
      departmentId: department._id,
      date: todayIST,
      timeSlot: 'Walk-in',
      source: 'walk-in',
      tokenNumber,
      status: 'Confirmed',
      queueStatus: 'Waiting',
      checkedInAt: new Date(),
      reasonForVisit: reasonForVisit ? reasonForVisit.trim() : 'Walk-in Consultation',
      bookedBy: req.user._id,
    });

    const populated = await appointmentPopulate(Appointment.findById(appointment._id));

    res.status(201).json({
      success: true,
      message: `Walk-in registered. Token #${tokenNumber} issued.`,
      data: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create walk-in appointment',
      error: error.message,
    });
  }
};

/**
 * Check-in online appointment on day of visit and issue daily token
 * POST /api/appointments/:id/checkin
 */
export const checkInAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const todayIST = getTodayIST();
    if (appointment.date !== todayIST) {
      return res.status(400).json({
        success: false,
        message: `Check-in is only allowed on the scheduled date (${appointment.date}). Today is ${todayIST}.`,
      });
    }

    if (['Cancelled', 'Rescheduled', 'Completed'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot check in an appointment with status "${appointment.status}"`,
      });
    }

    // If token already assigned, do not issue duplicate
    if (!appointment.tokenNumber) {
      const tokenNumber = await getNextDailyToken(appointment.doctorId, todayIST);
      appointment.tokenNumber = tokenNumber;
    }

    appointment.status = 'Confirmed';
    appointment.queueStatus = 'Waiting';
    appointment.checkedInAt = new Date();
    await appointment.save();

    const populated = await appointmentPopulate(Appointment.findById(appointment._id));

    res.json({
      success: true,
      message: `Checked in successfully. Token #${appointment.tokenNumber} assigned.`,
      data: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check in appointment',
      error: error.message,
    });
  }
};

/**
 * Live OPD queue for today
 * GET /api/appointments/queue?doctorId=...&date=...
 */
export const getLiveQueue = async (req, res) => {
  try {
    const todayIST = getTodayIST();
    const targetDate = req.query.date || todayIST;

    const query = {
      date: targetDate,
      queueStatus: { $in: ['Waiting', 'In Consultation', 'Completed', 'No-show', 'Cancelled'] },
    };

    // If doctor role, restrict to own doctorId
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) {
        return res.status(403).json({ success: false, message: 'Doctor profile not found' });
      }
      query.doctorId = doctor._id;
    } else if (req.query.doctorId) {
      query.doctorId = req.query.doctorId;
    }

    const queueList = await Appointment.find(query)
      .populate('patientId', 'uhid name phone gender approxAge dob')
      .populate('doctorId', 'name specialization roomNumber')
      .populate('departmentId', 'name')
      .sort({ tokenNumber: 1, checkedInAt: 1 });

    const now = new Date();

    // Compute wait times and summary counts
    let waitingCount = 0;
    let inConsultationCount = 0;
    let completedCount = 0;

    const items = queueList.map((item) => {
      const obj = item.toObject();
      if (item.queueStatus === 'Waiting') waitingCount++;
      if (item.queueStatus === 'In Consultation') inConsultationCount++;
      if (item.queueStatus === 'Completed') completedCount++;

      // Wait time in minutes
      if (item.checkedInAt) {
        const end = item.consultationStartedAt || (item.queueStatus === 'Waiting' ? now : item.checkedInAt);
        const waitMinutes = Math.max(0, Math.round((new Date(end) - new Date(item.checkedInAt)) / 60000));
        obj.waitTimeMinutes = waitMinutes;
      } else {
        obj.waitTimeMinutes = 0;
      }

      return obj;
    });

    res.json({
      success: true,
      data: {
        date: targetDate,
        summary: {
          total: queueList.length,
          waiting: waitingCount,
          inConsultation: inConsultationCount,
          completed: completedCount,
        },
        queue: items,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve OPD queue',
      error: error.message,
    });
  }
};

/**
 * Doctor calls patient into consultation room
 * POST /api/appointments/:id/call-next
 */
export const callNextPatient = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not your patient' });
      }
    }

    appointment.calledAt = new Date();
    await appointment.save();

    res.json({
      success: true,
      message: `Called token #${appointment.tokenNumber}`,
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error calling patient', error: error.message });
  }
};

/**
 * Doctor starts consultation
 * POST /api/appointments/:id/start-consultation
 */
export const startConsultation = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not your patient' });
      }
    }

    appointment.queueStatus = 'In Consultation';
    appointment.consultationStartedAt = new Date();
    await appointment.save();

    res.json({
      success: true,
      message: `Consultation started for token #${appointment.tokenNumber}`,
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error starting consultation',
      error: error.message,
    });
  }
};

/**
 * Doctor completes consultation
 * POST /api/appointments/:id/complete
 */
export const completeConsultation = async (req, res) => {
  try {
    const { consultationNotes } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not your patient' });
      }
    }

    appointment.queueStatus = 'Completed';
    appointment.status = 'Completed';
    appointment.consultationEndedAt = new Date();
    if (consultationNotes !== undefined) {
      appointment.consultationNotes = consultationNotes.trim();
    }
    await appointment.save();

    res.json({
      success: true,
      message: `Consultation completed for token #${appointment.tokenNumber}`,
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error completing consultation',
      error: error.message,
    });
  }
};

/**
 * Reschedule appointment: creates a new appointment record and links to original
 * POST /api/appointments/:id/reschedule
 */
export const rescheduleAppointment = async (req, res) => {
  try {
    const { date, timeSlot, reason } = req.body;
    const original = await Appointment.findById(req.params.id);
    if (!original) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (['Cancelled', 'Completed'].includes(original.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule an appointment that is already ${original.status}`,
      });
    }

    // Role check
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient || original.patientId.toString() !== patient._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized for this appointment' });
      }
    }

    if (!isValidDateString(date) || isPastDate(date)) {
      return res.status(400).json({
        success: false,
        message: 'A valid future or today date in YYYY-MM-DD format is required',
      });
    }

    const doctor = await Doctor.findOne({ _id: original.doctorId, isActive: true });
    if (!doctor) {
      return res.status(400).json({ success: false, message: 'Doctor is not available' });
    }

    // Conflict check on new slot
    const openSlots = await getOpenSlots(doctor, date);
    if (!openSlots.includes(timeSlot)) {
      return res.status(409).json({
        success: false,
        message: 'That slot is not available for rescheduling. Please select another slot.',
      });
    }

    // Create new appointment record
    const newAppointment = await Appointment.create({
      patientId: original.patientId,
      doctorId: original.doctorId,
      departmentId: original.departmentId,
      date,
      timeSlot,
      source: 'online',
      status: req.user.role === 'patient' ? 'Pending' : 'Confirmed',
      queueStatus: 'Not Arrived',
      reasonForVisit: original.reasonForVisit,
      rescheduledFromId: original._id,
      bookedBy: req.user._id,
    });

    // Mark original as Rescheduled
    original.status = 'Rescheduled';
    original.queueStatus = 'Cancelled';
    original.rescheduledToId = newAppointment._id;
    if (reason) original.cancellationReason = `Rescheduled: ${reason.trim()}`;
    await original.save();

    const populated = await appointmentPopulate(Appointment.findById(newAppointment._id));

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: populated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'The target slot was just booked by another patient.',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule appointment',
      error: error.message,
    });
  }
};

/**
 * Cancel appointment (with required reason)
 * POST /api/appointments/:id/cancel
 */
export const cancelAppointment = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A cancellation reason is required.',
      });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (['Cancelled', 'Completed'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Appointment is already ${appointment.status}`,
      });
    }

    // Role check
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient || appointment.patientId.toString() !== patient._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to cancel this appointment' });
      }
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to cancel this appointment' });
      }
    }

    appointment.status = 'Cancelled';
    appointment.queueStatus = 'Cancelled';
    appointment.cancellationReason = reason.trim();
    await appointment.save();

    // Increment patient cancellation counter atomically
    await Patient.findByIdAndUpdate(appointment.patientId, {
      $inc: { cancellationCount: 1 },
    });

    res.json({
      success: true,
      message: 'Appointment cancelled successfully. Slot is released.',
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment',
      error: error.message,
    });
  }
};

/**
 * Mark appointment as No-show
 * POST /api/appointments/:id/no-show
 */
export const markNoShow = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (['Cancelled', 'Completed'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark appointment as No-show when status is ${appointment.status}`,
      });
    }

    // Verify role (admin, receptionist, or assigned doctor)
    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor || appointment.doctorId.toString() !== doctor._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized for this appointment' });
      }
    }

    appointment.status = 'No-show';
    appointment.queueStatus = 'No-show';
    await appointment.save();

    // Increment patient no-show counter atomically
    await Patient.findByIdAndUpdate(appointment.patientId, {
      $inc: { noShowCount: 1 },
    });

    res.json({
      success: true,
      message: 'Appointment marked as No-show',
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark No-show',
      error: error.message,
    });
  }
};

/**
 * Get appointments for logged in user (patient or doctor)
 * GET /api/appointments/me
 */
export const getMyAppointments = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) return res.json({ success: true, data: [] });
      filter.patientId = patient._id;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) return res.json({ success: true, data: [] });
      filter.doctorId = doctor._id;
    }

    const appointments = await appointmentPopulate(Appointment.find(filter));
    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to fetch appointments',
      error: error.message,
    });
  }
};

/**
 * List all appointments with filtering, pagination and sorting
 * GET /api/appointments
 */
export const listAppointments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.date) query.date = req.query.date;
    if (req.query.doctorId) query.doctorId = req.query.doctorId;
    if (req.query.departmentId) query.departmentId = req.query.departmentId;

    const [total, appointments] = await Promise.all([
      Appointment.countDocuments(query),
      appointmentPopulate(Appointment.find(query).skip(skip).limit(limit)),
    ]);

    res.json({
      success: true,
      data: {
        appointments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to list appointments',
      error: error.message,
    });
  }
};

/**
 * Update general appointment status (Admin / Receptionist / Doctor)
 * PATCH /api/appointments/:id/status
 */
export const updateStatus = async (req, res) => {
  try {
    const allowed = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled', 'No-show'];
    const { status, consultationNotes } = req.body;

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid appointment status' });
    }

    const existing = await Appointment.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor || existing.doctorId.toString() !== doctor._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not your appointment' });
      }
    }

    existing.status = status;
    if (status === 'Completed') existing.queueStatus = 'Completed';
    if (status === 'Cancelled') existing.queueStatus = 'Cancelled';
    if (status === 'No-show') existing.queueStatus = 'No-show';
    if (consultationNotes !== undefined) existing.consultationNotes = consultationNotes;

    await existing.save();

    const populated = await appointmentPopulate(Appointment.findById(existing._id));
    res.json({ success: true, message: 'Status updated', data: populated });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment status',
      error: error.message,
    });
  }
};

/**
 * Admin cancellation and no-show reports
 * GET /api/appointments/reports/no-shows-cancellations
 */
export const getNoShowCancellationReport = async (req, res) => {
  try {
    const { startDate, endDate, doctorId } = req.query;
    const query = {
      status: { $in: ['Cancelled', 'No-show'] },
    };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    if (doctorId) {
      query.doctorId = doctorId;
    }

    const records = await appointmentPopulate(Appointment.find(query));

    const totalNoShows = records.filter((r) => r.status === 'No-show').length;
    const totalCancellations = records.filter((r) => r.status === 'Cancelled').length;

    res.json({
      success: true,
      data: {
        summary: {
          total: records.length,
          noShows: totalNoShows,
          cancellations: totalCancellations,
        },
        records,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to generate report',
      error: error.message,
    });
  }
};
