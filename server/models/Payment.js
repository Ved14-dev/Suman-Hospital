import mongoose from 'mongoose';

/**
 * Payment — a receipt of money against an invoice.
 * Enforced invariant (server-side): sum of payments cannot exceed invoice.netTotal.
 * Amount stored in paise.
 */
const paymentSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 1 }, // paise
    mode: {
      type: String,
      enum: ['Cash', 'UPI', 'Card'],
      required: true,
    },
    // Optional: UPI txn ID or card last 4 digits
    reference: { type: String, trim: true, maxlength: 100 },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receivedAt: { type: Date, default: Date.now },
    // Link to refund if this payment was refunded
    refundId: { type: mongoose.Schema.Types.ObjectId, ref: 'Refund' },
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
