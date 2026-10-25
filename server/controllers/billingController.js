/**
 * Billing Controller — Invoices, Payments, Refunds, Reports
 * Suman Multispecialty Hospital
 *
 * ALL monetary computations happen server-side in integer paise.
 * Client-sent totals are IGNORED. The server always recalculates.
 *
 * Rules:
 * - Payments cannot exceed invoice balanceDue.
 * - Refunds cannot exceed amountPaid minus already-refunded amounts.
 * - Discount > DISCOUNT_THRESHOLD_PCT (default 20%) requires discountReason.
 * - Invoices with any payment cannot be edited or deleted — use cancel/refund.
 * - Cancelled invoices with payments enter Refunded status through refund flow.
 * - Invoice and receipt numbers are atomic and never reused.
 */

import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Refund from '../models/Refund.js';
import ChargeItem from '../models/ChargeItem.js';
import Package from '../models/Package.js';
import PatientPackage from '../models/PatientPackage.js';
import Patient from '../models/Patient.js';
import {
  getNextInvoiceNumber,
  getNextReceiptNumber,
  getNextRefundNumber,
} from '../utils/counter.js';
import { getTodayIST } from '../utils/dateUtils.js';

const DISCOUNT_THRESHOLD_PCT = Number(process.env.DISCOUNT_THRESHOLD_PCT || 20);

/**
 * Compute all derived invoice totals from line items.
 * All values are integer paise.
 */
const computeTotals = (lineItems) => {
  let subtotal = 0;
  let discountTotal = 0;
  const computed = lineItems.map((item) => {
    const unitPrice = Math.round(item.unitPrice || 0);
    const qty = Math.max(1, Math.round(item.quantity || 1));
    const discount = Math.round(item.discount || 0);
    const amount = (unitPrice - discount) * qty;
    subtotal += unitPrice * qty;
    discountTotal += discount * qty;
    return { ...item, unitPrice, quantity: qty, discount, amount };
  });
  const netTotal = subtotal - discountTotal;
  return { lineItems: computed, subtotal, discountTotal, netTotal };
};

// ─── ChargeItem master ────────────────────────────────────────────────────────

