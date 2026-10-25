import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['admin', 'doctor', 'receptionist', 'pharmacist', 'nurse', 'patient'],
      required: true,
    },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    // HR / Staff fields
    employeeId: { type: String, trim: true, unique: true, sparse: true },
    joiningDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    // Set true by admin on first staff creation; clears on first successful password change
    forcePasswordChange: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
