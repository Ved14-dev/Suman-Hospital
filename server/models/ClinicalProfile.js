import mongoose from 'mongoose';

/**
 * ClinicalProfile — one per patient, stores chronic data and allergy record.
 * Changes to allergies are tracked in an audit log (append-only entries).
 *
 * Allergy severity levels: Mild, Moderate, Severe, Unknown
 *
 * LIMITATION: Allergy checking in the Rx builder uses a case-insensitive string
 * match on medicine name / genericName vs allergy.substance. This does not cover
 * cross-reactive compounds or brand/generic synonyms.
 */
const allergySchema = new mongoose.Schema(
  {
    substance: { type: String, required: true, trim: true, maxlength: 200 },
    reaction: { type: String, trim: true, maxlength: 500 },
    severity: {
      type: String,
      enum: ['Mild', 'Moderate', 'Severe', 'Unknown'],
      default: 'Unknown',
    },
  },
  { _id: true }
);

const auditEntrySchema = new mongoose.Schema(
  {
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changedAt: { type: Date, default: Date.now },
    field: { type: String, required: true },
    oldValue: { type: String },
    newValue: { type: String },
  },
  { _id: false }
);

const clinicalProfileSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      unique: true,
      index: true,
    },
    allergies: [allergySchema],
    chronicConditions: [{ type: String, trim: true, maxlength: 200 }],
    pastHistory: { type: String, trim: true, maxlength: 5000 },
    familyHistory: { type: String, trim: true, maxlength: 3000 },
    auditLog: [auditEntrySchema],
  },
  { timestamps: true }
);

const ClinicalProfile = mongoose.model('ClinicalProfile', clinicalProfileSchema);
export default ClinicalProfile;
