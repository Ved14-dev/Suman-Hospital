import express from 'express';
import { body, validationResult } from 'express-validator';
import {
  listPatients,
  quickSearchPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deactivatePatient,
  getMyProfile,
} from '../controllers/patientController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requirePermission } from '../utils/permissions.js';

const router = express.Router();

const validatePatientCreation = [
  body('name').trim().notEmpty().withMessage('Patient name is required'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Primary phone number is required')
    .isLength({ min: 7, max: 15 })
    .withMessage('Phone number must be between 7 and 15 digits'),
  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  body('bloodGroup')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'])
    .withMessage('Invalid blood group'),
  body('dob')
    .optional({ checkFalsy: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('DOB must be in YYYY-MM-DD format'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Must be a valid email address'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array(),
      });
    }
    next();
  },
];

// Current logged in patient profile
router.get('/me', requireAuth, requireRole('patient'), getMyProfile);

// Quick search for topbar (UHID, Name, Phone)
router.get(
  '/quick-search',
  requireAuth,
  requireRole('admin', 'receptionist', 'doctor', 'nurse', 'pharmacist'),
  quickSearchPatients
);

// List patients with pagination & search
router.get(
  '/',
  requireAuth,
  requireRole('admin', 'receptionist', 'doctor', 'nurse', 'pharmacist'),
  listPatients
);

// Get patient by ID
router.get('/:id', requireAuth, getPatientById);

// Create / register patient (Receptionist & Admin)
router.post(
  '/',
  requireAuth,
  requirePermission('patient:create'),
  validatePatientCreation,
  createPatient
);

// Update patient
router.patch('/:id', requireAuth, updatePatient);

// Soft delete / deactivate patient (Admin only)
router.patch(
  '/:id/deactivate',
  requireAuth,
  requirePermission('patient:deactivate'),
  deactivatePatient
);

export default router;
