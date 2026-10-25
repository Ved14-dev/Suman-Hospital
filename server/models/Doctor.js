import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
    },
    photo: {
      type: String,
      default: '',
    },
    isHOD: {
      type: Boolean,
      default: false,
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
    },
    qualification: {
      type: String,
      required: [true, 'Qualification is required'],
    },
    experience: {
      type: Number,
      required: [true, 'Experience in years is required'],
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department reference is required'],
    },
    consultationTimings: {
      type: String,
      required: true,
      default: 'Mon - Sat: 10:00 AM - 04:00 PM',
    },
    bio: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      default: 4.9,
    },
    availableDays: [
      {
        type: String,
      },
    ],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    availability: [
      {
        dayOfWeek: { type: Number, min: 0, max: 6, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        slotDurationMinutes: { type: Number, default: 30, min: 10 },
      },
    ],
    // Medical council registration number — shown on prescriptions and certificates
    registrationNumber: { type: String, trim: true, maxlength: 100 },
    // Consultation fee in paise (e.g. ₹500 = 50000)
    consultationFee: { type: Number, default: 0, min: 0 },
    isActive: {
      type: Boolean,
      default: true,
    },
    roomNumber: {
      type: String,
      default: 'OPD Block A, Room 102',
    },
  },
  { timestamps: true }
);

const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;
