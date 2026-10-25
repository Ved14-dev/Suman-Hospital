import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
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
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    timeSlot: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      enum: ['online', 'walk-in'],
      default: 'online',
      index: true,
    },
    tokenNumber: {
      type: Number,
      default: null,
    },
    queueStatus: {
      type: String,
      enum: ['Not Arrived', 'Waiting', 'In Consultation', 'Completed', 'No-show', 'Cancelled'],
      default: 'Not Arrived',
      index: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled', 'No-show'],
      default: 'Pending',
      index: true,
    },
    checkedInAt: {
      type: Date,
    },
    calledAt: {
      type: Date,
    },
    consultationStartedAt: {
      type: Date,
    },
    consultationEndedAt: {
      type: Date,
    },
    reasonForVisit: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    consultationNotes: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    rescheduledFromId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    rescheduledToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Unique slot index for online bookings (Pending or Confirmed).
// When cancelled or marked no-show, the slot is released if the time hasn't passed.
appointmentSchema.index(
  { doctorId: 1, date: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: {
      source: 'online',
      status: { $in: ['Pending', 'Confirmed'] },
    },
  }
);

// Unique daily token number per doctor per date
appointmentSchema.index(
  { doctorId: 1, date: 1, tokenNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { tokenNumber: { $gt: 0 } },
  }
);

// Fast queue lookup index
appointmentSchema.index({ doctorId: 1, date: 1, queueStatus: 1, tokenNumber: 1 });
appointmentSchema.index({ patientId: 1, date: -1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
