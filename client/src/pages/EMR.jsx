import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText, Search, Plus, Stethoscope, Pill, Award, ChevronRight,
  AlertTriangle, CheckCircle, Clock, Lock, Edit3, Syringe, HeartPulse,
  Baby, Leaf, Save, Send, X, RotateCcw
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getPatientVisits, createVisit, updateVisit, finalizeVisit, addAmendment,
  createPrescription, getVisitPrescriptions,
  getClinicalProfile,
  searchMedicinesForRx,
  createCertificate,
  quickSearchPatients,
} from '../api/api.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtPaise = (p) => `₹${((p || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const SEVERITY_COLORS = {
  Mild: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Moderate: 'bg-orange-100 text-orange-800 border-orange-200',
  Severe: 'bg-red-100 text-red-800 border-red-300',
  Unknown: 'bg-slate-100 text-slate-700 border-slate-200',
};

// ─── Patient Header ───────────────────────────────────────────────────────────
const PatientHeader = ({ patient, allergies }) => {
  const age = patient.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600000))
    : patient.approxAge;
  return (
    <div className="bg-gradient-to-r from-teal-950 to-slate-900 rounded-2xl p-5 text-white shadow-lg border border-teal-800/40">
      <div className="flex flex-wrap gap-4 items-start justify-between">
        <div>
          <p className="text-xs font-mono text-teal-400 uppercase tracking-widest mb-1">{patient.uhid}</p>
          <h2 className="text-xl font-extrabold font-heading">{patient.name}</h2>
          <p className="text-slate-300 text-sm mt-1">
            {age ? `${age} yrs` : 'Age N/A'} &bull; {patient.gender} &bull; {patient.bloodGroup || 'Blood group unknown'}
          </p>
          <p className="text-slate-400 text-xs mt-1">{patient.phone}</p>
        </div>
        {allergies && allergies.length > 0 && (
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs font-extrabold text-red-300 uppercase tracking-wider">Known Allergies</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allergies.map((a, i) => (
                <span key={i} className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${SEVERITY_COLORS[a.severity || 'Unknown']}`}>
                  {a.substance} {a.reaction ? `— ${a.reaction}` : ''} ({a.severity})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Vitals Form ──────────────────────────────────────────────────────────────
const VitalsForm = ({ vitals, onChange, department }) => {
  const isPaediatric = department?.name?.toLowerCase().includes('paediatric') || department?.name?.toLowerCase().includes('pediatric');
  const fields = [
    { key: 'bpSystolic', label: 'BP Systolic', unit: 'mmHg', type: 'number' },
    { key: 'bpDiastolic', label: 'BP Diastolic', unit: 'mmHg', type: 'number' },
    { key: 'pulse', label: 'Pulse', unit: 'bpm', type: 'number' },
    { key: 'temperatureC', label: 'Temp', unit: '°C', type: 'number', step: '0.1' },
    { key: 'spo2', label: 'SpO₂', unit: '%', type: 'number' },
    { key: 'weightKg', label: 'Weight', unit: 'kg', type: 'number', step: '0.1' },
    { key: 'heightCm', label: 'Height', unit: 'cm', type: 'number' },
    ...(isPaediatric ? [{ key: 'headCircumferenceCm', label: 'Head Circumference', unit: 'cm', type: 'number', step: '0.1' }] : []),
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block text-xs font-bold text-slate-600 mb-1">{f.label} <span className="text-slate-400 font-normal">({f.unit})</span></label>
          <input
            type={f.type}
            step={f.step || '1'}
            value={vitals[f.key] || ''}
            onChange={(e) => onChange({ ...vitals, [f.key]: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            placeholder="—"
          />
        </div>
      ))}
    </div>
  );
};

// ─── Rx Builder ───────────────────────────────────────────────────────────────
const RxBuilder = ({ token, items, onChange, allergies }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const debounce = useRef(null);

  const checkAllergies = useCallback((rxItems) => {
    const ws = [];
    rxItems.forEach((item, idx) => {
      allergies.forEach((a) => {
        const sub = a.substance.toLowerCase();
        const name = (item.medicineName || '').toLowerCase();
        const gen = (item.genericName || '').toLowerCase();
        if (name.includes(sub) || sub.includes(name) || (gen && (gen.includes(sub) || sub.includes(gen)))) {
          ws.push({ idx, medicineName: item.medicineName, substance: a.substance, severity: a.severity });
        }
      });
    });
    setWarnings(ws);
  }, [allergies]);

  const search = (q) => {
    clearTimeout(debounce.current);
    setQuery(q);
    if (q.length < 2) { setSuggestions([]); return; }
    debounce.current = setTimeout(async () => {
      try {
        const res = await searchMedicinesForRx(token, q);
        setSuggestions(res.data || []);
      } catch { setSuggestions([]); }
    }, 300);
  };

  const addFromMaster = (med) => {
    const newItem = { medicineId: med._id, medicineName: med.name, genericName: med.genericName, dosage: '', frequency: '', duration: '', instructions: '', isFreetextItem: false, allergyWarningAcknowledged: false };
    const updated = [...items, newItem];
    onChange(updated);
    checkAllergies(updated);
    setQuery(''); setSuggestions([]);
  };

  const addFreetext = () => {
    if (!query.trim()) return;
    const newItem = { medicineId: null, medicineName: query.trim(), genericName: '', dosage: '', frequency: '', duration: '', instructions: '', isFreetextItem: true, allergyWarningAcknowledged: false };
    const updated = [...items, newItem];
    onChange(updated);
    checkAllergies(updated);
    setQuery(''); setSuggestions([]);
  };

  const updateItem = (idx, field, val) => {
    const updated = items.map((it, i) => i === idx ? { ...it, [field]: val } : it);
    onChange(updated);
    checkAllergies(updated);
  };

  const removeItem = (idx) => {
    const updated = items.filter((_, i) => i !== idx);
    onChange(updated);
    checkAllergies(updated);
  };

  const acknowledgeWarning = (idx) => {
    const updated = items.map((it, i) => i === idx ? { ...it, allergyWarningAcknowledged: true } : it);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Allergy Warnings */}
      {warnings.filter(w => !items[w.idx]?.allergyWarningAcknowledged).map((w, i) => (
        <div key={i} className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-800">Allergy Warning: {w.medicineName}</p>
            <p className="text-xs text-red-700">Patient is allergic to <strong>{w.substance}</strong> (Severity: {w.severity})</p>
          </div>
          <button onClick={() => acknowledgeWarning(w.idx)} className="text-xs font-bold text-red-700 border border-red-300 rounded-lg px-3 py-1 hover:bg-red-100 cursor-pointer">Acknowledge</button>
        </div>
      ))}

      {/* Search */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={query} onChange={(e) => search(e.target.value)} placeholder="Search medicine by name or generic…" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
            {suggestions.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                {suggestions.map((m) => (
                  <button key={m._id} onClick={() => addFromMaster(m)} className="w-full text-left px-4 py-2.5 hover:bg-teal-50 text-sm border-b border-slate-100 last:border-0 cursor-pointer">
                    <span className="font-semibold text-slate-900">{m.name}</span>
                    {m.genericName && <span className="text-slate-500 ml-1.5 text-xs">({m.genericName})</span>}
                    <span className="text-slate-400 text-xs ml-1.5">{m.form} {m.strength}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {query.trim() && (
            <button onClick={addFreetext} className="flex items-center gap-1.5 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Add as free-text
            </button>
          )}
        </div>
      </div>

      {/* Items */}
      {items.map((item, idx) => {
        const hasWarning = warnings.some(w => w.idx === idx && !item.allergyWarningAcknowledged);
        return (
          <div key={idx} className={`p-4 rounded-xl border ${hasWarning ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 text-sm">{item.medicineName}</p>
                  {item.isFreetextItem && <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-200">NOT IN MASTER</span>}
                </div>
                {item.genericName && <p className="text-xs text-slate-500">{item.genericName}</p>}
              </div>
              <button onClick={() => removeItem(idx)} className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[['dosage', 'Dosage'], ['frequency', 'Frequency'], ['duration', 'Duration'], ['instructions', 'Instructions']].map(([field, label]) => (
                <div key={field}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
                  <input value={item[field] || ''} onChange={(e) => updateItem(idx, field, e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-teal-500" placeholder={field === 'frequency' ? 'e.g. TDS' : field === 'duration' ? '5 days' : ''} />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {items.length === 0 && (
        <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
          <Pill className="w-6 h-6 mx-auto mb-2 opacity-40" />
          Search and add medicines to the prescription
        </div>
      )}
    </div>
  );
};

// ─── Visit Form ───────────────────────────────────────────────────────────────
const VisitForm = ({ token, patient, clinicalProfile, department, existingVisit, onSaved }) => {
  const isGyn = department?.name?.toLowerCase().includes('gyn') || department?.name?.toLowerCase().includes('panchakarma');
  const [form, setForm] = useState({
    chiefComplaint: existingVisit?.chiefComplaint || '',
    vitals: existingVisit?.vitals || {},
    examination: existingVisit?.examination || '',
    diagnosis: existingVisit?.diagnosis || '',
    diagnosisCode: existingVisit?.diagnosisCode || '',
    consultationNotes: existingVisit?.consultationNotes || '',
    advice: existingVisit?.advice || '',
    followUpDate: existingVisit?.followUpDate || '',
    gynTherapyPlan: existingVisit?.gynTherapyPlan || '',
  });
  const [rxItems, setRxItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [err, setErr] = useState('');
  const [savedVisit, setSavedVisit] = useState(existingVisit || null);
  const [rxSaved, setRxSaved] = useState(false);

  const isFinalized = savedVisit?.status === 'Finalized';

  const handleSaveDraft = async () => {
    setSaving(true); setErr('');
    try {
      let visit;
      if (savedVisit) {
        const res = await updateVisit(token, savedVisit._id, form);
        visit = res.data;
      } else {
        const res = await createVisit(token, {
          patientId: patient._id,
          doctorId: patient._doctorId, // Passed in
          departmentId: department?._id,
          ...form,
        });
        visit = res.data;
      }
      setSavedVisit(visit);
      onSaved?.(visit);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleSaveRx = async () => {
    if (!savedVisit || rxItems.length === 0) return;
    setSaving(true); setErr('');
    try {
      await createPrescription(token, savedVisit._id, { visitId: savedVisit._id, items: rxItems });
      setRxSaved(true);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to save prescription');
      if (e.response?.data?.allergyWarnings) {
        setErr(`Allergy warnings require acknowledgement: ${e.response.data.allergyWarnings.map(w => w.medicineName).join(', ')}`);
      }
    }
    setSaving(false);
  };

  const handleFinalize = async () => {
    if (!savedVisit) return;
    setFinalizing(true); setErr('');
    try {
      // Save any pending Rx first
      if (rxItems.length > 0 && !rxSaved) await handleSaveRx();
      const res = await finalizeVisit(token, savedVisit._id);
      setSavedVisit(res.data);
      onSaved?.(res.data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to finalize');
    }
    setFinalizing(false);
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      {isFinalized && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <Lock className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">This visit is finalized and locked. Use the Amendment button to add corrections.</span>
        </div>
      )}
      {err && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{err}</div>}

      {/* Chief Complaint */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">Chief Complaint</label>
        <textarea rows={2} value={form.chiefComplaint} onChange={set('chiefComplaint')} disabled={isFinalized} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50 disabled:text-slate-500" />
      </div>

      {/* Vitals */}
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Vitals</label>
        {isFinalized ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {Object.entries(form.vitals || {}).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{k.replace(/([A-Z])/g, ' $1')}</p>
                <p className="font-bold text-slate-800 text-sm">{v}</p>
              </div>
            ))}
          </div>
        ) : (
          <VitalsForm vitals={form.vitals} onChange={(v) => setForm(f => ({ ...f, vitals: v }))} department={department} />
        )}
      </div>

      {/* Clinical Notes */}
      {[
        ['examination', 'Examination Findings'],
        ['diagnosis', 'Diagnosis'],
        ['consultationNotes', 'Consultation Notes'],
        ['advice', 'Advice / Instructions'],
      ].map(([key, label]) => (
        <div key={key}>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">{label}</label>
          <textarea rows={key === 'consultationNotes' ? 4 : 2} value={form[key]} onChange={set(key)} disabled={isFinalized} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm resize-y focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50 disabled:text-slate-500" />
        </div>
      ))}

      {/* Optional: Diagnosis Code */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Diagnosis Code <span className="text-slate-400 font-normal">(optional, e.g. ICD-10)</span></label>
          <input value={form.diagnosisCode} onChange={set('diagnosisCode')} disabled={isFinalized} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 disabled:bg-slate-50" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">Follow-up Date</label>
          <input type="date" value={form.followUpDate} onChange={set('followUpDate')} disabled={isFinalized} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 disabled:bg-slate-50" />
        </div>
      </div>

      {/* Gyn/Panchakarma therapy plan */}
      {isGyn && (
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Leaf className="w-4 h-4 text-emerald-600" /> Therapy Plan (Gynaecology / Panchakarma)
          </label>
          <textarea rows={3} value={form.gynTherapyPlan} onChange={set('gynTherapyPlan')} disabled={isFinalized} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm resize-y focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50" placeholder="Therapy procedures, schedule, special notes…" />
        </div>
      )}

      {/* Prescription Builder */}
      {!isFinalized && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Pill className="w-4 h-4 text-teal-600" /> Prescription</h3>
            {rxSaved && <span className="text-xs font-bold text-emerald-700 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Saved</span>}
          </div>
          <RxBuilder token={token} items={rxItems} onChange={setRxItems} allergies={clinicalProfile?.allergies || []} />
          {rxItems.length > 0 && !rxSaved && (
            <button onClick={handleSaveRx} disabled={saving} className="mt-3 flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> Save Prescription
            </button>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {!isFinalized && (
        <div className="flex items-center gap-3 pt-2 border-t border-slate-200">
          <button onClick={handleSaveDraft} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl cursor-pointer disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Draft'}
          </button>
          {savedVisit && (
            <button onClick={handleFinalize} disabled={finalizing} className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl cursor-pointer disabled:opacity-50">
              <Send className="w-4 h-4" /> {finalizing ? 'Finalizing…' : 'Finalize Visit'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Visit History Row ────────────────────────────────────────────────────────
const VisitRow = ({ visit, onClick }) => (
  <button onClick={() => onClick(visit)} className="w-full text-left flex items-center gap-4 p-4 bg-white hover:bg-teal-50 rounded-xl border border-slate-200 hover:border-teal-300 transition-all cursor-pointer">
    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${visit.status === 'Finalized' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="font-bold text-sm text-slate-900">{visit.visitDate}</span>
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${visit.status === 'Finalized' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{visit.status}</span>
      </div>
      <p className="text-xs text-slate-500 truncate">{visit.chiefComplaint || 'No chief complaint recorded'}</p>
      {visit.diagnosis && <p className="text-xs text-slate-600 font-medium truncate">Dx: {visit.diagnosis}</p>}
    </div>
    <div className="text-right shrink-0">
      <p className="text-xs text-slate-500">{visit.doctorId?.name}</p>
      <p className="text-[10px] text-slate-400">{visit.departmentId?.name}</p>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
  </button>
);

// ─── Main EMR Page ────────────────────────────────────────────────────────────
export default function EMR() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState('search'); // 'search' | 'patient' | 'visit'
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [clinicalProfile, setClinicalProfile] = useState(null);
  const [visits, setVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const searchRef = useRef(null);

  // Patient search
  const handleSearch = async () => {
    if (!patientQuery.trim()) return;
    setLoading(true);
    try {
      const res = await quickSearchPatients(token, patientQuery);
      setPatientResults(res.data || []);
    } catch { setErr('Search failed'); }
    setLoading(false);
  };

  const selectPatient = async (patient) => {
    setSelectedPatient(patient);
    setMode('patient');
    setLoading(true);
    try {
      const [vRes, cpRes] = await Promise.all([
        getPatientVisits(token, patient._id),
        getClinicalProfile(token, patient._id),
      ]);
      setVisits(vRes.data || []);
      setClinicalProfile(cpRes.data || null);
    } catch { setErr('Failed to load patient data'); }
    setLoading(false);
  };

  const openVisit = (visit) => { setSelectedVisit(visit); setMode('visit'); };

  const startNewVisit = () => { setSelectedVisit(null); setMode('visit'); };

  const onVisitSaved = async (visit) => {
    setSelectedVisit(visit);
    // Refresh visit list
    try {
      const res = await getPatientVisits(token, selectedPatient._id);
      setVisits(res.data || []);
    } catch {}
  };

  const isDoctor = ['doctor', 'admin'].includes(user?.role);
  const canViewOnly = ['nurse', 'receptionist', 'pharmacist', 'patient'].includes(user?.role);

  return (
    <DashboardLayout breadcrumbs={[
      { label: 'Clinical EMR', path: '/portal/emr' },
      ...(selectedPatient ? [{ label: selectedPatient.name }] : []),
      ...(mode === 'visit' ? [{ label: selectedVisit ? `Visit ${selectedVisit.visitDate}` : 'New Visit' }] : []),
    ]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold font-heading text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-teal-600" /> Clinical Records (EMR)
            </h1>
            <p className="text-slate-500 text-sm mt-1">Visit notes, prescriptions, and medical certificates</p>
          </div>
          {mode !== 'search' && (
            <button onClick={() => { setMode('search'); setSelectedPatient(null); setSelectedVisit(null); }} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
              <RotateCcw className="w-4 h-4" /> New Search
            </button>
          )}
        </div>

        {err && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{err}</div>}

        {/* ── Patient Search ── */}
        {mode === 'search' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider mb-4">Find Patient</h2>
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchRef}
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by name, UHID, or phone…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>
              <button onClick={handleSearch} disabled={loading} className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl cursor-pointer disabled:opacity-50">
                {loading ? 'Searching…' : 'Search'}
              </button>
            </div>
            {patientResults.length > 0 && (
              <div className="space-y-2">
                {patientResults.map((p) => (
                  <button key={p._id} onClick={() => selectPatient(p)} className="w-full text-left flex items-center gap-4 p-4 hover:bg-teal-50 rounded-xl border border-slate-200 hover:border-teal-300 transition-all cursor-pointer">
                    <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-extrabold text-sm">{p.name?.charAt(0)}</div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.uhid} &bull; {p.phone}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
            {patientResults.length === 0 && patientQuery && !loading && (
              <p className="text-center text-sm text-slate-400 py-4">No patients found</p>
            )}
          </div>
        )}

        {/* ── Patient View ── */}
        {mode === 'patient' && selectedPatient && (
          <div className="space-y-4">
            <PatientHeader patient={selectedPatient} allergies={clinicalProfile?.allergies} />
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Visit History</h2>
              {isDoctor && (
                <button onClick={startNewVisit} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl cursor-pointer">
                  <Plus className="w-4 h-4" /> New Visit
                </button>
              )}
            </div>
            {loading ? (
              <div className="text-center py-10 text-slate-400">Loading visits…</div>
            ) : visits.length > 0 ? (
              <div className="space-y-2">
                {visits.map((v) => <VisitRow key={v._id} visit={v} onClick={openVisit} />)}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No visits recorded yet</p>
              </div>
            )}
          </div>
        )}

        {/* ── Visit Form / Detail ── */}
        {mode === 'visit' && selectedPatient && (
          <div className="space-y-4">
            <PatientHeader patient={selectedPatient} allergies={clinicalProfile?.allergies} />
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-extrabold text-slate-900 flex items-center gap-2">
                  {selectedVisit ? (
                    <>
                      <FileText className="w-5 h-5 text-teal-600" />
                      Visit — {selectedVisit.visitDate}
                      {selectedVisit.status === 'Finalized' ? (
                        <span className="ml-2 text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1"><Lock className="w-3 h-3" /> Finalized</span>
                      ) : (
                        <span className="ml-2 text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">Draft</span>
                      )}
                    </>
                  ) : (
                    <><Plus className="w-5 h-5 text-teal-600" /> New Visit</>
                  )}
                </h2>
                <button onClick={() => setMode('patient')} className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer">← Back to History</button>
              </div>

              {isDoctor ? (
                <VisitForm
                  token={token}
                  patient={selectedPatient}
                  clinicalProfile={clinicalProfile}
                  department={selectedPatient?.departmentId}
                  existingVisit={selectedVisit}
                  onSaved={onVisitSaved}
                />
              ) : (
                /* Read-only view for non-doctor staff */
                <div className="space-y-4 text-sm text-slate-700">
                  {[
                    ['Chief Complaint', selectedVisit?.chiefComplaint],
                    ['Examination', selectedVisit?.examination],
                    ['Diagnosis', selectedVisit?.diagnosis],
                    ['Consultation Notes', selectedVisit?.consultationNotes],
                    ['Advice', selectedVisit?.advice],
                    ['Follow-up Date', selectedVisit?.followUpDate],
                  ].map(([label, value]) => value ? (
                    <div key={label}>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
                      <p className="bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100 whitespace-pre-wrap">{value}</p>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
