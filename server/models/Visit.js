import mongoose from 'mongoose';

const vitalsSchema = new mongoose.Schema(
  {
    bpSystolic: { type: Number },
    bpDiastolic: { type: Number },
    weightKg: { type: Number },
    heightCm: { type: Number },
    temperatureC: { type: Number },
    spo2: { type: Number },
    pulse: { type: Number },
    // Paediatrics: head circumference (optional)
    headCircumferenceCm: { type: Number },
  },
  { _id: false }
);

const amendmentSchema = new mongoose.Schema(
  {
    amendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amendedAt: { type: Date, default: Date.now },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    // Snapshot of the fields that were changed
    fieldChanged: { type: String, required: true, trim: true },
    previousValue: { type: String },
    newValue: { type: String },
  },
  { _id: true }
);

const visitSchema = new mongoose.Schema(
  {
    // Link to appointment (null for direct walk-ins not registered as OPD appointment)
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    visitDate: {
      // YYYY-MM-DD (IST) — date of the clinical visit
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    // ---- Clinical Content ----
    chiefComplaint: { type: String, trim: true, maxlength: 2000 },
    vitals: { type: vitalsSchema, default: {} },
    // Who entered vitals (nurse/receptionist can pre-enter before doctor)
    vitalsEnteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    examination: { type: String, trim: true, maxlength: 5000 },
    diagnosis: { type: String, trim: true, maxlength: 3000 },
    // Optional ICD-10 or similar code — not validated, free-form
    diagnosisCode: { type: String, trim: true, maxlength: 20 },
    consultationNotes: { type: String, trim: true, maxlength: 10000 },
    advice: { type: String, trim: true, maxlength: 3000 },
    // Follow-up date stored as YYYY-MM-DD string
    followUpDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },

    // ---- Department-aware optional fields ----
    // Gynaecology & Panchakarma: free-text therapy plan
    gynTherapyPlan: { type: String, trim: true, maxlength: 5000 },

    // ---- Status ----
    status: {
      type: String,
      enum: ['Draft', 'Finalized'],
      default: 'Draft',
      index: true,
    },
    finalizedAt: { type: Date },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ---- Amendment log (append-only; created by doctor on locked visit) ----
    amendments: [amendmentSchema],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

visitSchema.index({ patientId: 1, visitDate: -1 });
visitSchema.index({ doctorId: 1, visitDate: -1 });

const Visit = mongoose.model('Visit', visitSchema);
export default Visit;
