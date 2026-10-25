import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import { getNextUHID } from '../utils/counter.js';
import { hasPermission } from '../utils/permissions.js';

/**
 * List patients with pagination, search, and sorting
 * GET /api/patients
 */
export const listPatients = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by active status (default to active unless specified)
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true' || req.query.isActive === true;
    }

    // Search query on name, phone, or UHID
    if (req.query.search) {
      const term = req.query.search.trim();
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { uhid: { $regex: escaped, $options: 'i' } },
        { name: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];
    }

    // If pharmacist, restrict fields
    const isPharmacist = req.user.role === 'pharmacist';
    const projection = isPharmacist
      ? 'uhid name gender approxAge dob phone allergies bloodGroup isActive'
      : '';

    const [total, patients] = await Promise.all([
      Patient.countDocuments(query),
      Patient.find(query, projection)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('registeredBy', 'name role')
        .populate('userId', 'email'),
    ]);

    res.json({
      success: true,
      data: {
        patients,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve patients',
      error: error.message,
    });
  }
};

/**
 * Fast autocomplete search for topbar (UHID, Name, Phone)
 * GET /api/patients/quick-search?q=...
 */
export const quickSearchPatients = async (req, res) => {
  try {
    const term = (req.query.q || '').trim();
    if (!term || term.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patients = await Patient.find({
      isActive: true,
      $or: [
        { uhid: { $regex: escaped, $options: 'i' } },
        { name: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ],
    })
      .select('uhid name phone gender approxAge dob')
      .limit(8);

    res.json({ success: true, data: patients });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Quick search failed',
      error: error.message,
    });
  }
};

/**
 * Get patient profile by ID
 * Includes visits timeline, clinical tags, appointments
 * GET /api/patients/:id
 */
export const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('registeredBy', 'name role')
      .populate('userId', 'email');

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient record not found' });
    }

    // Role verification: Patient can only view their own record
    if (req.user.role === 'patient') {
      if (!patient.userId || patient.userId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You may only view your own medical record.',
        });
      }
    }

    // Fetch visits timeline (Appointments & OPD visits)
    const appointments = await Appointment.find({ patientId: patient._id })
      .populate('doctorId', 'name specialization roomNumber')
      .populate('departmentId', 'name slug')
      .sort({ date: -1, createdAt: -1 });

    // Privacy rule: A doctor must never read clinical notes written by other doctors unless permitted
    const sanitizedAppointments = appointments.map((apt) => {
      const aptObj = apt.toObject();
      if (req.user.role === 'doctor') {
        // If current doctor did not conduct this consultation, redact consultationNotes
        if (
          apt.doctorId &&
          apt.doctorId._id.toString() !== req.doctorProfile?._id?.toString()
        ) {
          aptObj.consultationNotes = '[Protected clinical notes: different attending physician]';
        }
      }
      return aptObj;
    });

    res.json({
      success: true,
      data: {
        patient,
        visits: sanitizedAppointments,
        appointments: sanitizedAppointments,
        history: {
          noShowCount: patient.noShowCount || 0,
          cancellationCount: patient.cancellationCount || 0,
          totalVisits: appointments.filter((a) => a.status === 'Completed').length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve patient profile',
      error: error.message,
    });
  }
};

/**
 * Register a new patient (Front desk / Receptionist / Admin)
 * POST /api/patients
 */
