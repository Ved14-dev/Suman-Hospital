import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createVisit, getVisit, updateVisit, finalizeVisit, addAmendment, getPatientVisits,
  createPrescription, getPrescription, getVisitPrescriptions, getPatientPrescriptions,
  getClinicalProfile, updateClinicalProfile,
  searchMedicines,
  createCertificate, getCertificate, getPatientCertificates,
} from '../controllers/emrController.js';

const router = Router();

// All EMR routes require authentication
router.use(requireAuth);

// ─── Visits ──────────────────────────────────────────────────────────────────
router.post('/visits', requireRole('admin', 'doctor'), createVisit);
router.get('/visits/:id', requireRole('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'patient'), getVisit);
router.patch('/visits/:id', requireRole('admin', 'doctor', 'nurse'), updateVisit);
router.post('/visits/:id/finalize', requireRole('doctor', 'admin'), finalizeVisit);
router.post('/visits/:id/amend', requireRole('doctor', 'admin'), addAmendment);
router.get('/patients/:patientId/visits', requireRole('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'patient'), getPatientVisits);

// ─── Prescriptions ────────────────────────────────────────────────────────────
router.post('/visits/:visitId/prescriptions', requireRole('doctor', 'admin'), createPrescription);
router.get('/visits/:visitId/prescriptions', requireRole('admin', 'doctor', 'pharmacist', 'nurse', 'patient'), getVisitPrescriptions);
router.get('/prescriptions/:id', requireRole('admin', 'doctor', 'pharmacist', 'patient'), getPrescription);
router.get('/patients/:patientId/prescriptions', requireRole('admin', 'doctor', 'pharmacist', 'patient'), getPatientPrescriptions);

// ─── Clinical Profile ─────────────────────────────────────────────────────────
router.get('/patients/:patientId/clinical-profile', requireRole('admin', 'doctor', 'nurse', 'receptionist', 'patient'), getClinicalProfile);
router.patch('/patients/:patientId/clinical-profile', requireRole('admin', 'doctor', 'nurse'), updateClinicalProfile);

// ─── Medicine autocomplete (Rx builder) ──────────────────────────────────────
router.get('/medicines/search', requireRole('admin', 'doctor', 'pharmacist'), searchMedicines);

// ─── Medical Certificates ─────────────────────────────────────────────────────
router.post('/certificates', requireRole('doctor', 'admin'), createCertificate);
router.get('/certificates/:id', requireRole('admin', 'doctor', 'nurse', 'patient'), getCertificate);
router.get('/patients/:patientId/certificates', requireRole('admin', 'doctor', 'nurse', 'receptionist', 'patient'), getPatientCertificates);

export default router;
