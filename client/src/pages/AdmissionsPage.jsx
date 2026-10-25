import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  FileText,
  Filter,
  Plus,
  Printer,
  RefreshCw,
  Search,
  User,
  UserCheck,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  admitPatient,
  dischargePatient,
  fetchAdmissions,
  fetchBeds,
  fetchDepartments,
  fetchDoctors,
  quickSearchPatients,
  transferBed,
} from '../api/api.js';

const AdmissionsPage = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAdmitWizard, setShowAdmitWizard] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(null); // admission
  const [showDischargeModal, setShowDischargeModal] = useState(null); // admission
  const [showDetailsModal, setShowDetailsModal] = useState(null);

  // Admit Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [admitPatientObj, setAdmitPatientObj] = useState(null);
  const [admitDoctorId, setAdmitDoctorId] = useState('');
  const [admitDepartmentId, setAdmitDepartmentId] = useState('');
  const [admitBedId, setAdmitBedId] = useState('');
  const [admitReason, setAdmitReason] = useState('');
  const [admitDiagnosis, setAdmitDiagnosis] = useState('');
  const [admitExpectedDischarge, setAdmitExpectedDischarge] = useState('');
  const [admitBookingId, setAdmitBookingId] = useState('');

  // References for dropdowns
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);

  // Transfer / Discharge state
  const [transferTargetBedId, setTransferTargetBedId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [dischargeSummary, setDischargeSummary] = useState({
    finalDiagnosis: '',
    treatmentGiven: '',
    conditionAtDischarge: 'Stable',
    adviceOnDischarge: '',
    followUp: '',
  });
  const [dischargeOverrideReason, setDischargeOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [admRes, docRes, deptRes, bedRes] = await Promise.all([
        fetchAdmissions(token),
        fetchDoctors().catch(() => ({ data: [] })),
        fetchDepartments().catch(() => ({ data: [] })),
        fetchBeds(token, { status: 'Available' }),
      ]);
      setAdmissions(admRes.data || []);
      setDoctors(docRes.data || []);
      setDepartments(deptRes.data || []);
      setAvailableBeds(bedRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  // Handle pre-fill if navigated from Approved booking
  useEffect(() => {
    if (location.state?.fromBooking) {
      const b = location.state.fromBooking;
      setAdmitBookingId(b._id);
      setAdmitPatientObj(b.patientId);
      if (b.patientId) setPatientSearchTerm(`${b.patientId.name} (${b.patientId.uhid})`);
      if (b.doctorId?._id) setAdmitDoctorId(b.doctorId._id);
      if (b.bedId?._id) setAdmitBedId(b.bedId._id);
      if (b.reason) setAdmitReason(b.reason);
      setShowAdmitWizard(true);
      setWizardStep(2);
    }
  }, [location.state]);

  // Autocomplete search
  useEffect(() => {
    if (patientSearchTerm.trim().length >= 2 && !admitPatientObj) {
      quickSearchPatients(token, patientSearchTerm)
        .then((res) => setPatientResults(res.data || []))
        .catch(() => setPatientResults([]));
    } else {
      setPatientResults([]);
    }
  }, [patientSearchTerm, admitPatientObj]);

  // Submit Admit
  const handleAdmitSubmit = async (e) => {
    e.preventDefault();
    if (!admitPatientObj?._id || !admitDoctorId || !admitDepartmentId || !admitBedId || !admitReason.trim()) {
      setError('Please fill all required admission fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await admitPatient(token, {
        patientId: admitPatientObj._id,
        admittingDoctorId: admitDoctorId,
        departmentId: admitDepartmentId,
        bedId: admitBedId,
        bookingId: admitBookingId || undefined,
        reasonForAdmission: admitReason,
        provisionalDiagnosis: admitDiagnosis,
        expectedDischargeDate: admitExpectedDischarge || undefined,
      });
      setSuccessMsg(`Patient admitted successfully! Admission No: ${res.data.admissionNumber}`);
      setShowAdmitWizard(false);
      resetWizard();
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Admission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    setWizardStep(1);
    setAdmitPatientObj(null);
    setPatientSearchTerm('');
    setAdmitDoctorId('');
    setAdmitDepartmentId('');
    setAdmitBedId('');
    setAdmitReason('');
    setAdmitDiagnosis('');
    setAdmitExpectedDischarge('');
    setAdmitBookingId('');
  };

  // Submit Transfer
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!showTransferModal || !transferTargetBedId || !transferReason.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await transferBed(token, showTransferModal._id, {
        toBedId: transferTargetBedId,
        reason: transferReason,
      });
      setSuccessMsg('Patient transferred successfully.');
      setShowTransferModal(null);
      setTransferTargetBedId('');
      setTransferReason('');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Transfer failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Discharge
  const handleDischargeSubmit = async (e) => {
    e.preventDefault();
    if (!showDischargeModal) return;
    setSubmitting(true);
    setError('');
    try {
      await dischargePatient(token, showDischargeModal._id, {
        dischargeSummary,
        dischargeOverrideReason: user.role === 'admin' ? dischargeOverrideReason : undefined,
      });
      setSuccessMsg('Patient discharged successfully.');
      const dischargedId = showDischargeModal._id;
      setShowDischargeModal(null);
      loadData();
      // Navigate to printable discharge summary
      navigate(`/portal/ipd/discharge-summary/${dischargedId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Discharge failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered admissions
  const filteredAdmissions = admissions.filter((a) => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const numMatch = a.admissionNumber?.toLowerCase().includes(q);
      const nameMatch = a.patientId?.name?.toLowerCase().includes(q);
      const uhidMatch = a.patientId?.uhid?.toLowerCase().includes(q);
      const bedMatch = a.bedId?.bedNumber?.toLowerCase().includes(q);
      return numMatch || nameMatch || uhidMatch || bedMatch;
    }
    return true;
  });

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Inpatient (IPD)' }, { label: 'Admissions' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black font-heading text-slate-900">Inpatient Admissions</h1>
            <p className="mt-1 text-xs text-slate-500">
              Manage patient admission records, room transfers, clinical summaries, and discharges.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {['admin', 'doctor', 'receptionist'].includes(user?.role) && (
              <button
                onClick={() => {
                  resetWizard();
                  setShowAdmitWizard(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all"
              >
                <Plus className="h-4 w-4" /> Admit Patient
              </button>
            )}
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-xs font-bold text-rose-600">Dismiss</button>
          </div>
        )}
        {successMsg && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-xs font-bold text-emerald-600">Dismiss</button>
          </div>
        )}

        {/* Filter bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by patient name, UHID, admission ref, bed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {['ALL', 'Admitted', 'Discharged'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Admissions List Table */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <p className="py-16 text-center text-sm font-bold text-slate-500">Loading admissions...</p>
          ) : filteredAdmissions.length === 0 ? (
            <div className="py-16 text-center">
              <User className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-bold text-slate-700">No admissions found</p>
              <p className="text-xs text-slate-400">Admitted inpatients will be listed here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Admission No</th>
                    <th className="py-3.5 px-4">Patient (UHID)</th>
                    <th className="py-3.5 px-4">Bed & Ward</th>
                    <th className="py-3.5 px-4">Attending Doctor</th>
                    <th className="py-3.5 px-4">Admitted At</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdmissions.map((adm) => (
                    <tr key={adm._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{adm.admissionNumber}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{adm.patientId?.name}</p>
                        <p className="text-[11px] font-mono text-slate-500">UHID: {adm.patientId?.uhid}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">Bed {adm.bedId?.bedNumber}</span>
                        <p className="text-[11px] text-slate-500">
                          ₹{adm.bedId?.dailyCharge ? (adm.bedId.dailyCharge / 100).toFixed(0) : '0'}/day
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">{adm.admittingDoctorId?.name}</p>
                        <p className="text-[11px] text-slate-400">{adm.admittingDoctorId?.specialization}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 font-mono">
                        {new Date(adm.admittedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge value={adm.status} size="xs" />
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {adm.status === 'Admitted' && (
                          <>
                            {['admin', 'doctor', 'nurse', 'receptionist'].includes(user?.role) && (
                              <button
                                onClick={() => {
                                  setShowTransferModal(adm);
                                  setTransferTargetBedId('');
                                  setTransferReason('');
                                }}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                              >
                                Transfer
                              </button>
                            )}

                            {['admin', 'doctor'].includes(user?.role) && (
                              <button
                                onClick={() => {
                                  setShowDischargeModal(adm);
                                  setDischargeSummary({
                                    finalDiagnosis: adm.provisionalDiagnosis || '',
                                    treatmentGiven: '',
                                    conditionAtDischarge: 'Stable',
                                    adviceOnDischarge: '',
                                    followUp: '',
                                  });
                                }}
                                className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700"
                              >
                                Discharge
                              </button>
                            )}
                          </>
                        )}

                        {adm.status === 'Discharged' && (
                          <button
                            onClick={() => navigate(`/portal/ipd/discharge-summary/${adm._id}`)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                          >
                            <Printer className="h-3 w-3 text-slate-500" /> Summary
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal: Admit Patient Wizard */}
        {showAdmitWizard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 font-heading">Inpatient Admit Wizard</h3>
                    <p className="text-xs text-slate-400">Step {wizardStep} of 2</p>
                  </div>
                </div>
                <button onClick={() => setShowAdmitWizard(false)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <form onSubmit={handleAdmitSubmit} className="space-y-4">
                {/* Step 1: Patient Selection */}
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Select Patient *
                  </label>
                  {!admitPatientObj ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search registered patient by name, phone, or UHID..."
                          value={patientSearchTerm}
                          onChange={(e) => setPatientSearchTerm(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs"
                          required
                        />
                      </div>
                      {patientResults.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white shadow-md max-h-36 overflow-y-auto divide-y divide-slate-100">
                          {patientResults.map((p) => (
                            <div
                              key={p._id}
                              onClick={() => {
                                setAdmitPatientObj(p);
                                setPatientSearchTerm(`${p.name} (${p.uhid})`);
                                setPatientResults([]);
                              }}
                              className="p-2.5 hover:bg-teal-50 cursor-pointer text-xs"
                            >
                              <p className="font-bold text-slate-900">{p.name}</p>
                              <p className="text-[11px] text-slate-400 font-mono">UHID: {p.uhid} • Phone: {p.phone}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-black text-emerald-950">{admitPatientObj.name}</p>
                        <p className="font-mono text-emerald-800 text-[11px]">UHID: {admitPatientObj.uhid}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAdmitPatientObj(null);
                          setPatientSearchTerm('');
                        }}
                        className="text-xs text-rose-600 font-bold"
                      >
                        Change Patient
                      </button>
                    </div>
                  )}
                </div>

                {/* Step 2: Clinical Details & Bed Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                      Attending Doctor *
                    </label>
                    <select
                      value={admitDoctorId}
                      onChange={(e) => setAdmitDoctorId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      required
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map((d) => (
                        <option key={d._id} value={d._id}>{d.name} ({d.specialization})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                      Department *
                    </label>
                    <select
                      value={admitDepartmentId}
                      onChange={(e) => setAdmitDepartmentId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Assign Physical Bed *
                  </label>
                  <select
                    value={admitBedId}
                    onChange={(e) => setAdmitBedId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    required
                  >
                    <option value="">Select available bed</option>
                    {availableBeds.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.wardId?.name} — Bed {b.bedNumber} (₹{(b.dailyCharge / 100).toFixed(0)}/day)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Reason for Admission *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acute febrile illness with dehydration..."
                    value={admitReason}
                    onChange={(e) => setAdmitReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                      Provisional Diagnosis
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Viral Pyrexia"
                      value={admitDiagnosis}
                      onChange={(e) => setAdmitDiagnosis(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                      Expected Discharge Date
                    </label>
                    <input
                      type="date"
                      value={admitExpectedDischarge}
                      onChange={(e) => setAdmitExpectedDischarge(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAdmitWizard(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !admitPatientObj || !admitBedId || !admitReason}
                    className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {submitting ? 'Admitting...' : 'Confirm Admission'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Transfer Bed */}
        {showTransferModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900">Transfer Patient Bed</h3>
                <button onClick={() => setShowTransferModal(null)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <div className="text-xs bg-slate-50 p-3 rounded-xl space-y-1">
                <p><strong>Patient:</strong> {showTransferModal.patientId?.name}</p>
                <p><strong>Current Bed:</strong> {showTransferModal.bedId?.bedNumber}</p>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Select Target Available Bed *
                  </label>
                  <select
                    value={transferTargetBedId}
                    onChange={(e) => setTransferTargetBedId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
                    required
                  >
                    <option value="">Select target bed</option>
                    {availableBeds
                      .filter((b) => b._id !== showTransferModal.bedId?._id)
                      .map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.wardId?.name} — Bed {b.bedNumber} (₹{(b.dailyCharge / 100).toFixed(0)}/day)
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Reason for Transfer *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Clinical escalation, patient preference..."
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !transferTargetBedId || !transferReason.trim()}
                    className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {submitting ? 'Transferring...' : 'Execute Transfer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Discharge Patient */}
        {showDischargeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900">
                  Discharge Patient: {showDischargeModal.patientId?.name}
                </h3>
                <button onClick={() => setShowDischargeModal(null)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <form onSubmit={handleDischargeSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Final Diagnosis *</label>
                  <input
                    type="text"
                    required
                    value={dischargeSummary.finalDiagnosis}
                    onChange={(e) => setDischargeSummary({ ...dischargeSummary, finalDiagnosis: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Treatment Given *</label>
                  <textarea
                    rows={2}
                    required
                    value={dischargeSummary.treatmentGiven}
                    onChange={(e) => setDischargeSummary({ ...dischargeSummary, treatmentGiven: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Condition at Discharge *</label>
                    <select
                      value={dischargeSummary.conditionAtDischarge}
                      onChange={(e) => setDischargeSummary({ ...dischargeSummary, conditionAtDischarge: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-medium"
                    >
                      <option value="Stable">Stable</option>
                      <option value="Improved">Improved</option>
                      <option value="Critical">Critical</option>
                      <option value="LAMA">LAMA</option>
                      <option value="Expired">Expired</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Follow-up Advice</label>
                    <input
                      type="text"
                      placeholder="e.g. Review in OPD in 7 days"
                      value={dischargeSummary.followUp}
                      onChange={(e) => setDischargeSummary({ ...dischargeSummary, followUp: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Advice on Discharge</label>
                  <textarea
                    rows={2}
                    value={dischargeSummary.adviceOnDischarge}
                    onChange={(e) => setDischargeSummary({ ...dischargeSummary, adviceOnDischarge: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>

                {user.role === 'admin' && (
                  <div>
                    <label className="text-xs font-bold uppercase text-rose-600 block mb-1">
                      Admin Discharge Override Reason *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="State mandatory reason for administrative discharge..."
                      value={dischargeOverrideReason}
                      onChange={(e) => setDischargeOverrideReason(e.target.value)}
                      className="w-full rounded-xl border border-rose-300 p-2 text-xs"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowDischargeModal(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {submitting ? 'Discharging...' : 'Discharge & Print Summary'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdmissionsPage;
