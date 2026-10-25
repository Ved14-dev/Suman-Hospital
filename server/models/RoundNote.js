import mongoose from 'mongoose';

/**
 * RoundNote — append-only clinical note on an admission.
 * DoctorRound notes are added by doctors; NursingNote by nurses.
 * Corrections are NOT edits — a new entry with a note referencing the correction
 * is added instead, preserving the full chronological audit trail.
 */
const roundNoteSchema = new mongoose.Schema(
  {
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['DoctorRound', 'NursingNote'],
      required: true,
    },
    note: { type: String, required: true, trim: true, maxlength: 10000 },
    // Optional vitals at time of round
    vitals: {
      bpSystolic: { type: Number },
      bpDiastolic: { type: Number },
      weightKg: { type: Number },
      temperatureC: { type: Number },
      spo2: { type: Number },
      pulse: { type: Number },
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

const RoundNote = mongoose.model('RoundNote', roundNoteSchema);
export default RoundNote;
