import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  listChargeItems, createChargeItem, updateChargeItem,
  listPackages, createPackage, sellPackage, redeemPackageSession,
  listInvoices, getInvoice, createInvoice, updateInvoice, cancelInvoice,
  recordPayment,
  issueRefund,
  getOutstandingDues,
  getDailyCollectionReport, getRevenueSummary,
} from '../controllers/billingController.js';

const router = Router();
router.use(requireAuth);

// ─── Charge Items ─────────────────────────────────────────────────────────────
router.get('/charge-items', requireRole('admin', 'receptionist', 'doctor'), listChargeItems);
router.post('/charge-items', requireRole('admin'), createChargeItem);
router.patch('/charge-items/:id', requireRole('admin'), updateChargeItem);

// ─── Packages ─────────────────────────────────────────────────────────────────
router.get('/packages', requireRole('admin', 'receptionist'), listPackages);
router.post('/packages', requireRole('admin'), createPackage);
router.post('/packages/sell', requireRole('admin', 'receptionist'), sellPackage);
router.post('/patient-packages/:id/redeem', requireRole('admin', 'receptionist'), redeemPackageSession);

// ─── Invoices ─────────────────────────────────────────────────────────────────
router.get('/invoices', requireRole('admin', 'receptionist', 'patient'), listInvoices);
router.post('/invoices', requireRole('admin', 'receptionist'), createInvoice);
router.get('/invoices/outstanding', requireRole('admin', 'receptionist'), getOutstandingDues);
router.get('/invoices/:id', requireRole('admin', 'receptionist', 'doctor', 'patient'), getInvoice);
router.patch('/invoices/:id', requireRole('admin', 'receptionist'), updateInvoice);
router.post('/invoices/:id/cancel', requireRole('admin'), cancelInvoice);

// ─── Payments ─────────────────────────────────────────────────────────────────
router.post('/payments', requireRole('admin', 'receptionist'), recordPayment);

// ─── Refunds ─────────────────────────────────────────────────────────────────
router.post('/refunds', requireRole('admin'), issueRefund);

// ─── Reports ─────────────────────────────────────────────────────────────────
router.get('/reports/daily-collection', requireRole('admin', 'receptionist'), getDailyCollectionReport);
router.get('/reports/revenue', requireRole('admin'), getRevenueSummary);

export default router;
