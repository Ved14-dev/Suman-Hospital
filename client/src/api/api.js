import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authConfig = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// --- Public Endpoints ---
export const fetchDepartments = async () => (await api.get('/departments')).data;
export const fetchDepartmentBySlug = async (slug) => (await api.get(`/departments/${slug}`)).data;
export const fetchDoctors = async (params = {}) => (await api.get('/doctors', { params })).data;
export const fetchDoctorById = async (id) => (await api.get(`/doctors/${id}`)).data;
export const fetchServices = async () => (await api.get('/services')).data;
export const submitEnquiry = async (formData) => (await api.post('/enquiries', formData)).data;

// --- Auth Endpoints ---
export const apiLogin = async (data) => (await api.post('/auth/login', data)).data;
export const apiRegister = async (data) => (await api.post('/auth/register', data)).data;
export const apiMe = async (token) => (await api.get('/auth/me', authConfig(token))).data;

// --- Patient Registry Endpoints ---
export const fetchPatients = async (token, params = {}) =>
  (await api.get('/patients', { ...authConfig(token), params })).data;

export const fetchPatientById = async (token, id) =>
  (await api.get(`/patients/${id}`, authConfig(token))).data;

export const quickSearchPatients = async (token, query) =>
  (await api.get('/patients/quick-search', { ...authConfig(token), params: { q: query } })).data;

export const createPatient = async (token, data) =>
  (await api.post('/patients', data, authConfig(token))).data;

export const updatePatient = async (token, id, data) =>
  (await api.patch(`/patients/${id}`, data, authConfig(token))).data;

export const deactivatePatient = async (token, id, reason) =>
  (await api.patch(`/patients/${id}/deactivate`, { reason }, authConfig(token))).data;

export const fetchMyPatientProfile = async (token) =>
  (await api.get('/patients/me', authConfig(token))).data;

// --- Appointments & OPD Queue Endpoints ---
export const fetchAvailability = async (doctorId, date) =>
  (await api.get(`/doctors/${doctorId}/availability`, { params: { date } })).data;

export const fetchMyAppointments = async (token) =>
  (await api.get('/appointments/me', authConfig(token))).data;

export const fetchAppointments = async (token, params = {}) =>
  (await api.get('/appointments', { ...authConfig(token), params })).data;

export const createAppointment = async (token, data) =>
  (await api.post('/appointments', data, authConfig(token))).data;

export const createWalkInAppointment = async (token, data) =>
  (await api.post('/appointments/walkin', data, authConfig(token))).data;

export const checkInAppointment = async (token, id) =>
  (await api.post(`/appointments/${id}/checkin`, {}, authConfig(token))).data;

export const fetchLiveQueue = async (token, params = {}) =>
  (await api.get('/appointments/queue', { ...authConfig(token), params })).data;

export const callNextPatient = async (token, id) =>
  (await api.post(`/appointments/${id}/call-next`, {}, authConfig(token))).data;

export const startConsultation = async (token, id) =>
  (await api.post(`/appointments/${id}/start-consultation`, {}, authConfig(token))).data;

export const completeConsultation = async (token, id, consultationNotes) =>
  (await api.post(`/appointments/${id}/complete`, { consultationNotes }, authConfig(token))).data;

export const rescheduleAppointment = async (token, id, data) =>
  (await api.post(`/appointments/${id}/reschedule`, data, authConfig(token))).data;

export const cancelAppointment = async (token, id, reason) =>
  (await api.post(`/appointments/${id}/cancel`, { reason }, authConfig(token))).data;

export const markNoShowAppointment = async (token, id) =>
  (await api.post(`/appointments/${id}/no-show`, {}, authConfig(token))).data;

export const updateAppointmentStatus = async (token, id, data) =>
  (await api.patch(`/appointments/${id}/status`, data, authConfig(token))).data;

export const fetchNoShowCancellationReport = async (token, params = {}) =>
  (await api.get('/appointments/reports/no-shows-cancellations', { ...authConfig(token), params })).data;

// --- Admin Endpoints ---
export const fetchAdminStats = async (token) =>
  (await api.get('/admin/stats', authConfig(token))).data;

export const fetchAdminAppointments = async (token) =>
  (await api.get('/admin/appointments', authConfig(token))).data;

export const fetchAdminPatients = async (token) =>
  (await api.get('/admin/patients', authConfig(token))).data;

export const fetchAdminDoctors = async (token) =>
  (await api.get('/admin/doctors', authConfig(token))).data;

