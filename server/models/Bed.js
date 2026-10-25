import mongoose from 'mongoose';

/**
 * Bed — a physical bed within a ward.
 * Status transitions:
 *   Available -> Reserved (hold)
 *   Available -> Occupied (direct admit)
 *   Available -> Maintenance
 *   Reserved -> Occupied (admit from booking)
 *   Reserved -> Available (release/cancel/expire)
 *   Occupied -> Cleaning (discharge/transfer out)
 *   Cleaning -> Available (nurse or admin action)
 *   Maintenance -> Available (admin action with note)
 *
 * Occupied cannot go to Maintenance (transfer or discharge first).
 *
 * Two simultaneous admissions or holds can never take the same bed (enforced
 * by atomic findOneAndUpdate with expected status filter).
 *
 * dailyCharge: stored in integer paise (e.g. ₹1500/day = 150000 paise).
 */
const bedSchema = new mongoose.Schema(
  {
    wardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ward',
      required: true,
      index: true,
    },
    bedNumber: { type: String, required: true, trim: true, maxlength: 20 },
    status: {
      type: String,
      enum: ['Available', 'Reserved', 'Occupied', 'Cleaning', 'Maintenance'],
      default: 'Available',
      index: true,
    },
    // dailyCharge in paise (e.g. ₹1500/day = 150000 paise)
    dailyCharge: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    // If bed is temporarily reserved/held for a booking
    heldForBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BedBooking',
      default: null,
    },
    holdUntil: {
      type: Date,
      default: null,
    },
    // Denormalised reference to current admission for quick lookup
    currentAdmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
      default: null,
    },
    maintenanceReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// bedNumber must be unique within a ward
bedSchema.index({ wardId: 1, bedNumber: 1 }, { unique: true });

const Bed = mongoose.model('Bed', bedSchema);
export default Bed;
