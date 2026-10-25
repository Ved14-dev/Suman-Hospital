import mongoose from 'mongoose';

/**
 * Package — bundled service offerings (e.g. Panchakarma 7-session course).
 * Selling a package creates a PatientPackage record.
 * All prices in paise (integer).
 */
const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    // Fixed price for the entire package in paise
    fixedPrice: { type: Number, required: true, min: 0 },
    // Total sessions included in package
    sessions: { type: Number, required: true, min: 1 },
    // How many days from purchase before the package expires
    validityDays: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

const Package = mongoose.model('Package', packageSchema);
export default Package;
