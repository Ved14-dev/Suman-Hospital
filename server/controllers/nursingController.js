import NursingRecord from '../models/NursingRecord.js';
import Admission from '../models/Admission.js';
import Doctor from '../models/Doctor.js';
import ClinicalProfile from '../models/ClinicalProfile.js';
import Appointment from '../models/Appointment.js';
import { getTodayIST } from '../utils/dateUtils.js';
import {
  validateVitalsPlausibility,
  evaluateAbnormalVitals,
} from '../constants/clinicalThresholds.js';

/**
 * Add a new nursing record (Nurse only; Admin is read-only)
 */
export const addNursingRecord = async (req, res) => {
  try {
    if (req.user.role !== 'nurse') {
      return res.status(403).json({
        success: false,
        message: 'Only nurses can add nursing records. Doctors, admins, and receptionists are not permitted to add nursing notes.',
      });
    }

    const {
      patientId,
      admissionId,
      type,
      data = {},
      note = '',
      observedAt,
      observedReason = '',
      addendumOf,
    } = req.body;

    if (!patientId || !type) {
      return res.status(400).json({ success: false, message: 'patientId and type are required' });
    }

    const allowedTypes = ['Vitals', 'Observation', 'Medication', 'IntakeOutput', 'Procedure', 'Allergy'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `type must be one of: ${allowedTypes.join(', ')}` });
    }

    // Patient admission / OPD check
    let activeAdmission = null;
    if (admissionId) {
      activeAdmission = await Admission.findById(admissionId);
      if (!activeAdmission || activeAdmission.status !== 'Admitted') {
        return res.status(400).json({ success: false, message: 'Active admission not found for this patient' });
      }
    } else {
      // Check if patient currently has an active admission
      activeAdmission = await Admission.findOne({ patientId, status: 'Admitted' });
      if (!activeAdmission) {
        // If no admission, only OPD vitals for today's queue are allowed
        if (type !== 'Vitals') {
          return res.status(400).json({
            success: false,
            message: 'Patient is not currently admitted. Only vitals can be recorded for OPD queue patients.',
          });
        }
        const today = getTodayIST();
        const opdAppt = await Appointment.findOne({
          patientId,
          date: today,
          status: { $in: ['CheckedIn', 'Scheduled', 'InConsultation'] },
        });
        if (!opdAppt) {
          return res.status(400).json({
            success: false,
            message: 'Patient is neither currently admitted nor in today’s active OPD queue',
          });
        }
      }
    }

    // Timing validation: observedAt
    const now = Date.now();
    let observationDate = new Date();
    if (observedAt) {
      const obsTime = new Date(observedAt).getTime();
      if (Number.isNaN(obsTime)) {
        return res.status(400).json({ success: false, message: 'Invalid observedAt timestamp' });
      }
      if (obsTime > now + 60000) {
        return res.status(400).json({ success: false, message: 'Observation time cannot be in the future' });
      }
      const twelveHoursAgo = now - 12 * 60 * 60 * 1000;
      if (obsTime < twelveHoursAgo) {
        return res.status(400).json({
          success: false,
          message: 'Observation time cannot be back-dated by more than 12 hours',
        });
      }
      // If backdated by more than 15 minutes, require a reason
      if (obsTime < now - 15 * 60 * 1000 && !observedReason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'A reason is required when back-dating observations by more than 15 minutes',
        });
      }
      observationDate = new Date(obsTime);
    }

    // Addendum validation
    if (addendumOf) {
      const original = await NursingRecord.findById(addendumOf);
      if (!original) {
        return res.status(404).json({ success: false, message: 'Original nursing record for addendum not found' });
      }
      if (!original.patientId.equals(patientId)) {
        return res.status(400).json({ success: false, message: 'Addendum must belong to the same patient' });
      }
    }

    // Type-specific validation and abnormal evaluation
    let abnormal = false;
    let abnormalFlags = [];

    if (type === 'Vitals') {
      const plausibilityErrors = validateVitalsPlausibility(data);
      if (plausibilityErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: plausibilityErrors.join('; '),
          errors: plausibilityErrors,
        });
      }
      const evalResult = evaluateAbnormalVitals(data);
      abnormal = evalResult.abnormal;
      abnormalFlags = evalResult.abnormalFlags;
    } else if (type === 'Allergy') {
      if (!data.substance?.trim()) {
        return res.status(400).json({ success: false, message: 'Allergy substance is required' });
      }
      // Save allergy into patient ClinicalProfile with verified: false
      let profile = await ClinicalProfile.findOne({ patientId });
      if (!profile) {
        profile = new ClinicalProfile({ patientId, allergies: [] });
      }
      profile.allergies.push({
        substance: data.substance.trim(),
        reaction: data.reaction || '',
        severity: data.severity || 'Unknown',
        verified: false,
        reportedByNurse: true,
        reportedBy: req.user._id,
        reportedAt: new Date(),
      });
      await profile.save();
    } else if (type === 'Medication') {
      if (!data.medicineName?.trim() || !data.dose?.trim()) {
        return res.status(400).json({ success: false, message: 'medicineName and dose are required' });
      }
    }

    const record = await NursingRecord.create({
      patientId,
      admissionId: activeAdmission?._id || undefined,
      type,
      data,
      note,
      observedAt: observationDate,
      observedReason,
      recordedBy: req.user._id,
      recordedAt: new Date(),
      addendumOf: addendumOf || undefined,
      abnormal,
      abnormalFlags,
    });

    const populated = await NursingRecord.findById(record._id)
      .populate('recordedBy', 'name role')
      .populate('addendumOf');

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Helper: checks if user has permission to read patient nursing records
 */