// ─── EMR Endpoints (Module 3) ─────────────────────────────────────────────────
export const createVisit = async (token, data) => (await api.post('/emr/visits', data, authConfig(token))).data;
export const getVisit = async (token, id) => (await api.get(`/emr/visits/${id}`, authConfig(token))).data;
export const updateVisit = async (token, id, data) => (await api.patch(`/emr/visits/${id}`, data, authConfig(token))).data;
export const finalizeVisit = async (token, id) => (await api.post(`/emr/visits/${id}/finalize`, {}, authConfig(token))).data;
export const addAmendment = async (token, id, data) => (await api.post(`/emr/visits/${id}/amend`, data, authConfig(token))).data;
export const getPatientVisits = async (token, patientId) => (await api.get(`/emr/patients/${patientId}/visits`, authConfig(token))).data;
export const createPrescription = async (token, visitId, data) => (await api.post(`/emr/visits/${visitId}/prescriptions`, data, authConfig(token))).data;
export const getVisitPrescriptions = async (token, visitId) => (await api.get(`/emr/visits/${visitId}/prescriptions`, authConfig(token))).data;
export const getPrescription = async (token, id) => (await api.get(`/emr/prescriptions/${id}`, authConfig(token))).data;
export const getPatientPrescriptions = async (token, patientId) => (await api.get(`/emr/patients/${patientId}/prescriptions`, authConfig(token))).data;
export const getClinicalProfile = async (token, patientId) => (await api.get(`/emr/patients/${patientId}/clinical-profile`, authConfig(token))).data;
export const updateClinicalProfile = async (token, patientId, data) => (await api.patch(`/emr/patients/${patientId}/clinical-profile`, data, authConfig(token))).data;
export const searchMedicinesForRx = async (token, q) => (await api.get('/emr/medicines/search', { ...authConfig(token), params: { q } })).data;
export const createCertificate = async (token, data) => (await api.post('/emr/certificates', data, authConfig(token))).data;
export const getCertificate = async (token, id) => (await api.get(`/emr/certificates/${id}`, authConfig(token))).data;
export const getPatientCertificates = async (token, patientId) => (await api.get(`/emr/patients/${patientId}/certificates`, authConfig(token))).data;

// ─── Billing Endpoints (Module 4) ─────────────────────────────────────────────
export const fetchChargeItems = async (token, params = {}) => (await api.get('/billing/charge-items', { ...authConfig(token), params })).data;
export const createChargeItem = async (token, data) => (await api.post('/billing/charge-items', data, authConfig(token))).data;
export const updateChargeItem = async (token, id, data) => (await api.patch(`/billing/charge-items/${id}`, data, authConfig(token))).data;
export const fetchPackages = async (token) => (await api.get('/billing/packages', authConfig(token))).data;
export const createPackage = async (token, data) => (await api.post('/billing/packages', data, authConfig(token))).data;
export const sellPackage = async (token, data) => (await api.post('/billing/packages/sell', data, authConfig(token))).data;
export const fetchInvoices = async (token, params = {}) => (await api.get('/billing/invoices', { ...authConfig(token), params })).data;
export const fetchInvoice = async (token, id) => (await api.get(`/billing/invoices/${id}`, authConfig(token))).data;
export const createInvoice = async (token, data) => (await api.post('/billing/invoices', data, authConfig(token))).data;
export const updateInvoice = async (token, id, data) => (await api.patch(`/billing/invoices/${id}`, data, authConfig(token))).data;
export const cancelInvoice = async (token, id, reason) => (await api.post(`/billing/invoices/${id}/cancel`, { reason }, authConfig(token))).data;
export const recordPayment = async (token, data) => (await api.post('/billing/payments', data, authConfig(token))).data;
export const issueRefund = async (token, data) => (await api.post('/billing/refunds', data, authConfig(token))).data;
export const fetchOutstandingDues = async (token, params = {}) => (await api.get('/billing/invoices/outstanding', { ...authConfig(token), params })).data;
export const getDailyCollectionReport = async (token, date) => (await api.get('/billing/reports/daily-collection', { ...authConfig(token), params: { date } })).data;
export const getRevenueSummary = async (token, params) => (await api.get('/billing/reports/revenue', { ...authConfig(token), params })).data;

// ─── Pharmacy Endpoints (Module 5) ────────────────────────────────────────────
export const fetchMedicines = async (token, params = {}) => (await api.get('/pharmacy/medicines', { ...authConfig(token), params })).data;
export const createMedicine = async (token, data) => (await api.post('/pharmacy/medicines', data, authConfig(token))).data;
export const updateMedicine = async (token, id, data) => (await api.patch(`/pharmacy/medicines/${id}`, data, authConfig(token))).data;
export const receiveStock = async (token, data) => (await api.post('/pharmacy/stock/receive', data, authConfig(token))).data;
export const fetchStockLevels = async (token) => (await api.get('/pharmacy/stock/levels', authConfig(token))).data;
export const fetchStockAlerts = async (token) => (await api.get('/pharmacy/stock/alerts', authConfig(token))).data;
export const suggestBatches = async (token, medicineId, quantity) => (await api.get('/pharmacy/stock/suggest', { ...authConfig(token), params: { medicineId, quantity } })).data;
export const dispensePrescription = async (token, data) => (await api.post('/pharmacy/dispense', data, authConfig(token))).data;
export const adjustStock = async (token, data) => (await api.post('/pharmacy/stock/adjust', data, authConfig(token))).data;

