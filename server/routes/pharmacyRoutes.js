import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  listMedicines, getMedicine, createMedicine, updateMedicine,
  receiveStock,
  getStockLevels, getLowStockAlerts,
  dispensePrescription, suggestBatches,
  adjustStock,
} from '../controllers/pharmacyController.js';

const router = Router();
router.use(requireAuth);

// ─── Medicine Master ──────────────────────────────────────────────────────────
router.get('/medicines', requireRole('admin', 'pharmacist', 'doctor', 'nurse'), listMedicines);
router.post('/medicines', requireRole('admin', 'pharmacist'), createMedicine);
router.get('/medicines/:id', requireRole('admin', 'pharmacist', 'doctor'), getMedicine);
router.patch('/medicines/:id', requireRole('admin', 'pharmacist'), updateMedicine);

// ─── Stock In ─────────────────────────────────────────────────────────────────
router.post('/stock/receive', requireRole('admin', 'pharmacist'), receiveStock);

// ─── Stock Levels ─────────────────────────────────────────────────────────────
router.get('/stock/levels', requireRole('admin', 'pharmacist', 'doctor'), getStockLevels);
router.get('/stock/alerts', requireRole('admin', 'pharmacist'), getLowStockAlerts);
router.get('/stock/suggest', requireRole('admin', 'pharmacist'), suggestBatches);

// ─── Dispense ─────────────────────────────────────────────────────────────────
router.post('/dispense', requireRole('admin', 'pharmacist'), dispensePrescription);

// ─── Manual Adjustment ────────────────────────────────────────────────────────
router.post('/stock/adjust', requireRole('admin', 'pharmacist'), adjustStock);

export default router;
