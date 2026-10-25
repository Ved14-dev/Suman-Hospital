import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Appointment from '../models/Appointment.js';
import Department from '../models/Department.js';
import Enquiry from '../models/Enquiry.js';
import { getTodayIST } from '../utils/dateUtils.js';

export const stats = async (req, res) => {
  try {
    const today = getTodayIST();
    const [
      patientsCount,
      doctorsCount,
      todayAppointmentsCount,
      pendingAppointmentsCount,
      departmentsCount,
      activeQueueCount,
    ] = await Promise.all([
      Patient.countDocuments({ isActive: true }),
      Doctor.countDocuments({ isActive: true }),
      Appointment.countDocuments({ date: today }),
      Appointment.countDocuments({ status: 'Pending' }),
      Department.countDocuments(),
      Appointment.countDocuments({ date: today, queueStatus: { $in: ['Waiting', 'In Consultation'] } }),
    ]);

    res.json({
      success: true,
      data: {
        patients: patientsCount,
        doctors: doctorsCount,
        todayAppointments: todayAppointmentsCount,
        pendingAppointments: pendingAppointmentsCount,
        departments: departmentsCount,
        activeQueue: activeQueueCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin stats', error: error.message });
  }
};

export const listPatients = async (req, res) => {
  try {
    const query = {};
    if (req.query.search) {
      const term = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: new RegExp(term, 'i') },
        { phone: new RegExp(term, 'i') },
        { uhid: new RegExp(term, 'i') },
      ];
    }
    const patients = await Patient.find(query).sort({ createdAt: -1 }).populate('userId', 'email');
    res.json({ success: true, data: patients });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list patients', error: error.message });
  }
};

export const listDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find()
      .populate('department', 'name slug')
      .populate('userId', 'email isActive role');
    res.json({ success: true, data: doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list doctors', error: error.message });
  }
};

export const listAppointments = async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.date) query.date = req.query.date;
    const appointments = await Appointment.find(query)
      .populate('doctorId', 'name specialization roomNumber')
      .populate('departmentId', 'name')
      .populate('patientId', 'uhid name phone email gender approxAge')
      .sort({ date: -1, timeSlot: 1 });
    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list appointments', error: error.message });
  }
};

export const listEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    res.json({ success: true, data: enquiries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list enquiries', error: error.message });
  }
};

export const updateEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json({ success: true, data: enquiry });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update enquiry', error: error.message });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update appointment', error: error.message });
  }
};

export const listDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to list departments', error: error.message });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create department', error: error.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update department', error: error.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete department', error: error.message });
  }
};

export const createDoctor = async (req, res) => {
  try {
    const { email, password, ...profile } = req.body;
    const user = await User.create({
      name: profile.name,
      email: email.toLowerCase().trim(),
      role: 'doctor',
      passwordHash: await bcrypt.hash(password || 'password123', 12),
    });
    const doctor = await Doctor.create({ ...profile, userId: user._id });
    res.status(201).json({ success: true, data: doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create doctor', error: error.message });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update doctor', error: error.message });
  }
};

export const deactivateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (doctor?.userId) await User.findByIdAndUpdate(doctor.userId, { isActive: false });
    res.json({ success: true, data: doctor });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to deactivate doctor', error: error.message });
  }
};
