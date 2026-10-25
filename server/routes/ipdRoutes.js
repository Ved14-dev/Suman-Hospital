import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  getWardAvailability,
  listWards,
  createWard,
  updateWard,
  listBeds,
  getOccupancySummary,
  createBed,
  updateBed,
  updateBedStatus,
  getBedEvents,
  listAdmissions,
  getMyAdmission,
  getAdmission,
  admitPatient,
  transferBed,
  dischargePatient,
  addRoundNote,
  getRoundNotes,
} from '../controllers/ipdController.js';

import {
  createBedBooking,
  listBedBookings,
  approveBedBooking,
  rejectBedBooking,
  cancelBedBooking,
} from '../controllers/bedBookingController.js';

import {
  addNursingRecord,
  getAdmissionNursingRecords,
  getPatientNursingRecords,
  getDoctorNeedsReview,
  acknowledgeNursingRecord,
  rejectNursingRecordMutation,
} from '../controllers/nursingController.js';

const router = Router();
router.use(requireAuth);

// ─── Ward Availability (All Authenticated Roles) ──────────────────────────
router.get('/availability', getWardAvailability);

// ─── Wards ────────────────────────────────────────────────────────────────
router.get('/wards', requireRole('admin', 'doctor', 'receptionist', 'nurse'), listWards);
router.post('/wards', requireRole('admin'), createWard);
router.patch('/wards/:id', requireRole('admin'), updateWard);

// ─── Beds & Bed Board ─────────────────────────────────────────────────────
router.get('/beds', requireRole('admin', 'doctor', 'receptionist', 'nurse'), listBeds);
router.get('/beds/occupancy', requireRole('admin', 'doctor', 'receptionist', 'nurse'), getOccupancySummary);
router.post('/beds', requireRole('admin'), createBed);
router.patch('/beds/:id', requireRole('admin'), updateBed);
router.patch('/beds/:id/status', requireRole('admin', 'nurse', 'receptionist'), updateBedStatus);
router.get('/beds/:id/events', requireRole('admin'), getBedEvents);

// ─── Bed Bookings ─────────────────────────────────────────────────────────
router.get('/bookings', requireRole('admin', 'doctor', 'receptionist', 'patient'), listBedBookings);
router.post('/bookings', requireRole('admin', 'doctor', 'receptionist', 'patient'), createBedBooking);
router.post('/bookings/:id/approve', requireRole('admin', 'receptionist'), approveBedBooking);
router.post('/bookings/:id/reject', requireRole('admin', 'receptionist'), rejectBedBooking);
router.post('/bookings/:id/cancel', requireRole('admin', 'doctor', 'receptionist', 'patient'), cancelBedBooking);

// ─── Admissions ───────────────────────────────────────────────────────────
router.get('/admissions/my', requireRole('patient'), getMyAdmission);
router.get('/admissions', requireRole('admin', 'doctor', 'receptionist', 'nurse', 'patient'), listAdmissions);
router.get('/admissions/:id', requireRole('admin', 'doctor', 'receptionist', 'nurse', 'patient'), getAdmission);
router.post('/admissions', requireRole('admin', 'doctor', 'receptionist'), admitPatient);
router.post('/admissions/:id/transfer', requireRole('admin', 'doctor', 'nurse', 'receptionist'), transferBed);
router.post('/admissions/:id/discharge', requireRole('admin', 'doctor'), dischargePatient);

// ─── Doctor Round Notes ───────────────────────────────────────────────────
router.post('/round-notes', requireRole('doctor'), addRoundNote);
router.get('/admissions/:admissionId/notes', requireRole('admin', 'doctor', 'nurse'), getRoundNotes);

// ─── Nursing Clinical Records (Append-Only) ───────────────────────────────
router.post('/nursing-records', requireRole('nurse'), addNursingRecord);
router.get('/nursing-records/admission/:admissionId', requireRole('admin', 'doctor', 'nurse'), getAdmissionNursingRecords);
router.get('/nursing-records/patient/:patientId', requireRole('admin', 'doctor', 'nurse'), getPatientNursingRecords);
router.get('/nursing-records/doctor/needs-review', requireRole('admin', 'doctor'), getDoctorNeedsReview);
router.post('/nursing-records/:id/acknowledge', requireRole('admin', 'doctor'), acknowledgeNursingRecord);

// Mutation rejections (strictly append-only)
router.put('/nursing-records/:id', rejectNursingRecordMutation);
router.patch('/nursing-records/:id', rejectNursingRecordMutation);
router.delete('/nursing-records/:id', rejectNursingRecordMutation);

export default router;
