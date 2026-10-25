import mongoose from 'mongoose';

/**
 * ChargeItem — price list for services, procedures, therapies.
 * All prices stored as integer paise (1 INR = 100 paise) to avoid floating-point drift.
 */
const chargeItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    category: {
      type: String,
      enum: ['Consultation', 'Procedure', 'Therapy', 'Pharmacy', 'Package', 'Other'],
      required: true,
    },
    // Price in paise (integer). E.g., ₹500 = 50000 paise.
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

chargeItemSchema.index({ name: 'text' });
chargeItemSchema.index({ category: 1, isActive: 1 });

const ChargeItem = mongoose.model('ChargeItem', chargeItemSchema);
export default ChargeItem;