const canReadNursingRecords = async (user, patientId, admissionId) => {
  if (['admin', 'nurse'].includes(user.role)) return true;

  if (user.role === 'doctor') {
    const doc = await Doctor.findOne({ userId: user._id });
    if (!doc) return false;

    // Doctor can only read if patient is their admitted patient
    if (admissionId) {
      const adm = await Admission.findById(admissionId);
      return adm && adm.admittingDoctorId.equals(doc._id);
    }
    const hasAdmission = await Admission.findOne({
      patientId,
      admittingDoctorId: doc._id,
    });
    return Boolean(hasAdmission);
  }

  // Patient and Receptionist are strictly forbidden (403)
  return false;
};

/**
 * List nursing records for an admission (Timeline, newest first)
 */
export const getAdmissionNursingRecords = async (req, res) => {
  try {
    const { admissionId } = req.params;
    const admission = await Admission.findById(admissionId);
    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission not found' });
    }

    const allowed = await canReadNursingRecords(req.user, admission.patientId, admission._id);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to read nursing records for this patient',
      });
    }

    const q = { admissionId };
    if (req.query.type) q.type = req.query.type;

    const records = await NursingRecord.find(q)
      .populate('recordedBy', 'name role')
      .populate('acknowledgedBy', 'name role')
      .populate({
        path: 'addendumOf',
        populate: { path: 'recordedBy', select: 'name role' },
      })
      .sort({ observedAt: -1 });

    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * List nursing records for a patient
 */
export const getPatientNursingRecords = async (req, res) => {
  try {
    const { patientId } = req.params;
    const allowed = await canReadNursingRecords(req.user, patientId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to read nursing records for this patient',
      });
    }

    const q = { patientId };
    if (req.query.type) q.type = req.query.type;

    const records = await NursingRecord.find(q)
      .populate('recordedBy', 'name role')
      .populate('acknowledgedBy', 'name role')
      .populate('admissionId', 'admissionNumber status')
      .sort({ observedAt: -1 });

    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Doctor's "Needs Review" queue — abnormal, unacknowledged records for doctor's in-patients
 */
export const getDoctorNeedsReview = async (req, res) => {
  try {
    if (!['doctor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only doctors and admins can access review queue' });
    }

    let admissionFilter = {};
    if (req.user.role === 'doctor') {
      const doc = await Doctor.findOne({ userId: req.user._id });
      if (!doc) {
        return res.json({ success: true, data: [] });
      }
      const myAdmissions = await Admission.find({
        admittingDoctorId: doc._id,
        status: 'Admitted',
      }).select('_id');
      const admissionIds = myAdmissions.map((a) => a._id);
      admissionFilter = { admissionId: { $in: admissionIds } };
    } else {
      // Admin sees all active admissions with abnormal flags
      const activeAdmissions = await Admission.find({ status: 'Admitted' }).select('_id');
      admissionFilter = { admissionId: { $in: activeAdmissions.map((a) => a._id) } };
    }

    const unacknowledged = await NursingRecord.find({
      ...admissionFilter,
      abnormal: true,
      acknowledgedBy: null,
    })
      .populate('patientId', 'uhid name')
      .populate('admissionId', 'admissionNumber')
      .populate('recordedBy', 'name role')
      .sort({ observedAt: -1 });

    res.json({ success: true, data: unacknowledged });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Acknowledge an abnormal nursing entry (Doctor or Admin)
 */
export const acknowledgeNursingRecord = async (req, res) => {
  try {
    if (!['doctor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only doctors and admins can acknowledge abnormal records' });
    }

    const { id } = req.params;
    const record = await NursingRecord.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Nursing record not found' });
    }

    if (!record.abnormal) {
      return res.status(400).json({ success: false, message: 'Only abnormal records require acknowledgment' });
    }

    record.acknowledgedBy = req.user._id;
    record.acknowledgedAt = new Date();
    await record.save();

    const updated = await NursingRecord.findById(id)
      .populate('recordedBy', 'name role')
      .populate('acknowledgedBy', 'name role');

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Rejection of edit/delete operations — NursingRecord is strictly append-only
 */
export const rejectNursingRecordMutation = async (req, res) => {
  return res.status(405).json({
    success: false,
    message: 'Nursing records are strictly append-only. Edits and deletes are forbidden. Submit an addendum referencing this record instead.',
  });
};
