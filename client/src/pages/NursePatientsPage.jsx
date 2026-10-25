import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FilePlus,
  FileText,
  Filter,
  HeartPulse,
  History,
  Pill,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Thermometer,
  User,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  addNursingRecord,
  fetchAdmissionNursingRecords,
  fetchAdmissions,
} from '../api/api.js';

const ENTRY_TYPES = [
  'Vitals',
  'Observation',
  'Medication',
  'IntakeOutput',
  'Procedure',
  'Allergy',
];

const NursePatientsPage = () => {
  const { token, user } = useAuth();

  const [patients, setPatients] = useState([]);
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Timeline type filter
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddendumModal, setShowAddendumModal] = useState(null); // record to correct

  // Add record form state
  const [recordType, setRecordType] = useState('Vitals');
  const [observedAt, setObservedAt] = useState('');
  const [observedReason, setObservedReason] = useState('');
  const [note, setNote] = useState('');

  // Structured data fields
  const [vitalsData, setVitalsData] = useState({
    systolic: 120,
    diastolic: 80,
    pulse: 76,
    temperature: 37.0,
    spO2: 98,
    respiratoryRate: 16,
    painScore: 0,
    weight: 60,
    bloodSugar: '',
  });

  const [observationText, setObservationText] = useState('');
  const [medData, setMedData] = useState({
    medicineName: '',
    dose: '',
    route: 'Oral',
    timeGiven: '',
    orderedBy: '',
  });
  const [ioData, setIoData] = useState({
    category: 'Intake',
    fluidType: 'Oral fluids',
    volumeMl: 250,
  });
  const [procData, setProcData] = useState({
    procedureName: 'Wound Dressing',
    notes: 'Cleaned with normal saline, sterile gauze applied.',
  });
  const [allergyData, setAllergyData] = useState({
    substance: '',
    reaction: '',
    severity: 'Moderate',
  });

  const [submitting, setSubmitting] = useState(false);

  // Load ward in-patients
  const loadInpatients = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAdmissions(token, { status: 'Admitted' });
      setPatients(res.data || []);
      if (res.data?.length > 0 && !selectedAdmission) {
        setSelectedAdmission(res.data[0]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ward in-patients.');
    } finally {
      setLoading(false);
    }
  };

  // Load records for active patient
  const loadRecords = async (admissionId) => {
    if (!admissionId) return;
    setRecordsLoading(true);
    try {
      const res = await fetchAdmissionNursingRecords(token, admissionId);
      setRecords(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load nursing records.');
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadInpatients();
  }, [token]);

  useEffect(() => {
    if (selectedAdmission) {
      loadRecords(selectedAdmission._id);
    }
  }, [selectedAdmission]);

  // Open add record modal
  const handleOpenAdd = () => {
    setRecordType('Vitals');
    setObservedAt('');
    setObservedReason('');
    setNote('');
    setShowAddModal(true);
  };

  // Submit record
  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdmission) return;
    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    let payloadData = {};
    if (recordType === 'Vitals') payloadData = vitalsData;
    else if (recordType === 'Observation') payloadData = { observation: observationText };
    else if (recordType === 'Medication') payloadData = medData;
    else if (recordType === 'IntakeOutput') payloadData = ioData;
    else if (recordType === 'Procedure') payloadData = procData;
    else if (recordType === 'Allergy') payloadData = allergyData;

    try {
      await addNursingRecord(token, {
        patientId: selectedAdmission.patientId._id,
        admissionId: selectedAdmission._id,
        type: recordType,
        data: payloadData,
        note,
        observedAt: observedAt ? new Date(observedAt).toISOString() : undefined,
        observedReason,
      });

      setSuccessMsg(`${recordType} entry recorded in clinical log.`);
      setShowAddModal(false);
      loadRecords(selectedAdmission._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record nursing entry.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Addendum
  const handleAddendumSubmit = async (e) => {
    e.preventDefault();
    if (!showAddendumModal || !note.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await addNursingRecord(token, {
        patientId: selectedAdmission.patientId._id,
        admissionId: selectedAdmission._id,
        type: 'Observation',
        addendumOf: showAddendumModal._id,
        note,
        data: { correctionReason: observedReason },
      });
      setSuccessMsg('Addendum note appended successfully.');
      setShowAddendumModal(null);
      setNote('');
      loadRecords(selectedAdmission._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to append addendum.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered records
  const filteredRecords = records.filter((r) => {
    if (selectedTypeFilter !== 'ALL' && r.type !== selectedTypeFilter) return false;
    return true;
  });

  // Last 10 vitals for trend table
  const vitalsRecords = records
    .filter((r) => r.type === 'Vitals' && r.data)
    .slice(0, 10);

  // Group addenda by parent
  const addendaMap = {};
  records.forEach((r) => {
    if (r.addendumOf) {
      const parentId = typeof r.addendumOf === 'object' ? r.addendumOf._id : r.addendumOf;
      if (!addendaMap[parentId]) addendaMap[parentId] = [];
      addendaMap[parentId].push(r);
    }
  });

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Inpatient (IPD)' }, { label: 'Nurse Clinical Station' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-heading text-slate-900">Ward Nursing Records</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800">
                <Activity className="h-3.5 w-3.5 text-teal-600" /> Nurse Station
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Record vitals, medication administration, observations, and intake/output for admitted patients.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadInpatients();
                if (selectedAdmission) loadRecords(selectedAdmission._id);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading || recordsLoading ? 'animate-spin' : ''}`} /> Refresh
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

        {/* Main Grid: Left Inpatients Sidebar + Right Patient Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: My Ward Patients (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 font-heading">
                  My Ward Patients ({patients.length})
                </h2>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                  Admitted
                </span>
              </div>

              {loading ? (
                <p className="py-10 text-center text-xs text-slate-400">Loading patients...</p>
              ) : patients.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-400">No active in-patients</p>
              ) : (
                <div className="mt-3 space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {patients.map((adm) => {
                    const isSelected = selectedAdmission?._id === adm._id;
                    return (
                      <div
                        key={adm._id}
                        onClick={() => setSelectedAdmission(adm)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-teal-500 bg-teal-50/60 shadow-sm'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-900 text-xs truncate">
                            {adm.patientId?.name}
                          </p>
                          <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            Bed {adm.bedId?.bedNumber}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                          UHID: {adm.patientId?.uhid}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{adm.admittingDoctorId?.name}</span>
                          <span>{adm.reasonForAdmission?.slice(0, 22)}...</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Active Patient Clinical Timeline (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {selectedAdmission ? (
              <>
                {/* Active Patient Card Banner */}
                <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-white to-sky-50 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-slate-900">
                          {selectedAdmission.patientId?.name}
                        </h2>
                        <span className="text-xs font-mono font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md">
                          Bed {selectedAdmission.bedId?.bedNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono">
                        UHID: {selectedAdmission.patientId?.uhid} • Age: {selectedAdmission.patientId?.approxAge || 'N/A'} • Adm: {selectedAdmission.admissionNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenAdd}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all"
                    >
                      <Plus className="h-4 w-4" /> Add Clinical Entry
                    </button>
                  </div>
                </div>

                {/* Vitals Trend Table (Last 10 readings) */}
                {vitalsRecords.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <HeartPulse className="h-4 w-4 text-rose-500" /> Recent Vitals Trend (Last {vitalsRecords.length})
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">Real-time parameters</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                          <tr>
                            <th className="py-2 px-3">Time</th>
                            <th className="py-2 px-3">BP (mmHg)</th>
                            <th className="py-2 px-3">Pulse (bpm)</th>
                            <th className="py-2 px-3">Temp (°C)</th>
                            <th className="py-2 px-3">SpO2 (%)</th>
                            <th className="py-2 px-3">Resp Rate</th>
                            <th className="py-2 px-3">Pain (0-10)</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {vitalsRecords.map((vr) => {
                            const d = vr.data || {};
                            return (
                              <tr key={vr._id} className={vr.abnormal ? 'bg-rose-50/40' : ''}>
                                <td className="py-2 px-3 text-slate-500 font-sans">
                                  {new Date(vr.observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className={`py-2 px-3 font-bold ${d.systolic > 140 || d.systolic < 90 ? 'text-rose-600' : 'text-slate-800'}`}>
                                  {d.systolic}/{d.diastolic}
                                </td>
                                <td className={`py-2 px-3 font-bold ${d.pulse > 100 || d.pulse < 60 ? 'text-rose-600' : 'text-slate-800'}`}>
                                  {d.pulse}
                                </td>
                                <td className={`py-2 px-3 font-bold ${d.temperature > 37.8 || d.temperature < 36.0 ? 'text-rose-600' : 'text-slate-800'}`}>
                                  {d.temperature}°C
                                </td>
                                <td className={`py-2 px-3 font-bold ${d.spO2 < 95 ? 'text-rose-600' : 'text-slate-800'}`}>
                                  {d.spO2}%
                                </td>
                                <td className="py-2 px-3">{d.respiratoryRate}/min</td>
                                <td className="py-2 px-3">{d.painScore}</td>
                                <td className="py-2 px-3 font-sans">
                                  {vr.abnormal ? (
                                    <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                                      Abnormal
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 text-[10px] font-bold">Normal</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Timeline Filters */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                      <Filter className="h-3.5 w-3.5" /> Type:
                    </span>
                    {['ALL', ...ENTRY_TYPES].map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTypeFilter(t)}
                        className={`rounded-xl px-2.5 py-1 text-xs font-extrabold transition-all ${
                          selectedTypeFilter === t
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 font-bold">{filteredRecords.length} entries</span>
                </div>

                {/* Timeline Entries (Newest First) */}
                <div className="space-y-3.5">
                  {recordsLoading ? (
                    <p className="py-12 text-center text-xs text-slate-400">Loading patient timeline...</p>
                  ) : filteredRecords.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                      <FilePlus className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-xs font-bold text-slate-700">No clinical entries recorded yet</p>
                      <p className="text-[11px] text-slate-400">Click "Add Clinical Entry" above to add vitals or notes.</p>
                    </div>
                  ) : (
                    filteredRecords.map((record) => {
                      const childAddenda = addendaMap[record._id] || [];
                      const isStruckThrough = childAddenda.length > 0;

                      return (
                        <div
                          key={record._id}
                          className={`rounded-2xl border p-4 shadow-sm transition-all bg-white ${
                            record.abnormal
                              ? 'border-rose-300 ring-1 ring-rose-200'
                              : 'border-slate-200'
                          }`}
                        >
                          {/* Card Header: Type, Time, Badges */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                  record.type === 'Vitals'
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : record.type === 'Medication'
                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                    : record.type === 'Allergy'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-teal-50 text-teal-800 border-teal-200'
                                }`}
                              >
                                {record.type}
                              </span>

                              {record.abnormal && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                                  <AlertTriangle className="h-3 w-3" /> Abnormal
                                </span>
                              )}

                              {record.acknowledgedBy && (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                  ✓ Reviewed by Dr. {record.acknowledgedBy.name}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span>{new Date(record.observedAt).toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Card Body: Structured Data */}
                          <div className={`mt-3 ${isStruckThrough ? 'line-through opacity-60 text-slate-400' : ''}`}>
                            {record.type === 'Vitals' && record.data && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div className="p-2 bg-slate-50 rounded-lg">
                                  <span className="text-[10px] text-slate-400 block font-bold uppercase">BP</span>
                                  <span className="font-bold text-slate-900 font-mono">{record.data.systolic}/{record.data.diastolic} mmHg</span>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-lg">
                                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Pulse</span>
                                  <span className="font-bold text-slate-900 font-mono">{record.data.pulse} bpm</span>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-lg">
                                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Temp</span>
                                  <span className="font-bold text-slate-900 font-mono">{record.data.temperature}°C</span>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-lg">
                                  <span className="text-[10px] text-slate-400 block font-bold uppercase">SpO2</span>
                                  <span className="font-bold text-slate-900 font-mono">{record.data.spO2}%</span>
                                </div>
                              </div>
                            )}

                            {record.type === 'Medication' && record.data && (
                              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-xs space-y-1">
                                <p className="font-bold text-purple-950 text-sm">{record.data.medicineName}</p>
                                <p className="text-purple-800">
                                  Dose: <strong>{record.data.dose}</strong> • Route: <strong>{record.data.route}</strong> • Time Given: <strong>{record.data.timeGiven}</strong>
                                </p>
                                {record.data.orderedBy && (
                                  <p className="text-purple-600 text-[11px]">Ordered by: {record.data.orderedBy}</p>
                                )}
                              </div>
                            )}

                            {record.type === 'Allergy' && record.data && (
                              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 text-xs space-y-1">
                                <p className="font-bold text-amber-950 text-sm">Allergy: {record.data.substance}</p>
                                <p className="text-amber-800">
                                  Reaction: {record.data.reaction || 'Unspecified'} • Severity: {record.data.severity}
                                </p>
                                <p className="text-[11px] font-bold text-amber-700">
                                  ⚠️ Unverified, reported by nurse (pending physician review)
                                </p>
                              </div>
                            )}

                            {record.type === 'IntakeOutput' && record.data && (
                              <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 text-xs">
                                <p className="font-bold text-sky-950">{record.data.category}: {record.data.volumeMl} mL ({record.data.fluidType})</p>
                              </div>
                            )}

                            {/* Note / Remarks */}
                            {record.note && (
                              <p className="mt-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                {record.note}
                              </p>
                            )}

                            {/* Abnormal Flags list */}
                            {record.abnormalFlags && record.abnormalFlags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {record.abnormalFlags.map((flag, idx) => (
                                  <span key={idx} className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                                    • {flag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Addenda list (Corrections) */}
                          {childAddenda.map((addendum) => (
                            <div key={addendum._id} className="mt-3 p-3 bg-teal-50/80 border border-teal-200 rounded-xl text-xs space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-bold text-teal-900">
                                <span>Corrected by {addendum.recordedBy?.name || 'Nurse'}</span>
                                <span className="font-mono text-[10px] text-teal-600">
                                  {new Date(addendum.observedAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-teal-800">{addendum.note}</p>
                            </div>
                          ))}

                          {/* Footer: Recorded by & Add Addendum Button */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">
                              Recorded by: <strong className="text-slate-700">{record.recordedBy?.name}</strong> ({record.recordedBy?.role})
                            </span>
                            <button
                              onClick={() => {
                                setShowAddendumModal(record);
                                setNote('');
                                setObservedReason('');
                              }}
                              className="font-bold text-teal-700 hover:text-teal-800 hover:underline"
                            >
                              + Add Addendum / Correction
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="py-20 text-center rounded-2xl border border-slate-200 bg-white">
                <User className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm font-bold text-slate-700">Select an in-patient from the left panel</p>
                <p className="text-xs text-slate-400">View timeline and chart vital statistics.</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal: Add Clinical Record */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900">
                  New Clinical Entry: {selectedAdmission?.patientId?.name}
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <form onSubmit={handleRecordSubmit} className="space-y-4">
                {/* Entry Type Selector */}
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1.5">
                    Entry Type *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {ENTRY_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRecordType(t)}
                        className={`rounded-xl py-2 text-xs font-bold transition-all border ${
                          recordType === t
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Type Fields */}
                {recordType === 'Vitals' && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block">Systolic BP (mmHg)</label>
                      <input
                        type="number"
                        min={50}
                        max={260}
                        value={vitalsData.systolic}
                        onChange={(e) => setVitalsData({ ...vitalsData, systolic: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block">Diastolic BP (mmHg)</label>
                      <input
                        type="number"
                        min={30}
                        max={160}
                        value={vitalsData.diastolic}
                        onChange={(e) => setVitalsData({ ...vitalsData, diastolic: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block">Pulse (bpm)</label>
                      <input
                        type="number"
                        min={30}
                        max={240}
                        value={vitalsData.pulse}
                        onChange={(e) => setVitalsData({ ...vitalsData, pulse: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block">Temperature (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        min={30}
                        max={45}
                        value={vitalsData.temperature}
                        onChange={(e) => setVitalsData({ ...vitalsData, temperature: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block">SpO2 (%)</label>
                      <input
                        type="number"
                        min={50}
                        max={100}
                        value={vitalsData.spO2}
                        onChange={(e) => setVitalsData({ ...vitalsData, spO2: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block">Respiratory Rate (/min)</label>
                      <input
                        type="number"
                        min={4}
                        max={60}
                        value={vitalsData.respiratoryRate}
                        onChange={(e) => setVitalsData({ ...vitalsData, respiratoryRate: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block">Pain Score (0-10)</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={vitalsData.painScore}
                        onChange={(e) => setVitalsData({ ...vitalsData, painScore: Number(e.target.value) })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block">Blood Sugar (mg/dL)</label>
                      <input
                        type="number"
                        min={20}
                        max={1000}
                        placeholder="Optional"
                        value={vitalsData.bloodSugar}
                        onChange={(e) => setVitalsData({ ...vitalsData, bloodSugar: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {recordType === 'Medication' && (
                  <div className="space-y-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                    <div>
                      <label className="text-[11px] font-bold text-purple-900 block">Medicine Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Paracetamol IV Infusion 1g"
                        value={medData.medicineName}
                        onChange={(e) => setMedData({ ...medData, medicineName: e.target.value })}
                        className="w-full rounded-lg border border-purple-200 p-2 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-purple-900 block">Dose *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 500mg, 100ml"
                          value={medData.dose}
                          onChange={(e) => setMedData({ ...medData, dose: e.target.value })}
                          className="w-full rounded-lg border border-purple-200 p-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-purple-900 block">Route *</label>
                        <select
                          value={medData.route}
                          onChange={(e) => setMedData({ ...medData, route: e.target.value })}
                          className="w-full rounded-lg border border-purple-200 p-2 text-xs font-medium"
                        >
                          <option value="Oral">Oral</option>
                          <option value="IV">Intravenous (IV)</option>
                          <option value="IM">Intramuscular (IM)</option>
                          <option value="Subcutaneous">Subcutaneous</option>
                          <option value="Topical">Topical</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-purple-900 block">Time Given</label>
                        <input
                          type="text"
                          placeholder="e.g. 10:00 AM"
                          value={medData.timeGiven}
                          onChange={(e) => setMedData({ ...medData, timeGiven: e.target.value })}
                          className="w-full rounded-lg border border-purple-200 p-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-purple-900 block">Ordered By Doctor</label>
                        <input
                          type="text"
                          placeholder="Doctor name"
                          value={medData.orderedBy}
                          onChange={(e) => setMedData({ ...medData, orderedBy: e.target.value })}
                          className="w-full rounded-lg border border-purple-200 p-2 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {recordType === 'Allergy' && (
                  <div className="space-y-3 p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                    <div>
                      <label className="text-[11px] font-bold text-amber-900 block">Allergen Substance *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Penicillin, Peanuts, Latex"
                        value={allergyData.substance}
                        onChange={(e) => setAllergyData({ ...allergyData, substance: e.target.value })}
                        className="w-full rounded-lg border border-amber-200 p-2 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-amber-900 block">Reaction</label>
                        <input
                          type="text"
                          placeholder="e.g. Skin rash, anaphylaxis"
                          value={allergyData.reaction}
                          onChange={(e) => setAllergyData({ ...allergyData, reaction: e.target.value })}
                          className="w-full rounded-lg border border-amber-200 p-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-amber-900 block">Severity</label>
                        <select
                          value={allergyData.severity}
                          onChange={(e) => setAllergyData({ ...allergyData, severity: e.target.value })}
                          className="w-full rounded-lg border border-amber-200 p-2 text-xs font-medium"
                        >
                          <option value="Mild">Mild</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Severe">Severe</option>
                          <option value="Unknown">Unknown</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-700 italic">
                      ℹ️ Allergy will be saved as "unverified, reported by nurse" until confirmed by the physician.
                    </p>
                  </div>
                )}

                {recordType === 'IntakeOutput' && (
                  <div className="grid grid-cols-3 gap-2 p-3 bg-sky-50 rounded-xl border border-sky-100">
                    <div>
                      <label className="text-[11px] font-bold text-sky-900 block">Category</label>
                      <select
                        value={ioData.category}
                        onChange={(e) => setIoData({ ...ioData, category: e.target.value })}
                        className="w-full rounded-lg border border-sky-200 p-2 text-xs"
                      >
                        <option value="Intake">Intake</option>
                        <option value="Output">Output</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-sky-900 block">Fluid Type</label>
                      <input
                        type="text"
                        value={ioData.fluidType}
                        onChange={(e) => setIoData({ ...ioData, fluidType: e.target.value })}
                        className="w-full rounded-lg border border-sky-200 p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-sky-900 block">Volume (mL)</label>
                      <input
                        type="number"
                        value={ioData.volumeMl}
                        onChange={(e) => setIoData({ ...ioData, volumeMl: Number(e.target.value) })}
                        className="w-full rounded-lg border border-sky-200 p-2 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* Free Text Note */}
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Nurse Clinical Observations / Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Document clinical observations, patient response, wound condition..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  />
                </div>

                {/* Back-dating option (up to 12h with reason) */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Observation Time (Default: Now)</span>
                    <span className="text-[10px] text-slate-400 font-mono">Max 12h back-dating</span>
                  </div>
                  <input
                    type="datetime-local"
                    value={observedAt}
                    onChange={(e) => setObservedAt(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono"
                  />
                  {observedAt && (
                    <input
                      type="text"
                      placeholder="Reason for back-dating observation..."
                      value={observedReason}
                      onChange={(e) => setObservedReason(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                      required
                    />
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Addendum (Correction) */}
        {showAddendumModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900">
                  Add Addendum / Correction
                </h3>
                <button onClick={() => setShowAddendumModal(null)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <div className="text-xs bg-slate-50 p-3 rounded-xl space-y-1">
                <p><strong>Original Entry Type:</strong> {showAddendumModal.type}</p>
                <p><strong>Original Time:</strong> {new Date(showAddendumModal.observedAt).toLocaleString()}</p>
                <p className="text-slate-500 italic">
                  Note: The original entry will be preserved in the audit log and displayed with this correction attached.
                </p>
              </div>

              <form onSubmit={handleAddendumSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Correction Details *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="State the corrected readings or clinical update..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddendumModal(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !note.trim()}
                    className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {submitting ? 'Appended...' : 'Submit Addendum'}
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

export default NursePatientsPage;