export const listChargeItems = async (req, res) => {
  try {
    const q = {};
    if (req.query.category) q.category = req.query.category;
    if (req.query.active !== 'false') q.isActive = true;
    const items = await ChargeItem.find(q).populate('department', 'name').sort({ category: 1, name: 1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createChargeItem = async (req, res) => {
  try {
    const item = await ChargeItem.create({ ...req.body, price: Math.round(req.body.price || 0) });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateChargeItem = async (req, res) => {
  try {
    if (req.body.price !== undefined) req.body.price = Math.round(req.body.price);
    const item = await ChargeItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Packages ─────────────────────────────────────────────────────────────────

export const listPackages = async (req, res) => {
  try {
    const pkgs = await Package.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: pkgs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createPackage = async (req, res) => {
  try {
    const pkg = await Package.create({ ...req.body, fixedPrice: Math.round(req.body.fixedPrice || 0) });
    res.status(201).json({ success: true, data: pkg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Sell a package to a patient — creates PatientPackage and an Invoice
export const sellPackage = async (req, res) => {
  try {
    const { patientId, packageId } = req.body;
    const pkg = await Package.findById(packageId);
    if (!pkg || !pkg.isActive) return res.status(404).json({ success: false, message: 'Package not found or inactive' });

    const today = getTodayIST();
    const [y, m, d] = today.split('-').map(Number);
    const expiry = new Date(Date.UTC(y, m - 1, d + pkg.validityDays));
    const expiresOn = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(expiry);

    const invoiceNumber = await getNextInvoiceNumber();
    const lineItem = {
      description: pkg.name,
      quantity: 1,
      unitPrice: pkg.fixedPrice,
      discount: 0,
      amount: pkg.fixedPrice,
    };
    const { subtotal, discountTotal, netTotal } = computeTotals([lineItem]);
    const invoice = await Invoice.create({
      invoiceNumber,
      patientId,
      lineItems: [lineItem],
      subtotal,
      discountTotal,
      netTotal,
      amountPaid: 0,
      balanceDue: netTotal,
      status: 'Issued',
      createdBy: req.user._id,
      issuedAt: new Date(),
    });

    const pp = await PatientPackage.create({
      patientId,
      packageId,
      invoiceId: invoice._id,
      sessionsTotal: pkg.sessions,
      sessionsUsed: 0,
      expiresOn,
    });

    res.status(201).json({ success: true, data: { invoice, patientPackage: pp } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Redeem one session from a PatientPackage — creates a ₹0 line item on an existing invoice
export const redeemPackageSession = async (req, res) => {
  try {
    const pp = await PatientPackage.findById(req.params.id).populate('packageId');
    if (!pp) return res.status(404).json({ success: false, message: 'Patient package not found' });
    if (pp.sessionsUsed >= pp.sessionsTotal) {
      return res.status(400).json({ success: false, message: 'No sessions remaining' });
    }
    const today = getTodayIST();
    if (today > pp.expiresOn) {
      return res.status(400).json({ success: false, message: 'Package has expired' });
    }
    pp.sessionsUsed += 1;
    await pp.save();
    res.json({ success: true, data: pp });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const listInvoices = async (req, res) => {
  try {
    const q = {};
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id }).select('_id');
      if (!patient) return res.status(404).json({ success: false, message: 'Patient record not found' });
      q.patientId = patient._id;
    } else {
      if (req.query.patientId) q.patientId = req.query.patientId;
      if (req.query.status) q.status = req.query.status;
    }
    const invoices = await Invoice.find(q)
      .populate('patientId', 'uhid name phone')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('patientId', 'uhid name phone gender')
      .populate('visitId', 'visitDate diagnosis')
      .populate('createdBy', 'name role')
      .populate('lineItems.chargeItemId', 'name category');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id }).select('_id');
      if (!patient || !patient._id.equals(invoice.patientId._id)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    // Also return associated payments and refunds
    const payments = await Payment.find({ invoiceId: invoice._id }).populate('receivedBy', 'name role').sort({ receivedAt: 1 });
    const refunds = await Refund.find({ invoiceId: invoice._id }).populate('approvedBy', 'name role').sort({ refundedAt: 1 });
    res.json({ success: true, data: { invoice, payments, refunds } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createInvoice = async (req, res) => {
  try {
    const { patientId, visitId, admissionId, lineItems, discountReason } = req.body;
    if (!patientId || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ success: false, message: 'patientId and lineItems[] are required' });
    }

    const { lineItems: computedItems, subtotal, discountTotal, netTotal } = computeTotals(lineItems);

    // Enforce discount reason threshold
    if (discountTotal > 0 && (discountTotal / subtotal) * 100 > DISCOUNT_THRESHOLD_PCT && !discountReason) {
      return res.status(400).json({
        success: false,
        message: `Discounts exceeding ${DISCOUNT_THRESHOLD_PCT}% require a discountReason`,
      });
    }

    const invoiceNumber = await getNextInvoiceNumber();
    const invoice = await Invoice.create({
      invoiceNumber,
      patientId,
      visitId: visitId || undefined,
      admissionId: admissionId || undefined,
      lineItems: computedItems,
      subtotal,
      discountTotal,
      discountReason,
      netTotal,
      amountPaid: 0,
      balanceDue: netTotal,
      status: 'Issued',
      createdBy: req.user._id,
      issuedAt: new Date(),
    });
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const payments = await Payment.countDocuments({ invoiceId: invoice._id });
    if (payments > 0) {
      return res.status(400).json({ success: false, message: 'Invoice with payments cannot be edited. Use cancel/refund flow.' });
    }

    const { lineItems, discountReason } = req.body;
    if (lineItems) {
      const { lineItems: comp, subtotal, discountTotal, netTotal } = computeTotals(lineItems);
      if (discountTotal > 0 && (discountTotal / subtotal) * 100 > DISCOUNT_THRESHOLD_PCT && !discountReason) {
        return res.status(400).json({ success: false, message: `Discounts exceeding ${DISCOUNT_THRESHOLD_PCT}% require a discountReason` });
      }
      invoice.lineItems = comp;
      invoice.subtotal = subtotal;
      invoice.discountTotal = discountTotal;
      invoice.discountReason = discountReason || invoice.discountReason;
      invoice.netTotal = netTotal;
      invoice.balanceDue = netTotal - invoice.amountPaid;
    }
    await invoice.save();
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const cancelInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (['Cancelled', 'Refunded'].includes(invoice.status)) {
      return res.status(400).json({ success: false, message: 'Invoice is already cancelled or refunded' });
    }
    const paymentsCount = await Payment.countDocuments({ invoiceId: invoice._id });
    if (paymentsCount > 0) {
      return res.status(400).json({ success: false, message: 'Invoice has payments. Issue a refund first, then cancel.' });
    }
    invoice.status = 'Cancelled';
    invoice.cancelledAt = new Date();
    invoice.cancelledBy = req.user._id;
    invoice.cancellationReason = req.body.reason || '';
    await invoice.save();
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const recordPayment = async (req, res) => {
  try {
    const { invoiceId, amount, mode, reference } = req.body;
    if (!invoiceId || !amount || !mode) {
      return res.status(400).json({ success: false, message: 'invoiceId, amount, mode are required' });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (['Cancelled', 'Refunded'].includes(invoice.status)) {
      return res.status(400).json({ success: false, message: 'Cannot collect payment on a cancelled/refunded invoice' });
    }

    const amountPaise = Math.round(amount);
    if (amountPaise <= 0) return res.status(400).json({ success: false, message: 'Payment amount must be positive' });
    if (amountPaise > invoice.balanceDue) {
      return res.status(400).json({
        success: false,
        message: `Payment (₹${(amountPaise / 100).toFixed(2)}) exceeds balance due (₹${(invoice.balanceDue / 100).toFixed(2)})`,
      });
    }

    const receiptNumber = await getNextReceiptNumber();
    const payment = await Payment.create({
      receiptNumber,
      invoiceId: invoice._id,
      amount: amountPaise,
      mode,
      reference,
      receivedBy: req.user._id,
    });

    invoice.amountPaid += amountPaise;
    invoice.balanceDue -= amountPaise;
    invoice.status = invoice.balanceDue === 0 ? 'Paid' : 'Partially Paid';
    await invoice.save();

    res.status(201).json({ success: true, data: { payment, invoice } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Refunds ─────────────────────────────────────────────────────────────────

export const issueRefund = async (req, res) => {
  try {
    const { invoiceId, paymentId, amount, reason, mode } = req.body;
    if (!invoiceId || !paymentId || !amount || !reason || !mode) {
      return res.status(400).json({ success: false, message: 'invoiceId, paymentId, amount, reason, mode are required' });
    }

    const [invoice, payment] = await Promise.all([
      Invoice.findById(invoiceId),
      Payment.findById(paymentId),
    ]);
    if (!invoice || !payment) return res.status(404).json({ success: false, message: 'Invoice or payment not found' });

    const amountPaise = Math.round(amount);
    // Calculate already refunded against this payment
    const alreadyRefunded = await Refund.aggregate([
      { $match: { paymentId: payment._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const refundedSoFar = alreadyRefunded[0]?.total || 0;
    const refundable = payment.amount - refundedSoFar;
    if (amountPaise > refundable) {
      return res.status(400).json({
        success: false,
        message: `Refund amount exceeds refundable amount (₹${(refundable / 100).toFixed(2)})`,
      });
    }

    const refundNumber = await getNextRefundNumber();
    const refund = await Refund.create({
      refundNumber,
      invoiceId,
      paymentId,
      amount: amountPaise,
      reason,
      mode,
      approvedBy: req.user._id,
    });

    invoice.amountPaid -= amountPaise;
    invoice.balanceDue += amountPaise;
    invoice.status = invoice.amountPaid === 0 ? 'Refunded' : 'Partially Paid';
    await invoice.save();

    res.status(201).json({ success: true, data: refund });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Outstanding Dues ─────────────────────────────────────────────────────────

export const getOutstandingDues = async (req, res) => {
  try {
    const q = { balanceDue: { $gt: 0 }, status: { $in: ['Issued', 'Partially Paid'] } };
    if (req.query.patientId) q.patientId = req.query.patientId;

    const invoices = await Invoice.find(q)
      .populate('patientId', 'uhid name phone')
      .sort({ createdAt: 1 })
      .limit(200);
    res.json({ success: true, data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Reports ─────────────────────────────────────────────────────────────────

export const getDailyCollectionReport = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getTodayIST();
    const startOfDay = new Date(`${targetDate}T00:00:00+05:30`);
    const endOfDay = new Date(`${targetDate}T23:59:59+05:30`);

    const [payments, refunds] = await Promise.all([
      Payment.find({ receivedAt: { $gte: startOfDay, $lte: endOfDay } })
        .populate('receivedBy', 'name role')
        .populate('invoiceId', 'invoiceNumber patientId'),
      Refund.find({ refundedAt: { $gte: startOfDay, $lte: endOfDay } })
        .populate('approvedBy', 'name role'),
    ]);

    // Group by mode
    const byMode = {};
    payments.forEach((p) => {
      byMode[p.mode] = (byMode[p.mode] || 0) + p.amount;
    });
    refunds.forEach((r) => {
      byMode[r.mode] = (byMode[r.mode] || 0) - r.amount;
    });

    // Group by staff
    const byStaff = {};
    payments.forEach((p) => {
      const key = p.receivedBy?._id?.toString();
      if (!byStaff[key]) byStaff[key] = { staffName: p.receivedBy?.name, total: 0 };
      byStaff[key].total += p.amount;
    });

    const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
    const totalRefunded = refunds.reduce((s, r) => s + r.amount, 0);

    res.json({
      success: true,
      data: {
        date: targetDate,
        totalCollected,
        totalRefunded,
        netCollection: totalCollected - totalRefunded,
        byMode,
        byStaff: Object.values(byStaff),
        payments,
        refunds,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRevenueSummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ success: false, message: 'from and to dates are required (YYYY-MM-DD)' });

    const startDate = new Date(`${from}T00:00:00+05:30`);
    const endDate = new Date(`${to}T23:59:59+05:30`);

    const result = await Invoice.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate }, status: { $nin: ['Draft', 'Cancelled'] } } },
      {
        $lookup: {
          from: 'patients',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patient',
        },
      },
      {
        $group: {
          _id: null,
          totalInvoiced: { $sum: '$netTotal' },
          totalPaid: { $sum: '$amountPaid' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({ success: true, data: result[0] || { totalInvoiced: 0, totalPaid: 0, count: 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
