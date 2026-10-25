import mongoose from 'mongoose';

/**
 * Medicine master — formulary of all medicines stocked by the pharmacy.
 * Seed covers all 4 departments: General, Pediatrics, Orthopaedics, Gynaecology & Panchakarma.
 */
const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200, index: true },
    genericName: { type: String, trim: true, maxlength: 200 },
    form: {
      type: String,
      enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Cream', 'Drops', 'Powder', 'Sachet', 'Oil', 'Other'],
      required: true,
    },
    strength: { type: String, trim: true, maxlength: 100 },
    manufacturer: { type: String, trim: true, maxlength: 200 },
    category: { type: String, trim: true, maxlength: 100 },
    // Minimum quantity on hand before a reorder alert is triggered
    reorderLevel: { type: Number, default: 10, min: 0 },
    unit: {
      type: String,
      enum: ['Strip', 'Bottle', 'Vial', 'Tube', 'Box', 'Sachet', 'Unit'],
      default: 'Strip',
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

medicineSchema.index({ name: 'text', genericName: 'text' });

const Medicine = mongoose.model('Medicine', medicineSchema);
export default Medicine;
