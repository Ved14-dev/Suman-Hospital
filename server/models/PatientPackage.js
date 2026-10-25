import mongoose from 'mongoose';

/**
 * PatientPackage — a patient's purchased package instance.
 * Redeeming a session decrements sessionsUsed++ and creates a billing line item at ₹0.
 * All amounts in paise.
 */
const patientPackageSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    sessionsTotal: { type: Number, required: true, min: 1 },
    sessionsUsed: { type: Number, default: 0, min: 0 },
    expiresOn: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    isActive: { type: Boolean, default: true },
    purchasedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const PatientPackage = mongoose.model('PatientPackage', patientPackageSchema);
export default PatientPackage;
