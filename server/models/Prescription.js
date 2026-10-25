import mongoose from 'mongoose';

const rxItemSchema = new mongoose.Schema(
  {
    // Null if free-text medicine (not in master)
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
    },
    // Always stored as snapshot — survives medicine master changes
    medicineName: { type: String, required: true, trim: true, maxlength: 200 },
    genericName: { type: String, trim: true, maxlength: 200 },
    // True when doctor typed a medicine not in the master
    isFreetextItem: { type: Boolean, default: false },
    dosage: { type: String, trim: true, maxlength: 100 },
    frequency: { type: String, trim: true, maxlength: 100 },
    duration: { type: String, trim: true, maxlength: 100 },
    instructions: { type: String, trim: true, maxlength: 500 },
    // Doctor acknowledged an allergy warning for this item
    allergyWarningAcknowledged: { type: Boolean, default: false },
  },
  { _id: true }
);

const prescriptionSchema = new mongoose.Schema(
  {
    rxNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    visitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit',
      required: true,
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
    },
    items: [rxItemSchema],
    prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dispensedAt: { type: Date },
    dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Prescription = mongoose.model('Prescription', prescriptionSchema);
export default Prescription;
