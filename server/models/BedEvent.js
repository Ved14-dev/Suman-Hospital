import mongoose from 'mongoose';

/**
 * BedEvent — Append-only ledger of bed status transitions and administrative actions.
 * No update or delete routes exist for this collection.
 */
const bedEventSchema = new mongoose.Schema(
  {
    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bed',
      required: true,
      index: true,
    },
    from: {
      type: String,
      enum: ['Available', 'Reserved', 'Occupied', 'Cleaning', 'Maintenance', 'None'],
      required: true,
    },
    to: {
      type: String,
      enum: ['Available', 'Reserved', 'Occupied', 'Cleaning', 'Maintenance'],
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    by: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String, trim: true },
      name: { type: String, trim: true },
    },
    at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    refs: {
      bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'BedBooking' },
      admissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission' },
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

bedEventSchema.index({ bedId: 1, at: -1 });

const BedEvent = mongoose.model('BedEvent', bedEventSchema);
export default BedEvent;
