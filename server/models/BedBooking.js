import mongoose from 'mongoose';

/**
 * BedBooking — Tracks IPD bed requests, approvals, holds, and eventual admission or cancellation.
 */
const bedBookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    requestedByRole: {
      type: String,
      enum: ['patient', 'receptionist', 'doctor', 'admin'],
      required: true,
    },
    requestedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    wardType: {
      type: String,
      enum: ['General', 'Pediatric', 'Maternity/Gynae', 'Private'],
      required: true,
    },
    expectedDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['Requested', 'Approved', 'Admitted', 'Rejected', 'Cancelled', 'Expired'],
      default: 'Requested',
      index: true,
    },
    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bed',
    },
    holdUntil: {
      type: Date,
    },
    decisionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    decisionAt: {
      type: Date,
    },
    decisionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    admissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
    },
  },
  { timestamps: true }
);

bedBookingSchema.index({ patientId: 1, status: 1 });
bedBookingSchema.index({ expectedDate: 1, status: 1 });

const BedBooking = mongoose.model('BedBooking', bedBookingSchema);
export default BedBooking;