export const createPatient = async (req, res) => {
  try {
    const {
      name,
      dob,
      approxAge,
      gender,
      phone,
      alternatePhone,
      email,
      address,
      bloodGroup,
      emergencyContact,
      allergies,
      chronicConditions,
      overrideDuplicate,
      overrideReason,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Patient name and primary phone number are required.',
      });
    }

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    // Duplicate prevention check
    const duplicateQuery = {
      isActive: true,
      $or: [
        {
          phone: cleanPhone,
          name: { $regex: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        },
      ],
    };

    if (dob) {
      duplicateQuery.$or.push({ phone: cleanPhone, dob });
    }

    const existing = await Patient.findOne(duplicateQuery);

    if (existing && !overrideDuplicate) {
      return res.status(409).json({
        success: false,
        duplicateWarning: true,
        existingPatient: {
          id: existing._id,
          uhid: existing.uhid,
          name: existing.name,
          phone: existing.phone,
          dob: existing.dob,
          approxAge: existing.approxAge,
        },
        message: `Warning: A patient with name "${existing.name}" and phone "${existing.phone}" is already registered (UHID: ${existing.uhid}). Confirm override if this is a distinct patient.`,
      });
    }

    // Generate atomic UHID
    const uhid = await getNextUHID();

    const newPatient = await Patient.create({
      uhid,
      name: cleanName,
      dob: dob || undefined,
      approxAge: approxAge !== undefined ? Number(approxAge) : undefined,
      gender: gender || 'Other',
      phone: cleanPhone,
      alternatePhone: alternatePhone ? alternatePhone.trim() : undefined,
      email: email ? email.toLowerCase().trim() : undefined,
      address: address ? address.trim() : undefined,
      bloodGroup: bloodGroup || 'Unknown',
      emergencyContact: emergencyContact || {},
      allergies: Array.isArray(allergies) ? allergies.filter(Boolean) : [],
      chronicConditions: Array.isArray(chronicConditions) ? chronicConditions.filter(Boolean) : [],
      registeredBy: req.user._id,
      registeredAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      data: newPatient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create patient record',
      error: error.message,
    });
  }
};

/**
 * Update patient profile details
 * PATCH /api/patients/:id
 */
export const updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Role check: Patient can only edit own contact/emergency; receptionist/admin can edit demographic
    if (req.user.role === 'patient') {
      if (!patient.userId || patient.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized profile update' });
      }
      // Patients can only update emergencyContact and address
      if (req.body.emergencyContact) patient.emergencyContact = req.body.emergencyContact;
      if (req.body.address) patient.address = req.body.address;
    } else if (['admin', 'receptionist'].includes(req.user.role)) {
      const allowedFields = [
        'name',
        'dob',
        'approxAge',
        'gender',
        'phone',
        'alternatePhone',
        'email',
        'address',
        'bloodGroup',
        'emergencyContact',
        'allergies',
        'chronicConditions',
      ];
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          patient[field] = req.body[field];
        }
      });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only the patient, receptionist, or admin may update patient demographics',
      });
    }

    await patient.save();
    res.json({ success: true, message: 'Patient updated successfully', data: patient });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to update patient',
      error: error.message,
    });
  }
};

/**
 * Soft delete / Deactivate patient
 * PATCH /api/patients/:id/deactivate
 */
export const deactivatePatient = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A deactivation reason is required.',
      });
    }

    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        deactivatedReason: reason.trim(),
      },
      { new: true }
    );

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.json({
      success: true,
      message: 'Patient deactivated successfully (soft delete)',
      data: patient,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate patient',
      error: error.message,
    });
  }
};

/**
 * Get current logged in patient profile
 * GET /api/patients/me
 */
export const getMyProfile = async (req, res) => {
  try {
    let patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      // Auto-create with UHID if user is patient
      const uhid = await getNextUHID();
      patient = await Patient.create({
        uhid,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone || 'N/A',
        userId: req.user._id,
        registeredAt: new Date(),
      });
    }

    const appointments = await Appointment.find({ patientId: patient._id })
      .populate('doctorId', 'name specialization roomNumber')
      .populate('departmentId', 'name slug')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: {
        patient,
        appointments,
        history: {
          noShowCount: patient.noShowCount || 0,
          cancellationCount: patient.cancellationCount || 0,
          totalVisits: appointments.filter((a) => a.status === 'Completed').length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to fetch patient profile',
      error: error.message,
    });
  }
};
