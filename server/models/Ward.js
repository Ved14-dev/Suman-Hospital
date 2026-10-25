import mongoose from 'mongoose';

/**
 * Ward — a named ward/area in the hospital.
 */
const wardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: {
      type: String,
      enum: ['General', 'Pediatric', 'Maternity/Gynae', 'Private'],
      required: true,
      trim: true,
      maxlength: 100,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Ward = mongoose.model('Ward', wardSchema);
export default Ward;
