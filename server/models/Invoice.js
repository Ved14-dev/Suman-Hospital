import mongoose from 'mongoose';

/**
 * Invoice — billing document for a patient visit or standalone charge.
 *
 * ALL monetary values stored as integer paise to prevent floating-point drift.
 * The server ALWAYS computes subtotal, discountTotal, netTotal, balanceDue
 * from line items. Client-provided totals are ignored.
 *
 * Discount threshold rule: discounts > 20% of subtotal require a discountReason.
 * Configurable via DISCOUNT_THRESHOLD_PCT env var (default 20).
 *
 * Invoice lifecycle:
 *  Draft → Issued → Partially Paid → Paid
 *                                   ↓
 *                              Cancelled / Refunded
 *
 * An invoice with any payment cannot be edited or deleted.
 * Use cancel/refund flow only.
 */
const lineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true, maxlength: 300 },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }, // paise
    discount: { type: Number, default: 0, min: 0 },      // paise per unit
    amount: { type: Number, required: true, min: 0 },    // (unitPrice - discount) * qty paise
    // Link to charge item master (optional)
    chargeItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChargeItem' },
    // For package redemptions — zero-cost line items
    patientPackageId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientPackage' },
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    visitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit',
    },
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
    },
    lineItems: [lineItemSchema],

    // All in paise
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    discountReason: { type: String, trim: true, maxlength: 500 },
    netTotal: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['Draft', 'Issued', 'Partially Paid', 'Paid', 'Cancelled', 'Refunded'],
      default: 'Draft',
      index: true,
    },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancellationReason: { type: String, trim: true, maxlength: 500 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issuedAt: { type: Date },
  },
  { timestamps: true }
);

invoiceSchema.index({ patientId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, createdAt: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
