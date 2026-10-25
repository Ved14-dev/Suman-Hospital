/**
 * Staff Controller — User/Staff management for all roles
 * Suman Multispecialty Hospital
 *
 * Admin can create/edit/deactivate any staff member.
 * Creating staff auto-generates an employeeId (atomic counter) and a
 * temporary password, and sets forcePasswordChange=true.
 * Deactivating a staff member immediately blocks login (isActive check in auth middleware).
 * Each staff member can view their own profile and change their password.
 * Doctors additionally have a Doctor record with registration number and fee.
 */

import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import { getNextEmployeeId } from '../utils/counter.js';

// ─── Staff List & Detail ──────────────────────────────────────────────────────

export const listStaff = async (req, res) => {
  try {
    const q = {};
    if (req.query.role) q.role = req.query.role;
    if (req.query.active !== 'false') q.isActive = true;

    // Exclude patient accounts from staff list
    q.role = req.query.role ? req.query.role : { $in: ['admin', 'doctor', 'receptionist', 'pharmacist', 'nurse'] };

    const staff = await User.find(q)
      .select('-passwordHash')
      .sort({ role: 1, name: 1 });

    // For doctors, attach their Doctor profile
    const doctorIds = staff.filter((s) => s.role === 'doctor').map((s) => s._id);
    const doctorProfiles = doctorIds.length
      ? await Doctor.find({ userId: { $in: doctorIds } }).populate('department', 'name slug')
      : [];
    const doctorMap = {};
    doctorProfiles.forEach((d) => { doctorMap[d.userId.toString()] = d; });

    const result = staff.map((s) => ({
      ...s.toObject(),
      doctorProfile: doctorMap[s._id.toString()] || null,
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getStaffMember = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'Staff member not found' });

    // Staff can only view their own profile (unless admin)
    if (req.user.role !== 'admin' && !req.user._id.equals(user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    let doctorProfile = null;
    if (user.role === 'doctor') {
      doctorProfile = await Doctor.findOne({ userId: user._id }).populate('department', 'name slug');
    }
    res.json({ success: true, data: { ...user.toObject(), doctorProfile } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Create Staff ─────────────────────────────────────────────────────────────

export const createStaff = async (req, res) => {
  try {
    const { email, role, name, phone, joiningDate, doctorProfile } = req.body;
    const validRoles = ['admin', 'doctor', 'receptionist', 'pharmacist', 'nurse'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Role must be one of: ${validRoles.join(', ')}` });
    }
    if (!email || !name || !role) {
      return res.status(400).json({ success: false, message: 'name, email, role are required' });
    }

    const employeeId = await getNextEmployeeId();
    // Temporary password: SMH + last 4 of employeeId + !
    const tempPassword = `SMH${employeeId.slice(-4)}!`;
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      phone,
      employeeId,
      joiningDate: joiningDate || undefined,
      forcePasswordChange: true,
      isActive: true,
    });

    let doctor = null;
    if (role === 'doctor' && doctorProfile) {
      doctor = await Doctor.create({
        ...doctorProfile,
        userId: user._id,
      });
    }

    res.status(201).json({
      success: true,
      data: { user: { ...user.toObject(), passwordHash: undefined }, doctor },
      tempPassword, // Caller must display this once to admin for handover
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Update Staff ─────────────────────────────────────────────────────────────

export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user._id.toString() === id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const allowedByAdmin = ['name', 'phone', 'joiningDate', 'isActive'];
    const allowedBySelf = ['phone'];
    const allowed = isAdmin ? allowedByAdmin : allowedBySelf;

    const update = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    });

    const user = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'Staff member not found' });

    // Update doctor profile (admin or self if doctor)
    if ((isAdmin || isSelf) && req.body.doctorProfile && user.role === 'doctor') {
      const allowedDoctorFields = isAdmin
        ? ['name', 'specialization', 'qualification', 'registrationNumber', 'consultationFee', 'availability', 'roomNumber', 'isActive', 'isHOD', 'department']
        : ['bio', 'availability', 'roomNumber']; // doctors can edit limited fields

      const doctorUpdate = {};
      allowedDoctorFields.forEach((f) => {
        if (req.body.doctorProfile[f] !== undefined) doctorUpdate[f] = req.body.doctorProfile[f];
      });
      if (Object.keys(doctorUpdate).length) {
        await Doctor.findOneAndUpdate({ userId: id }, doctorUpdate, { runValidators: true });
      }
    }

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Deactivate Staff ─────────────────────────────────────────────────────────

export const deactivateStaff = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'Staff member not found' });

    // If doctor, also deactivate their Doctor profile
    if (user.role === 'doctor') {
      await Doctor.findOneAndUpdate({ userId: user._id }, { isActive: false });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const reactivateStaff = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'Staff member not found' });
    if (user.role === 'doctor') {
      await Doctor.findOneAndUpdate({ userId: user._id }, { isActive: true });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Change Password ──────────────────────────────────────────────────────────

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // If not forced change, verify current password
    if (!user.forcePasswordChange) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'currentPassword is required' });
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.forcePasswordChange = false;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── My Profile ───────────────────────────────────────────────────────────────

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    let doctorProfile = null;
    if (user.role === 'doctor') {
      doctorProfile = await Doctor.findOne({ userId: user._id }).populate('department', 'name slug');
    }
    let patientProfile = null;
    if (user.role === 'patient') {
      patientProfile = await Patient.findOne({ userId: user._id });
    }
    res.json({ success: true, data: { user, doctorProfile, patientProfile } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
