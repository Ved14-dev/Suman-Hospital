/**
 * EMR Controller — Clinical Visits, Prescriptions, Clinical Profiles, Medical Certificates
 * Suman Multispecialty Hospital
 *
 * Rules enforced:
 * - Finalized visits are locked. Edits create an amendment entry with who/when/why.
 * - Rx allergy checking: case-insensitive string match on medicine name/genericName vs
 *   patient allergy substance. Limitation: does not cover cross-reactive compounds or synonyms.
 * - Free-text medicines (not in master) are flagged with isFreetextItem=true.
 * - Stock never goes negative on dispense (enforced in pharmacy controller).
 */

import Visit from '../models/Visit.js';
import Prescription from '../models/Prescription.js';
import ClinicalProfile from '../models/ClinicalProfile.js';
import MedicalCertificate from '../models/MedicalCertificate.js';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import Medicine from '../models/Medicine.js';
import Appointment from '../models/Appointment.js';
import { getNextRxNumber, getNextCertificateNumber } from '../utils/counter.js';
import { getTodayIST } from '../utils/dateUtils.js';

const getPatientForUser = (userId) => Patient.findOne({ userId }).select('_id');

const canAccessPatient = async (req, patientId) => {
  if (req.user.role !== 'patient') return true;
  const patient = await getPatientForUser(req.user._id);
  const requestedPatientId = patientId?._id || patientId;
  return Boolean(patient && patient._id.toString() === requestedPatientId.toString());
};

const getDoctorProfileForUser = (userId) => Doctor.findOne({ userId }).select('_id');

const canAccessVisit = async (req, visit) => {
  if (req.user.role !== 'doctor') return true;
  const doctor = await getDoctorProfileForUser(req.user._id);
  const visitDoctorId = visit.doctorId?._id || visit.doctorId;
  return Boolean(doctor && visitDoctorId && visitDoctorId.toString() === doctor._id.toString());
};

// ─── Visits ──────────────────────────────────────────────────────────────────

