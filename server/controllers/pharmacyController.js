/**
 * Pharmacy Controller — Medicine Master, Stock Batches, Movements, Dispense
 * Suman Multispecialty Hospital
 *
 * FEFO (First Expiry, First Out) dispense order is enforced.
 * Stock can never go negative — enforced before any StockMovement write.
 * Expired batches (expiryDate < today IST) are excluded from available stock.
 * Near-expiry alert window defaults to 90 days, configurable via EXPIRY_ALERT_DAYS env.
 */

import Medicine from '../models/Medicine.js';
import StockBatch from '../models/StockBatch.js';
import StockMovement from '../models/StockMovement.js';
import Prescription from '../models/Prescription.js';
import { getTodayIST } from '../utils/dateUtils.js';

const EXPIRY_ALERT_DAYS = Number(process.env.EXPIRY_ALERT_DAYS || 90);

// ─── Medicine Master ───────────────────────────────────────────────────────────

export const listMedicines = async (req, res) => {
  try {
    const q = {};
    if (req.query.active !== 'false') q.isActive = true;
    if (req.query.q) {
      const term = req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      q.$or = [{ name: new RegExp(term, 'i') }, { genericName: new RegExp(term, 'i') }];
    }
    const medicines = await Medicine.find(q).sort({ name: 1 });
    res.json({ success: true, data: medicines });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMedicine = async (req, res) => {
  try {
    const m = await Medicine.findById(req.params.id);
    if (!m) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, data: m });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createMedicine = async (req, res) => {
  try {
    const m = await Medicine.create(req.body);
    res.status(201).json({ success: true, data: m });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMedicine = async (req, res) => {
  try {
    const m = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!m) return res.status(404).json({ success: false, message: 'Medicine not found' });
    res.json({ success: true, data: m });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Stock In ─────────────────────────────────────────────────────────────────

export const receiveStock = async (req, res) => {
  try {
    const { medicineId, batchNumber, expiryDate, quantityReceived, purchasePrice, sellingPrice, supplier } = req.body;
    if (!medicineId || !batchNumber || !expiryDate || !quantityReceived) {
      return res.status(400).json({ success: false, message: 'medicineId, batchNumber, expiryDate, quantityReceived are required' });
    }
    const today = getTodayIST();
    if (expiryDate <= today) {
      return res.status(400).json({ success: false, message: 'Cannot receive an already-expired batch' });
    }

    const batch = await StockBatch.create({
      medicineId,
      batchNumber,
      expiryDate,
      quantityReceived,
      quantityAvailable: quantityReceived,
      purchasePrice: Math.round(purchasePrice || 0),
      sellingPrice: Math.round(sellingPrice || 0),
      supplier,
      receivedOn: today,
      receivedBy: req.user._id,
    });

    await StockMovement.create({
      type: 'Receive',
      batchId: batch._id,
      medicineId,
      quantity: quantityReceived,
      reason: `Batch received: ${batchNumber}`,
      performedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: batch });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Batch number already exists for this medicine' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Stock Levels ─────────────────────────────────────────────────────────────

export const getStockLevels = async (req, res) => {
  try {
    const today = getTodayIST();
    // Aggregate total available across non-expired batches per medicine
    const levels = await StockBatch.aggregate([
      { $match: { expiryDate: { $gte: today }, isActive: true } },
      {
        $group: {
          _id: '$medicineId',
          totalAvailable: { $sum: '$quantityAvailable' },
          batches: {
            $push: {
              batchId: '$_id',
              batchNumber: '$batchNumber',
              expiryDate: '$expiryDate',
              quantityAvailable: '$quantityAvailable',
              sellingPrice: '$sellingPrice',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'medicines',
          localField: '_id',
          foreignField: '_id',
          as: 'medicine',
        },
      },
      { $unwind: '$medicine' },
      {
        $project: {
          medicine: 1,
          totalAvailable: 1,
          batches: { $sortArray: { input: '$batches', sortBy: { expiryDate: 1 } } },
          isLowStock: { $lte: ['$totalAvailable', '$medicine.reorderLevel'] },
        },
      },
      { $sort: { 'medicine.name': 1 } },
    ]);
    res.json({ success: true, data: levels });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getLowStockAlerts = async (req, res) => {
  try {
    const today = getTodayIST();
    const levels = await StockBatch.aggregate([
      { $match: { expiryDate: { $gte: today }, isActive: true } },
      { $group: { _id: '$medicineId', totalAvailable: { $sum: '$quantityAvailable' } } },
      {
        $lookup: {
          from: 'medicines',
          localField: '_id',
          foreignField: '_id',
          as: 'medicine',
        },
      },
      { $unwind: '$medicine' },
      { $match: { $expr: { $lte: ['$totalAvailable', '$medicine.reorderLevel'] } } },
      { $project: { medicine: 1, totalAvailable: 1 } },
      { $sort: { totalAvailable: 1 } },
    ]);

    // Near-expiry: batches expiring within EXPIRY_ALERT_DAYS
    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + EXPIRY_ALERT_DAYS);
    const alertDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(alertDate);

    const nearExpiry = await StockBatch.find({
      expiryDate: { $gte: today, $lte: alertDateStr },
      quantityAvailable: { $gt: 0 },
      isActive: true,
    })
      .populate('medicineId', 'name genericName form strength')
      .sort({ expiryDate: 1 });

    const expired = await StockBatch.find({
      expiryDate: { $lt: today },
      quantityAvailable: { $gt: 0 },
      isActive: true,
    })
      .populate('medicineId', 'name genericName form strength')
      .sort({ expiryDate: 1 });

    res.json({
      success: true,
      data: {
        lowStock: levels,
        nearExpiry,
        expired,
        counts: {
          lowStock: levels.length,
          nearExpiry: nearExpiry.length,
          expired: expired.length,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Dispense ─────────────────────────────────────────────────────────────────

/**
 * Dispense medicines for a finalized prescription in FEFO order.
 * Body: { prescriptionId, dispenseItems: [{ batchId, quantity }] }
 * Stock can never go negative. Expired batches cannot be dispensed.
 */
export const dispensePrescription = async (req, res) => {
  try {
    const { prescriptionId, dispenseItems } = req.body;
    if (!prescriptionId || !Array.isArray(dispenseItems) || dispenseItems.length === 0) {
      return res.status(400).json({ success: false, message: 'prescriptionId and dispenseItems[] are required' });
    }

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found' });
    if (prescription.dispensedAt) {
      return res.status(400).json({ success: false, message: 'Prescription already dispensed' });
    }

    const today = getTodayIST();
    const movements = [];

    for (const item of dispenseItems) {
      const batch = await StockBatch.findById(item.batchId).populate('medicineId');
      if (!batch) return res.status(404).json({ success: false, message: `Batch ${item.batchId} not found` });
      if (batch.expiryDate < today) {
        return res.status(400).json({ success: false, message: `Batch ${batch.batchNumber} is expired. Cannot dispense.` });
      }
      if (batch.quantityAvailable < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for batch ${batch.batchNumber}. Available: ${batch.quantityAvailable}`,
        });
      }
      batch.quantityAvailable -= item.quantity;
      await batch.save();
      movements.push({
        type: 'Dispense',
        batchId: batch._id,
        medicineId: batch.medicineId._id || batch.medicineId,
        quantity: -item.quantity,
        reason: `Dispensed for Rx ${prescription.rxNumber}`,
        referenceId: prescription._id,
        referenceModel: 'Prescription',
        performedBy: req.user._id,
      });
    }

    await StockMovement.insertMany(movements);
    prescription.dispensedAt = new Date();
    prescription.dispensedBy = req.user._id;
    await prescription.save();

    res.json({ success: true, data: { prescription, movements } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Manual Adjustment ────────────────────────────────────────────────────────

export const adjustStock = async (req, res) => {
  try {
    const { batchId, quantity, reason } = req.body;
    if (!batchId || quantity === undefined || !reason) {
      return res.status(400).json({ success: false, message: 'batchId, quantity, reason are required' });
    }
    const batch = await StockBatch.findById(batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const newQty = batch.quantityAvailable + Math.round(quantity);
    if (newQty < 0) {
      return res.status(400).json({ success: false, message: 'Adjustment would result in negative stock' });
    }
    batch.quantityAvailable = newQty;
    await batch.save();

    await StockMovement.create({
      type: 'Adjust',
      batchId: batch._id,
      medicineId: batch.medicineId,
      quantity: Math.round(quantity),
      reason,
      performedBy: req.user._id,
    });

    res.json({ success: true, data: batch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Suggest FEFO batches for a given medicine and quantity needed
export const suggestBatches = async (req, res) => {
  try {
    const { medicineId, quantity } = req.query;
    if (!medicineId || !quantity) {
      return res.status(400).json({ success: false, message: 'medicineId and quantity are required' });
    }
    const today = getTodayIST();
    const batches = await StockBatch.find({
      medicineId,
      expiryDate: { $gte: today },
      quantityAvailable: { $gt: 0 },
      isActive: true,
    }).sort({ expiryDate: 1 });

    res.json({ success: true, data: batches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
