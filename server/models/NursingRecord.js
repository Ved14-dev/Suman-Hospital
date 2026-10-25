import mongoose from 'mongoose';

/**
 * NursingRecord — Append-only clinical nursing log.
 * Corrections are recorded via addenda referencing original records.
 * Edits and deletes are strictly rejected.
 */
const nursingRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
      index: true,
    },
    type: {
      type: String,
      enum: ['Vitals', 'Observation', 'Medication', 'IntakeOutput', 'Procedure', 'Allergy'],
      required: true,
      index: true,
    },
    // Structured data varying by entry type
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    note: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    observedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    observedReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
    addendumOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NursingRecord',
      index: true,
    },
    abnormal: {
      type: Boolean,
      default: false,
      index: true,
    },
    abnormalFlags: [
      {
        type: String,
      },
    ],
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgedAt: {
      type: Date,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

nursingRecordSchema.index({ admissionId: 1, observedAt: -1 });
nursingRecordSchema.index({ patientId: 1, observedAt: -1 });

const NursingRecord = mongoose.model('NursingRecord', nursingRecordSchema);
export default NursingRecord;
