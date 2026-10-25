import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  listStaff, getStaffMember, createStaff, updateStaff,
  deactivateStaff, reactivateStaff,
  changePassword, getMyProfile,
} from '../controllers/staffController.js';

const router = Router();
router.use(requireAuth);

// ─── My Profile & Password ────────────────────────────────────────────────────
router.get('/me', getMyProfile);
router.post('/change-password', changePassword);

// ─── Staff List ───────────────────────────────────────────────────────────────
router.get('/', requireRole('admin'), listStaff);
router.post('/', requireRole('admin'), createStaff);

// ─── Individual Staff ─────────────────────────────────────────────────────────
router.get('/:id', getStaffMember);
router.patch('/:id', updateStaff);
router.post('/:id/deactivate', requireRole('admin'), deactivateStaff);
router.post('/:id/reactivate', requireRole('admin'), reactivateStaff);

export default router;
