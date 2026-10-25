import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BedDouble,
  CheckCircle2,
  Clock,
  Edit2,
  History,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Settings,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  createBed,
  createWard,
  fetchBedEvents,
  fetchBeds,
  fetchWards,
  updateBed,
  updateBedStatus,
  updateWard,
} from '../api/api.js';

const WardsSettingsPage = () => {
  const { token, user } = useAuth();

  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showWardModal, setShowWardModal] = useState(false);
  const [showBedModal, setShowBedModal] = useState(false);
  const [showEventsModal, setShowEventsModal] = useState(null); // bed
  const [bedEvents, setBedEvents] = useState([]);

  // Ward form
  const [wardName, setWardName] = useState('');
  const [wardType, setWardType] = useState('General');

  // Bed form
  const [selectedWardId, setSelectedWardId] = useState('');
  const [bedNumber, setBedNumber] = useState('');
  const [dailyChargeRupees, setDailyChargeRupees] = useState(800);
  const [editingBed, setEditingBed] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [wRes, bRes] = await Promise.all([fetchWards(token), fetchBeds(token)]);
      setWards(wRes.data || []);
      setBeds(bRes.data || []);
      if (wRes.data?.length > 0 && !selectedWardId) {
        setSelectedWardId(wRes.data[0]._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ward settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  // Submit Ward
  const handleWardSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await createWard(token, { name: wardName, type: wardType, isActive: true });
      setSuccessMsg(`Ward '${wardName}' created.`);
      setShowWardModal(false);
      setWardName('');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create ward.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Bed (Create or Edit)
  const handleBedSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const dailyCharge = Math.round(Number(dailyChargeRupees) * 100);
      if (editingBed) {
        await updateBed(token, editingBed._id, {
          bedNumber,
          dailyCharge,
        });
        setSuccessMsg(`Bed ${bedNumber} updated.`);
      } else {
        await createBed(token, {
          wardId: selectedWardId,
          bedNumber,
          dailyCharge,
          status: 'Available',
        });
        setSuccessMsg(`Bed ${bedNumber} added.`);
      }
      setShowBedModal(false);
      setEditingBed(null);
      setBedNumber('');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save bed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Bed Event History
  const handleViewEvents = async (bed) => {
    setShowEventsModal(bed);
    try {
      const res = await fetchBedEvents(token, bed._id);
      setBedEvents(res.data || []);
    } catch (err) {
      setError('Failed to fetch bed history.');
    }
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Inpatient (IPD)' }, { label: 'Wards & Beds Settings' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-heading text-slate-900">Wards & Beds Configuration</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white">
                Admin Settings
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Manage physical wards, configure bed tariffs, inspect audit ledgers, and manage maintenance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setWardName('');
                setShowWardModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
            >
              <Plus className="h-4 w-4" /> Add Ward
            </button>
            <button
              onClick={() => {
                setEditingBed(null);
                setBedNumber('');
                setShowBedModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" /> Add Bed
            </button>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
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

        {/* Wards Directory Cards */}
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Hospital Wards ({wards.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {wards.map((w) => {
              const wardBedList = beds.filter((b) => b.wardId?._id === w._id);
              return (
                <div key={w._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {w.type}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${w.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{w.name}</h3>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span>{wardBedList.length} physical beds</span>
                    <span className="font-bold text-teal-700">
                      {wardBedList.filter((b) => b.status === 'Available').length} available
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Beds Table with Action & History */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 font-heading">
              Physical Bed Directory & Tariffs ({beds.length})
            </h2>
            <span className="text-xs text-slate-400 font-mono">Paise integer backing</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Bed Number</th>
                  <th className="py-3 px-4">Ward</th>
                  <th className="py-3 px-4">Ward Type</th>
                  <th className="py-3 px-4">Daily Tariff</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Maintenance Reason</th>
                  <th className="py-3 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {beds.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-black text-slate-900 font-heading">{b.bedNumber}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{b.wardId?.name}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{b.wardId?.type}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      ₹{(b.dailyCharge / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge value={b.status} size="xs" />
                    </td>
                    <td className="py-3 px-4 text-xs text-rose-700 truncate max-w-xs">
                      {b.maintenanceReason || '—'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditingBed(b);
                          setSelectedWardId(b.wardId?._id);
                          setBedNumber(b.bedNumber);
                          setDailyChargeRupees(b.dailyCharge / 100);
                          setShowBedModal(true);
                        }}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1"
                      >
                        <Edit2 className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleViewEvents(b)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-teal-700 hover:bg-teal-50 inline-flex items-center gap-1"
                      >
                        <History className="h-3 w-3" /> Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Modal: Add Ward */}
        {showWardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900">Create New Ward</h3>
                <button onClick={() => setShowWardModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <form onSubmit={handleWardSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Ward Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Surgical Ward 2"
                    value={wardName}
                    onChange={(e) => setWardName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Ward Type *</label>
                  <select
                    value={wardType}
                    onChange={(e) => setWardType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  >
                    <option value="General">General</option>
                    <option value="Pediatric">Pediatric</option>
                    <option value="Maternity/Gynae">Maternity/Gynae</option>
                    <option value="Private">Private</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowWardModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !wardName.trim()}
                    className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create Ward'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add or Edit Bed */}
        {showBedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingBed ? `Edit Bed ${editingBed.bedNumber}` : 'Add Physical Bed'}
                </h3>
                <button onClick={() => setShowBedModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <form onSubmit={handleBedSubmit} className="space-y-4">
                {!editingBed && (
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Ward *</label>
                    <select
                      value={selectedWardId}
                      onChange={(e) => setSelectedWardId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      required
                    >
                      {wards.map((w) => (
                        <option key={w._id} value={w._id}>{w.name} ({w.type})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Bed Number / Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. G-106, P-205"
                    value={bedNumber}
                    onChange={(e) => setBedNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Daily Charge (₹ Rupees) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    required
                    value={dailyChargeRupees}
                    onChange={(e) => setDailyChargeRupees(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-mono font-bold"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Backed as integer paise ({dailyChargeRupees * 100} paise).</p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowBedModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !bedNumber.trim()}
                    className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save Bed'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Bed Event Audit Ledger */}
        {showEventsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-teal-600" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    Audit Ledger: Bed {showEventsModal.bedNumber}
                  </h3>
                </div>
                <button onClick={() => setShowEventsModal(null)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <div className="text-xs text-slate-500">
                Append-only immutable record of all transitions, admissions, holds, and turnover events.
              </div>

              <div className="space-y-2.5">
                {bedEvents.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400 font-bold">No event records found</p>
                ) : (
                  bedEvents.map((ev, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-slate-900 uppercase tracking-wider">{ev.action}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(ev.at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-700 font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">{ev.from}</span>
                        <span>→</span>
                        <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">{ev.to}</span>
                      </div>
                      {ev.reason && (
                        <p className="text-[11px] text-slate-600 italic">"{ev.reason}"</p>
                      )}
                      <p className="text-[10px] text-slate-400 pt-1">
                        By: <strong className="text-slate-700">{ev.by?.name}</strong> ({ev.by?.role})
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default WardsSettingsPage;
