import mongoose from 'mongoose';

/**
 * StockBatch — a received batch of a medicine with its expiry, quantity, and pricing.
 * All prices in paise.
 * 
 * A batch is "expired" when expiryDate < today (IST YYYY-MM-DD).
 * Expired batches are excluded from dispensing and available stock counts.
 *
 * FEFO ordering: batches are sorted by expiryDate ASC when dispensing.
 */
const stockBatchSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
      index: true,
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    expiryDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    quantityReceived: { type: Number, required: true, min: 0 },
    quantityAvailable: { type: Number, required: true, min: 0 },
    purchasePrice: { type: Number, default: 0, min: 0 }, // paise per unit
    sellingPrice: { type: Number, default: 0, min: 0 },  // paise per unit
    supplier: { type: String, trim: true, maxlength: 200 },
    receivedOn: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unique constraint: same batch number for same medicine only once
stockBatchSchema.index({ medicineId: 1, batchNumber: 1 }, { unique: true });
// For FEFO dispense queries
stockBatchSchema.index({ medicineId: 1, expiryDate: 1, quantityAvailable: 1 });

const StockBatch = mongoose.model('StockBatch', stockBatchSchema);
export default StockBatch;
