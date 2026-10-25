import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  HeartPulse,
  LogOut,
  Plus,
  Printer,
  RefreshCw,
  Search,
  User,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  acknowledgeNursingRecord,
  addRoundNote,
  dischargePatient,
  fetchAdmissions,
  fetchBeds,
  fetchDoctorNeedsReview,
  transferBed,
} from '../api/api.js';

const DoctorInpatientsPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [inpatients, setInpatients] = useState([]);
  const [needsReviewList, setNeedsReviewList] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showRoundNoteModal, setShowRoundNoteModal] = useState(null); // admission
  const [showTransferModal, setShowTransferModal] = useState(null); // admission
  const [showDischargeModal, setShowDischargeModal] = useState(null); // admission

  // Form states
  const [roundNoteText, setRoundNoteText] = useState('');
  const [transferTargetBedId, setTransferTargetBedId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [dischargeSummary, setDischargeSummary] = useState({
    finalDiagnosis: '',
    treatmentGiven: '',
    conditionAtDischarge: 'Stable',
    adviceOnDischarge: '',
    followUp: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [admRes, revRes, bedRes] = await Promise.all([
        fetchAdmissions(token, { status: 'Admitted', myPatientsOnly: 'true' }),
        fetchDoctorNeedsReview(token),
        fetchBeds(token, { status: 'Available' }),
      ]);
      setInpatients(admRes.data || []);
      setNeedsReviewList(revRes.data || []);
      setAvailableBeds(bedRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inpatients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  // Acknowledge abnormal nursing record
  const handleAcknowledge = async (recordId) => {
    try {
      await acknowledgeNursingRecord(token, recordId);
      setSuccessMsg('Abnormal entry reviewed and acknowledged.');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to acknowledge record.');
    }
  };

  // Submit round note
  const handleRoundNoteSubmit = async (e) => {
    e.preventDefault();
    if (!showRoundNoteModal || !roundNoteText.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await addRoundNote(token, {
        admissionId: showRoundNoteModal._id,
        note: roundNoteText,
      });
      setSuccessMsg('Doctor round note saved.');
      setShowRoundNoteModal(null);
      setRoundNoteText('');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save round note.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit transfer
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
      setSuccessMsg('Bed transfer completed.');
      setShowTransferModal(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Bed transfer failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit discharge
  const handleDischargeSubmit = async (e) => {
    e.preventDefault();
    if (!showDischargeModal) return;
    setSubmitting(true);
    setError('');
    try {
      await dischargePatient(token, showDischargeModal._id, {
        dischargeSummary,
      });
      setSuccessMsg('Patient discharged successfully.');
      const admId = showDischargeModal._id;
      setShowDischargeModal(null);
      loadData();
      navigate(`/portal/ipd/discharge-summary/${admId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Discharge failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Inpatient (IPD)' }, { label: 'My In-patients' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-heading text-slate-900">My In-patients (Physician Desk)</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800">
                <HeartPulse className="h-3.5 w-3.5 text-teal-600" /> Attending Physician
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Manage your admitted patients, document daily ward rounds, review abnormal nursing entries, and complete discharges.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/portal/beds')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              Bed Board View
            </button>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
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

        {/* Section 1: "Needs Review" Critical Alert Queue */}
        {needsReviewList.length > 0 && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50/70 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <h2 className="text-sm font-black uppercase tracking-wider text-rose-950 font-heading">
                  Needs Review: {needsReviewList.length} Abnormal Nursing Entries
                </h2>
              </div>
              <span className="text-xs text-rose-800 font-bold">Action Required</span>
            </div>
            <p className="text-xs text-rose-800">
              The following vital signs or observations triggered clinical threshold alerts and require physician acknowledgment.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {needsReviewList.map((entry) => (
                <div key={entry._id} className="p-3.5 bg-white rounded-xl border border-rose-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-900">{entry.patientId?.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        UHID: {entry.patientId?.uhid} • Adm: {entry.admissionId?.admissionNumber}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(entry.observedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {entry.abnormalFlags && entry.abnormalFlags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.abnormalFlags.map((flag, idx) => (
                        <span key={idx} className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}

                  {entry.note && (
                    <p className="text-xs text-slate-600 italic">"{entry.note}"</p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Recorded by: {entry.recordedBy?.name}
                    </span>
                    <button
                      onClick={() => handleAcknowledge(entry._id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-teal-700 transition-colors"
                    >
                      <Check className="h-3 w-3" /> Acknowledge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 2: Admitted Patients Directory */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 font-heading">
              Admitted Inpatients ({inpatients.length})
            </h2>
            <span className="text-xs text-slate-400 font-bold">Under My Care</span>
          </div>

          {loading ? (
            <p className="py-12 text-center text-xs text-slate-400 font-bold">Loading in-patients...</p>
          ) : inpatients.length === 0 ? (
            <div className="py-16 text-center">
              <User className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-bold text-slate-700">No active in-patients</p>
              <p className="text-xs text-slate-400">You currently have no admitted patients assigned to your care.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Patient (UHID)</th>
                    <th className="py-3 px-4">Bed & Ward</th>
                    <th className="py-3 px-4">Admission Ref</th>
                    <th className="py-3 px-4">Admitted Date</th>
                    <th className="py-3 px-4">Provisional Diagnosis</th>
                    <th className="py-3 px-4 text-right">Physician Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inpatients.map((adm) => (
                    <tr key={adm._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-black text-slate-900">{adm.patientId?.name}</p>
                        <p className="text-[11px] font-mono text-slate-500">UHID: {adm.patientId?.uhid}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                          Bed {adm.bedId?.bedNumber}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">₹{(adm.bedId?.dailyCharge / 100).toFixed(0)}/day</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-700">
                        {adm.admissionNumber}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                        {new Date(adm.admittedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {adm.provisionalDiagnosis || adm.reasonForAdmission}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setShowRoundNoteModal(adm);
                            setRoundNoteText('');
                          }}
                          className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-teal-700 inline-flex items-center gap-1"
                        >
                          <FileText className="h-3 w-3" /> Round Note
                        </button>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal: Add Doctor Round Note */}
        {showRoundNoteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900">
                  Doctor Round Note: {showRoundNoteModal.patientId?.name}
                </h3>
                <button onClick={() => setShowRoundNoteModal(null)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <form onSubmit={handleRoundNoteSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Clinical Progress & Treatment Plan *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Document clinical observations, investigation reviews, medication adjustments, and daily orders..."
                    value={roundNoteText}
                    onChange={(e) => setRoundNoteText(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRoundNoteModal(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !roundNoteText.trim()}
                    className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save Round Note'}
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
                <h3 className="text-base font-extrabold text-slate-900">Transfer Inpatient Bed</h3>
                <button onClick={() => setShowTransferModal(null)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Select Target Available Bed *</label>
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
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Transfer Clinical Reason *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ICU step-down, private suite upgrade..."
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
                  Physician Discharge Summary: {showDischargeModal.patientId?.name}
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

export default DoctorInpatientsPage;
