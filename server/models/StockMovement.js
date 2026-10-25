import mongoose from 'mongoose';

/**
 * StockMovement — immutable ledger of all stock changes.
 * Stock levels must always be explainable by this ledger:
 *   SUM(quantity WHERE type=Receive) - SUM(ABS(quantity) WHERE type IN [Dispense, Expired-writeoff])
 *   + SUM(quantity WHERE type=Adjust)  = current quantityAvailable.
 *
 * Stock can never go negative — enforced in controller.
 */
const stockMovementSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Receive', 'Dispense', 'Adjust', 'Expired-writeoff'],
      required: true,
      index: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StockBatch',
      required: true,
      index: true,
    },
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
      index: true,
    },
    // Positive for Receive/Adjust(+); negative for Dispense/Adjust(-)/Expired-writeoff
    quantity: { type: Number, required: true },
    reason: { type: String, trim: true, maxlength: 500 },
    // For Dispense: link to Prescription; for billing: link to Invoice
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    referenceModel: {
      type: String,
      enum: ['Prescription', 'Invoice', null],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
export default StockMovement;
