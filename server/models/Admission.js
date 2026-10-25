import mongoose from 'mongoose';

/**
 * Admission — an IPD admission record.
 * Statuses: Admitted | Discharged.
 * Bed transfers are recorded in transfers[].
 *
 * Partial-day bed charge:
 *   Number of calendar days touched, with a day started counting as a full day.
 *   Stored in finalChargeSummary at discharge.
 */
const transferSchema = new mongoose.Schema(
  {
    fromBedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', required: true },
    toBedId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', required: true },
    at: { type: Date, default: Date.now },
    reason: { type: String, trim: true, maxlength: 500, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const dischargeSummarySchema = new mongoose.Schema(
  {
    finalDiagnosis: { type: String, trim: true, maxlength: 3000, required: true },
    treatmentGiven: { type: String, trim: true, maxlength: 5000, required: true },
    conditionAtDischarge: {
      type: String,
      enum: ['Stable', 'Improved', 'Critical', 'LAMA', 'Expired', 'Other'],
      required: true,
    },
    adviceOnDischarge: { type: String, trim: true, maxlength: 3000 },
    followUp: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const finalChargeSummarySchema = new mongoose.Schema(
  {
    days: { type: Number, required: true },
    dailyCharge: { type: Number, required: true }, // in paise
    total: { type: Number, required: true }, // in paise
  },
  { _id: false }
);

const admissionSchema = new mongoose.Schema(
  {
    admissionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BedBooking',
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    admittingDoctorId: {
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
    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bed',
      required: true,
      index: true,
    },
    admittedAt: { type: Date, default: Date.now },
    expectedDischargeDate: { type: Date },
    reasonForAdmission: { type: String, required: true, trim: true, maxlength: 2000 },
    provisionalDiagnosis: { type: String, trim: true, maxlength: 2000 },

    status: {
      type: String,
      enum: ['Admitted', 'Discharged'],
      default: 'Admitted',
      index: true,
    },
    dischargedAt: { type: Date },
    dischargeSummary: { type: dischargeSummarySchema },
    finalChargeSummary: { type: finalChargeSummarySchema },
    dischargeInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    // Admin override: discharge despite unpaid balance or non-admitting doctor discharge
    dischargeOverrideReason: { type: String, trim: true, maxlength: 500 },
    dischargedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    transfers: [transferSchema],
    admittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

admissionSchema.index({ patientId: 1, admittedAt: -1 });

const Admission = mongoose.model('Admission', admissionSchema);
export default Admission;