// ─── IPD Endpoints (Module 6) ─────────────────────────────────────────────────
export const fetchWardAvailability = async (token) => (await api.get('/ipd/availability', authConfig(token))).data;
export const fetchWards = async (token) => (await api.get('/ipd/wards', authConfig(token))).data;
export const createWard = async (token, data) => (await api.post('/ipd/wards', data, authConfig(token))).data;
export const updateWard = async (token, id, data) => (await api.patch(`/ipd/wards/${id}`, data, authConfig(token))).data;
export const fetchBeds = async (token, params = {}) => (await api.get('/ipd/beds', { ...authConfig(token), params })).data;
export const fetchBedOccupancy = async (token) => (await api.get('/ipd/beds/occupancy', authConfig(token))).data;
export const createBed = async (token, data) => (await api.post('/ipd/beds', data, authConfig(token))).data;
export const updateBed = async (token, id, data) => (await api.patch(`/ipd/beds/${id}`, data, authConfig(token))).data;
export const updateBedStatus = async (token, id, data) => (await api.patch(`/ipd/beds/${id}/status`, typeof data === 'string' ? { status: data } : data, authConfig(token))).data;
export const fetchBedEvents = async (token, bedId) => (await api.get(`/ipd/beds/${bedId}/events`, authConfig(token))).data;
export const fetchBedBookings = async (token, params = {}) => (await api.get('/ipd/bookings', { ...authConfig(token), params })).data;
export const createBedBooking = async (token, data) => (await api.post('/ipd/bookings', data, authConfig(token))).data;
export const approveBedBooking = async (token, id, data) => (await api.post(`/ipd/bookings/${id}/approve`, data, authConfig(token))).data;
export const rejectBedBooking = async (token, id, data) => (await api.post(`/ipd/bookings/${id}/reject`, data, authConfig(token))).data;
export const cancelBedBooking = async (token, id, data) => (await api.post(`/ipd/bookings/${id}/cancel`, data, authConfig(token))).data;
export const fetchAdmissions = async (token, params = {}) => (await api.get('/ipd/admissions', { ...authConfig(token), params })).data;
export const fetchMyAdmission = async (token) => (await api.get('/ipd/admissions/my', authConfig(token))).data;
export const fetchAdmission = async (token, id) => (await api.get(`/ipd/admissions/${id}`, authConfig(token))).data;
export const admitPatient = async (token, data) => (await api.post('/ipd/admissions', data, authConfig(token))).data;
export const transferBed = async (token, id, data) => (await api.post(`/ipd/admissions/${id}/transfer`, data, authConfig(token))).data;
export const dischargePatient = async (token, id, data) => (await api.post(`/ipd/admissions/${id}/discharge`, data, authConfig(token))).data;
export const addRoundNote = async (token, data) => (await api.post('/ipd/round-notes', data, authConfig(token))).data;
export const fetchRoundNotes = async (token, admissionId) => (await api.get(`/ipd/admissions/${admissionId}/notes`, authConfig(token))).data;
export const addNursingRecord = async (token, data) => (await api.post('/ipd/nursing-records', data, authConfig(token))).data;
export const fetchAdmissionNursingRecords = async (token, admissionId, params = {}) => (await api.get(`/ipd/nursing-records/admission/${admissionId}`, { ...authConfig(token), params })).data;
export const fetchPatientNursingRecords = async (token, patientId, params = {}) => (await api.get(`/ipd/nursing-records/patient/${patientId}`, { ...authConfig(token), params })).data;
export const fetchDoctorNeedsReview = async (token) => (await api.get('/ipd/nursing-records/doctor/needs-review', authConfig(token))).data;
export const acknowledgeNursingRecord = async (token, id) => (await api.post(`/ipd/nursing-records/${id}/acknowledge`, {}, authConfig(token))).data;

// ─── Staff Endpoints (Module 7) ───────────────────────────────────────────────
export const fetchStaff = async (token, params = {}) => (await api.get('/staff', { ...authConfig(token), params })).data;
export const fetchStaffMember = async (token, id) => (await api.get(`/staff/${id}`, authConfig(token))).data;
export const createStaff = async (token, data) => (await api.post('/staff', data, authConfig(token))).data;
export const updateStaff = async (token, id, data) => (await api.patch(`/staff/${id}`, data, authConfig(token))).data;
export const deactivateStaff = async (token, id) => (await api.post(`/staff/${id}/deactivate`, {}, authConfig(token))).data;
export const reactivateStaff = async (token, id) => (await api.post(`/staff/${id}/reactivate`, {}, authConfig(token))).data;
export const changePassword = async (token, data) => (await api.post('/staff/change-password', data, authConfig(token))).data;
export const fetchMyProfile = async (token) => (await api.get('/staff/me', authConfig(token))).data;

export default api;
