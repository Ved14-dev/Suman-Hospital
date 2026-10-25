import express from 'express';
import { body, validationResult } from 'express-validator';
import {
  availability,
  createAppointment,
  createWalkInAppointment,
  checkInAppointment,
  getLiveQueue,
  callNextPatient,
  startConsultation,
  completeConsultation,
  rescheduleAppointment,
  cancelAppointment,
  markNoShow,
  getMyAppointments,
  listAppointments,
  updateStatus,
  getNoShowCancellationReport,
} from '../controllers/appointmentController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array(),
    });
  }
  next();
};

// Check doctor availability
router.get('/availability/:id', availability);

// Appointments for logged in user (patient / doctor)
router.get('/me', requireAuth, getMyAppointments);

// Live OPD Queue for today
router.get(
  '/queue',
  requireAuth,
  requireRole('admin', 'receptionist', 'doctor', 'nurse'),
  getLiveQueue
);

// Cancellation & No-Show Report (Admin)
router.get(
  '/reports/no-shows-cancellations',
  requireAuth,
  requireRole('admin'),
  getNoShowCancellationReport
);

// List all appointments with pagination & filters
router.get(
  '/',
  requireAuth,
  requireRole('admin', 'receptionist', 'doctor', 'nurse'),
  listAppointments
);

// Book online appointment
router.post(
  '/',
  requireAuth,
  requirePermission('appointment:book'),
  [
    body('doctorId').notEmpty().withMessage('Doctor ID is required'),
    body('departmentId').notEmpty().withMessage('Department ID is required'),
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Valid date in YYYY-MM-DD format is required'),
    body('timeSlot').notEmpty().withMessage('Time slot is required'),
  ],
  handleValidationErrors,
  createAppointment
);

// Walk-in registration (Receptionist / Admin)
router.post(
  '/walkin',
  requireAuth,
  requirePermission('appointment:walkin'),
  [
    body('doctorId').notEmpty().withMessage('Doctor ID is required'),
    body('departmentId').notEmpty().withMessage('Department ID is required'),
  ],
  handleValidationErrors,
  createWalkInAppointment
);

// Check-in on day of visit (Receptionist / Admin)
router.post(
  '/:id/checkin',
  requireAuth,
  requirePermission('appointment:checkin'),
  checkInAppointment
);

// Queue actions (Doctor)
router.post(
  '/:id/call-next',
  requireAuth,
  requirePermission('opd:call_next'),
  callNextPatient
);

router.post(
  '/:id/start-consultation',
  requireAuth,
  requirePermission('opd:start_consultation'),
  startConsultation
);

router.post(
  '/:id/complete',
  requireAuth,
  requirePermission('opd:complete_consultation'),
  completeConsultation
);

// Reschedule
router.post(
  '/:id/reschedule',
  requireAuth,
  requirePermission('appointment:reschedule'),
  [
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Valid date in YYYY-MM-DD format is required'),
    body('timeSlot').notEmpty().withMessage('Time slot is required'),
  ],
  handleValidationErrors,
  rescheduleAppointment
);

// Cancel (requires reason)
router.post(
  '/:id/cancel',
  requireAuth,
  requirePermission('appointment:cancel'),
  [body('reason').trim().notEmpty().withMessage('A cancellation reason is required')],
  handleValidationErrors,
  cancelAppointment
);

// Mark No-show
router.post(
  '/:id/no-show',
  requireAuth,
  requirePermission('appointment:noshow'),
  markNoShow
);

// General status update
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('admin', 'doctor', 'receptionist'),
  updateStatus
);

export default router;