export const createVisit = async (req, res) => {
  try {
    const { appointmentId, patientId, doctorId, departmentId, visitDate, ...rest } = req.body;
    if (!patientId || !doctorId || !departmentId) {
      return res.status(400).json({ success: false, message: 'patientId, doctorId, departmentId are required' });
    }
    if (req.user.role === 'doctor') {
      const doctor = await getDoctorProfileForUser(req.user._id);
      if (!doctor || doctor._id.toString() !== doctorId.toString()) {
        return res.status(403).json({ success: false, message: 'Doctors may create visits only for their own consultations' });
      }
    }
    const today = getTodayIST();
    const visit = await Visit.create({
      appointmentId: appointmentId || undefined,
      patientId,
      doctorId,
      departmentId,
      visitDate: visitDate || today,
      createdBy: req.user._id,
      ...rest,
    });
    res.status(201).json({ success: true, data: visit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getVisit = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id)
      .populate('patientId', 'uhid name dob approxAge gender phone bloodGroup')
      .populate('doctorId', 'name specialization qualification registrationNumber')
      .populate('departmentId', 'name')
      .populate('createdBy', 'name role')
      .populate('finalizedBy', 'name role')
      .populate('amendments.amendedBy', 'name role');
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

    // Patients may only view their own finalized visits
    if (req.user.role === 'patient') {
      if (visit.status !== 'Finalized' || !(await canAccessPatient(req, visit.patientId._id))) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
    if (!(await canAccessVisit(req, visit))) {
      return res.status(403).json({ success: false, message: 'Doctors may only access their own clinical notes' });
    }
    res.json({ success: true, data: visit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateVisit = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

    if (!(await canAccessVisit(req, visit))) {
      return res.status(403).json({ success: false, message: 'Doctors may only edit their own clinical notes' });
    }
    if (visit.status === 'Finalized') {
      // Finalized visits cannot be silently edited — must use amendment endpoint
      return res.status(400).json({
        success: false,
        message: 'Finalized visits cannot be edited. Use the amendment endpoint instead.',
      });
    }
    const allowedFields = req.user.role === 'nurse'
      ? ['vitals', 'vitalsEnteredBy']
      : [
      'chiefComplaint', 'vitals', 'vitalsEnteredBy', 'examination', 'diagnosis',
      'diagnosisCode', 'consultationNotes', 'advice', 'followUpDate', 'gynTherapyPlan',
      ];
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) visit[f] = req.body[f];
    });
    await visit.save();
    res.json({ success: true, data: visit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const finalizeVisit = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });
    if (!(await canAccessVisit(req, visit))) {
      return res.status(403).json({ success: false, message: 'Doctors may only finalize their own clinical notes' });
    }
    if (visit.status === 'Finalized') {
      return res.status(400).json({ success: false, message: 'Visit is already finalized' });
    }
    visit.status = 'Finalized';
    visit.finalizedAt = new Date();
    visit.finalizedBy = req.user._id;
    await visit.save();
    res.json({ success: true, data: visit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addAmendment = async (req, res) => {
  try {
    const { reason, fieldChanged, previousValue, newValue } = req.body;
    if (!reason || !fieldChanged) {
      return res.status(400).json({ success: false, message: 'reason and fieldChanged are required' });
    }
    const visit = await Visit.findById(req.params.id);
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });
    if (visit.status !== 'Finalized') {
      return res.status(400).json({ success: false, message: 'Amendments can only be added to Finalized visits' });
    }
    if (!(await canAccessVisit(req, visit))) {
      return res.status(403).json({ success: false, message: 'Doctors may only amend their own clinical notes' });
    }
    // Only the original doctor or admin can amend
    if (req.user.role !== 'admin' && !visit.doctorId.equals(req.user._id) && !visit.createdBy?.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the visit doctor or admin can amend this visit' });
    }
    visit.amendments.push({ amendedBy: req.user._id, reason, fieldChanged, previousValue, newValue });
    await visit.save();
    res.json({ success: true, data: visit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPatientVisits = async (req, res) => {
  try {
    const { patientId } = req.params;
    const query = { patientId };
    // Patients see only their own finalized visits
    if (req.user.role === 'patient') {
      if (!(await canAccessPatient(req, patientId))) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      query.status = 'Finalized';
    } else if (req.user.role === 'doctor') {
      const doctor = await getDoctorProfileForUser(req.user._id);
      if (!doctor) return res.status(403).json({ success: false, message: 'Doctor profile not found' });
      query.doctorId = doctor._id;
    }
    const visits = await Visit.find(query)
      .populate('doctorId', 'name specialization')
      .populate('departmentId', 'name')
      .sort({ visitDate: -1, createdAt: -1 })
      .lean();
    res.json({ success: true, data: visits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Prescriptions ────────────────────────────────────────────────────────────

/**
 * Check a list of rx items against the patient's allergies.
 * Returns allergy warnings as an array of {medicineIndex, substance, matchType}.
 * LIMITATION: Only simple case-insensitive string match on name/genericName vs
 * allergy.substance. Cross-reactive compounds or synonyms are not detected.
 */
const checkAllergyWarnings = (rxItems, allergies) => {
  const warnings = [];
  rxItems.forEach((item, idx) => {
    allergies.forEach((allergy) => {
      const substanceLower = allergy.substance.toLowerCase();
      const nameLower = (item.medicineName || '').toLowerCase();
      const genericLower = (item.genericName || '').toLowerCase();
      if (nameLower.includes(substanceLower) || substanceLower.includes(nameLower) ||
          (genericLower && (genericLower.includes(substanceLower) || substanceLower.includes(genericLower)))) {
        warnings.push({
          medicineIndex: idx,
          medicineName: item.medicineName,
          substance: allergy.substance,
          severity: allergy.severity,
          reaction: allergy.reaction,
        });
      }
    });
  });
  return warnings;
};

export const createPrescription = async (req, res) => {
  try {
    const { visitId, items } = req.body;
    if (!visitId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'visitId and items[] are required' });
    }

    const visit = await Visit.findById(visitId).populate('patientId');
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });
    if (!(await canAccessVisit(req, visit))) {
      return res.status(403).json({ success: false, message: 'Doctors may only prescribe for their own visits' });
    }

    // Check unacknowledged allergy warnings
    const profile = await ClinicalProfile.findOne({ patientId: visit.patientId._id });
    const allergies = profile?.allergies || [];
    const warnings = checkAllergyWarnings(items, allergies);
    const unacknowledged = warnings.filter((w) => {
      const item = items[w.medicineIndex];
      return !item.allergyWarningAcknowledged;
    });

    if (unacknowledged.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Allergy warnings require acknowledgement before prescribing',
        allergyWarnings: unacknowledged,
      });
    }

    const rxNumber = await getNextRxNumber();
    const prescription = await Prescription.create({
      rxNumber,
      visitId,
      patientId: visit.patientId._id,
      doctorId: visit.doctorId,
      items,
      prescribedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: prescription });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPrescription = async (req, res) => {
  try {
    const rx = await Prescription.findById(req.params.id)
      .populate('visitId', 'visitDate diagnosis advice')
      .populate('patientId', 'uhid name dob approxAge gender phone')
      .populate('doctorId', 'name qualification specialization registrationNumber')
      .populate('prescribedBy', 'name role')
      .populate('items.medicineId', 'name genericName form strength');

    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found' });

    if (req.user.role === 'patient') {
      if (!(await canAccessPatient(req, rx.patientId._id))) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
    res.json({ success: true, data: rx });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getVisitPrescriptions = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.visitId).select('patientId doctorId status');
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });
    if (req.user.role === 'patient' && (visit.status !== 'Finalized' || !(await canAccessPatient(req, visit.patientId)))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (!(await canAccessVisit(req, visit))) {
      return res.status(403).json({ success: false, message: 'Doctors may only access their own prescriptions' });
    }
    const prescriptions = await Prescription.find({ visitId: req.params.visitId })
      .populate('items.medicineId', 'name genericName form strength')
      .populate('prescribedBy', 'name role')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: prescriptions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPatientPrescriptions = async (req, res) => {
  try {
    if (!(await canAccessPatient(req, req.params.patientId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const query = { patientId: req.params.patientId };
    if (req.user.role === 'patient') {
      const visits = await Visit.find({ patientId: req.params.patientId, status: 'Finalized' }).select('_id');
      query.visitId = { $in: visits.map((visit) => visit._id) };
    } else if (req.user.role === 'doctor') {
      const doctor = await getDoctorProfileForUser(req.user._id);
      if (!doctor) return res.status(403).json({ success: false, message: 'Doctor profile not found' });
      query.doctorId = doctor._id;
    }
    const prescriptions = await Prescription.find(query)
      .populate('visitId', 'visitDate diagnosis')
      .populate('doctorId', 'name specialization')
      .populate('items.medicineId', 'name genericName form strength')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: prescriptions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Clinical Profile ─────────────────────────────────────────────────────────

export const getClinicalProfile = async (req, res) => {
  try {
    if (!(await canAccessPatient(req, req.params.patientId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    let profile = await ClinicalProfile.findOne({ patientId: req.params.patientId })
      .populate('auditLog.changedBy', 'name role');
    if (!profile) {
      // Return empty profile — auto-create on first update
      profile = { patientId: req.params.patientId, allergies: [], chronicConditions: [], pastHistory: '', familyHistory: '' };
    }
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateClinicalProfile = async (req, res) => {
  try {
    const { patientId } = req.params;
    if (!(await Patient.exists({ _id: patientId }))) {
      return res.status(404).json({ success: false, message: 'Patient record not found' });
    }
    const { allergies, chronicConditions, pastHistory, familyHistory } = req.body;

    let profile = await ClinicalProfile.findOne({ patientId });
    if (!profile) {
      profile = new ClinicalProfile({ patientId });
    }

    const auditEntries = [];
    const track = (field, newVal) => {
      const oldVal = JSON.stringify(profile[field]);
      const nv = JSON.stringify(newVal);
      if (oldVal !== nv) {
        auditEntries.push({ changedBy: req.user._id, field, oldValue: oldVal, newValue: nv });
        profile[field] = newVal;
      }
    };
    if (allergies !== undefined) track('allergies', allergies);
    if (chronicConditions !== undefined) track('chronicConditions', chronicConditions);
    if (pastHistory !== undefined) track('pastHistory', pastHistory);
    if (familyHistory !== undefined) track('familyHistory', familyHistory);

    profile.auditLog.push(...auditEntries);
    await profile.save();
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Medicine autocomplete ────────────────────────────────────────────────────

export const searchMedicines = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: [] });
    }
    const term = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const medicines = await Medicine.find({
      isActive: true,
      $or: [
        { name: new RegExp(term, 'i') },
        { genericName: new RegExp(term, 'i') },
      ],
    }).limit(20).select('name genericName form strength');
    res.json({ success: true, data: medicines });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Medical Certificates ─────────────────────────────────────────────────────

export const createCertificate = async (req, res) => {
  try {
    const { visitId, patientId, type, fromDate, toDate, diagnosisOrReason, remarks } = req.body;
    if (!patientId || !type || !fromDate || !toDate || !diagnosisOrReason) {
      return res.status(400).json({ success: false, message: 'patientId, type, fromDate, toDate, diagnosisOrReason are required' });
    }

    // Resolve doctorId from the visit or from req.user's linked Doctor record
    let doctorId;
    if (visitId) {
      const visit = await Visit.findById(visitId).select('doctorId');
      doctorId = visit?.doctorId;
    }
    if (!doctorId) {
      const doctor = await Doctor.findOne({ userId: req.user._id }).select('_id');
      doctorId = doctor?._id;
    }
    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'Doctor context not found' });
    }

    const certificateNumber = await getNextCertificateNumber();
    const cert = await MedicalCertificate.create({
      certificateNumber,
      type,
      patientId,
      visitId: visitId || undefined,
      doctorId,
      issuedBy: req.user._id,
      fromDate,
      toDate,
      diagnosisOrReason,
      remarks,
    });
    res.status(201).json({ success: true, data: cert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCertificate = async (req, res) => {
  try {
    const cert = await MedicalCertificate.findById(req.params.id)
      .populate('patientId', 'uhid name dob approxAge gender phone')
      .populate('doctorId', 'name qualification specialization registrationNumber')
      .populate('issuedBy', 'name role')
      .populate('visitId', 'visitDate diagnosis');
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found' });

    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id }).select('_id');
      if (!patient || !patient._id.equals(cert.patientId._id)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
    res.json({ success: true, data: cert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPatientCertificates = async (req, res) => {
  try {
    if (!(await canAccessPatient(req, req.params.patientId))) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const query = { patientId: req.params.patientId };
    if (req.user.role === 'patient') {
      const visits = await Visit.find({ patientId: req.params.patientId, status: 'Finalized' }).select('_id');
      query.visitId = { $in: visits.map((visit) => visit._id) };
    } else if (req.user.role === 'doctor') {
      const doctor = await getDoctorProfileForUser(req.user._id);
      if (!doctor) return res.status(403).json({ success: false, message: 'Doctor profile not found' });
      query.doctorId = doctor._id;
    }
    const certs = await MedicalCertificate.find(query)
      .populate('doctorId', 'name specialization')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: certs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
