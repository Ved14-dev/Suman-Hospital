import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import { signToken } from '../middleware/auth.js';
import { getNextUHID } from '../utils/counter.js';

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
});

export const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and a password of at least 6 characters are required',
      });
    }

    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      phone,
      role: 'patient',
      passwordHash,
    });

    // Check if an existing unlinked patient record with the same phone and name exists (e.g. from front desk)
    let patient = null;
    if (phone) {
      patient = await Patient.findOne({
        phone: phone.trim(),
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        userId: { $exists: false },
      });
    }

    if (patient) {
      // Auto-link existing patient record
      patient.userId = user._id;
      if (!patient.email) patient.email = email.toLowerCase();
      await patient.save();
    } else {
      // Create new patient record with atomic UHID
      const uhid = await getNextUHID();
      patient = await Patient.create({
        uhid,
        name: name.trim(),
        email: email.toLowerCase(),
        phone: phone ? phone.trim() : 'N/A',
        userId: user._id,
        registeredAt: new Date(),
      });
    }

    res.status(201).json({
      success: true,
      token: signToken(user),
      user: publicUser(user),
      patientId: patient._id,
      uhid: patient.uhid,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to register account',
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select('+passwordHash');
    if (!user || !user.isActive || !(await bcrypt.compare(password || '', user.passwordHash))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // If patient, ensure they have a Patient record with UHID
    let patientInfo = null;
    if (user.role === 'patient') {
      let patient = await Patient.findOne({ userId: user._id });
      if (!patient) {
        // Auto-create patient record if missing
        const uhid = await getNextUHID();
        patient = await Patient.create({
          uhid,
          name: user.name,
          email: user.email,
          phone: user.phone || 'N/A',
          userId: user._id,
          registeredAt: new Date(),
        });
      }
      patientInfo = { id: patient._id, uhid: patient.uhid };
    }

    res.json({
      success: true,
      token: signToken(user),
      user: publicUser(user),
      patient: patientInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to sign in',
      error: error.message,
    });
  }
};

export const me = async (req, res) => {
  let patientInfo = null;
  if (req.user.role === 'patient') {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (patient) {
      patientInfo = { id: patient._id, uhid: patient.uhid };
    }
  }
  res.json({
    success: true,
    user: publicUser(req.user),
    patient: patientInfo,
  });
};

export const logout = (req, res) => res.json({ success: true, message: 'Signed out' });
