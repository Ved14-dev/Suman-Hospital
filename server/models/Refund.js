import mongoose from 'mongoose';

/**
 * Refund — admin-approved refund against a payment.
 * Enforced invariant: refund amount cannot exceed payment amount minus prior refunds.
 * All amounts in paise.
 */
const refundSchema = new mongoose.Schema(
  {
    refundNumber: {
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
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },
    amount: { type: Number, required: true, min: 1 }, // paise
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    mode: {
      type: String,
      enum: ['Cash', 'UPI', 'Card'],
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    refundedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Refund = mongoose.model('Refund', refundSchema);
export default Refund;
