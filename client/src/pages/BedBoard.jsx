import React, { useEffect, useState, useRef } from 'react';
import {
  BedDouble,
  RefreshCw,
  Search,
  Filter,
  Clock,
  User,
  ShieldAlert,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Send,
  FileText,
  Activity,
  X,
  Sparkles,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  fetchBeds,
  fetchBedOccupancy,
  fetchWards,
  updateBedStatus,
  fetchBedEvents,
  transferBed,
  dischargePatient,
  addRoundNote,
} from '../api/api.js';
import PatientBookBedPage from './PatientBookBedPage.jsx';

const STATUS_COLORS = {
  Available: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  Reserved: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-800',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    dot: 'bg-purple-500',
  },
  Occupied: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    text: 'text-sky-800',
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
    dot: 'bg-sky-500',
  },
  Cleaning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  Maintenance: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-800',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    dot: 'bg-rose-500',
  },
};

const BedBoard = () => {
  const { token, user } = useAuth();

  // If role is patient, render Patient Book a Bed page
  if (user?.role === 'patient') {
    return <PatientBookBedPage />;
  }

  const [beds, setBeds] = useState([]);
  const [summary, setSummary] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  // Filters
  const [selectedWard, setSelectedWard] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Bed for Side Panel
  const [selectedBed, setSelectedBed] = useState(null);
  const [panelAction, setPanelAction] = useState(null); // 'transfer', 'discharge', 'maintenance', 'roundNote', 'history'
  const [actionReason, setActionReason] = useState('');
  const [targetBedId, setTargetBedId] = useState('');
  const [holdHours, setHoldHours] = useState(6);
  const [roundNoteText, setRoundNoteText] = useState('');
  const [dischargeSummary, setDischargeSummary] = useState({
    finalDiagnosis: '',
    treatmentGiven: '',
    conditionAtDischarge: 'Stable',
    adviceOnDischarge: '',
    followUp: '',
  });
  const [dischargeOverrideReason, setDischargeOverrideReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [bedEvents, setBedEvents] = useState([]);

  const autoRefreshTimer = useRef(null);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [bedsRes, summaryRes, wardsRes] = await Promise.all([
        fetchBeds(token),
        fetchBedOccupancy(token),
        fetchWards(token).catch(() => ({ data: [] })),
      ]);
      setBeds(bedsRes.data || []);
      setSummary(summaryRes.data || []);
      setWards(wardsRes.data || []);
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      if (!silent) setError(err.response?.data?.message || 'Unable to load hospital bed board.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // 20-second auto-refresh
    autoRefreshTimer.current = setInterval(() => {
      loadData(true);
    }, 20000);
    return () => clearInterval(autoRefreshTimer.current);
  }, [token]);

  // Handle bed click to open side panel
  const handleBedClick = (bed) => {
    setSelectedBed(bed);
    setPanelAction(null);
    setActionReason('');
    setTargetBedId('');
    setRoundNoteText('');
    setBedEvents([]);
  };

  // Close panel
  const closePanel = () => {
    setSelectedBed(null);
    setPanelAction(null);
  };

  // Status transitions
  const handleStatusChange = async (targetStatus, reason = '') => {
    if (!selectedBed) return;
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await updateBedStatus(token, selectedBed._id, {
        status: targetStatus,
        reason,
        holdHours,
      });
      setSuccessMsg(`Bed ${selectedBed.bedNumber} status updated to ${targetStatus}.`);
      closePanel();
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update bed status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Bed transfer
  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBed?.currentAdmissionId?._id || !targetBedId || !actionReason.trim()) {
      setError('Target bed and reason are required for transfer.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await transferBed(token, selectedBed.currentAdmissionId._id, {
        toBedId: targetBedId,
        reason: actionReason,
      });
      setSuccessMsg(`Patient transferred successfully to target bed.`);
      closePanel();
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Bed transfer failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Discharge patient
  const handleDischargeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBed?.currentAdmissionId?._id) return;
    setActionLoading(true);
    setError('');
    try {
      await dischargePatient(token, selectedBed.currentAdmissionId._id, {
        dischargeSummary,
        dischargeOverrideReason: user.role === 'admin' ? dischargeOverrideReason : undefined,
      });
      setSuccessMsg(`Patient discharged successfully. Bed ${selectedBed.bedNumber} is now in Cleaning.`);
      closePanel();
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Patient discharge failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Add round note
  const handleRoundNoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBed?.currentAdmissionId?._id || !roundNoteText.trim()) return;
    setActionLoading(true);
    setError('');
    try {
      await addRoundNote(token, {
        admissionId: selectedBed.currentAdmissionId._id,
        note: roundNoteText,
      });
      setSuccessMsg('Doctor round note recorded successfully.');
      setPanelAction(null);
      setRoundNoteText('');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record round note.');
    } finally {
      setActionLoading(false);
    }
  };

  // Load bed events audit ledger (Admin)
  const loadBedEvents = async (bedId) => {
    try {
      const res = await fetchBedEvents(token, bedId);
      setBedEvents(res.data || []);
      setPanelAction('history');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bed history.');
    }
  };

  // Filtered beds
  const filteredBeds = beds.filter((b) => {
    if (selectedWard !== 'ALL' && b.wardId?._id !== selectedWard) return false;
    if (selectedStatus !== 'ALL' && b.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const bedNumMatch = b.bedNumber?.toLowerCase().includes(q);
      const wardMatch = b.wardId?.name?.toLowerCase().includes(q);
      const occupantNameMatch = b.currentAdmissionId?.patientId?.name?.toLowerCase().includes(q);
      const uhidMatch = b.currentAdmissionId?.patientId?.uhid?.toLowerCase().includes(q);
      return bedNumMatch || wardMatch || occupantNameMatch || uhidMatch;
    }
    return true;
  });

  // Group beds by ward
  const bedsByWard = filteredBeds.reduce((acc, bed) => {
    const wardName = bed.wardId?.name || 'Unassigned Ward';
    if (!acc[wardName]) acc[wardName] = [];
    acc[wardName].push(bed);
    return acc;
  }, {});

  // Overall totals
  const totalBedsCount = beds.length;
  const availableBedsCount = beds.filter((b) => b.status === 'Available').length;
  const occupiedBedsCount = beds.filter((b) => b.status === 'Occupied').length;
  const reservedBedsCount = beds.filter((b) => b.status === 'Reserved').length;
  const cleaningBedsCount = beds.filter((b) => b.status === 'Cleaning').length;
  const maintenanceBedsCount = beds.filter((b) => b.status === 'Maintenance').length;

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Inpatient (IPD)' }, { label: 'Bed Board' }]}>
      <div className="space-y-6">
        {/* Header with Live Stats & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-heading text-slate-900">Hospital Bed Board</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" /> Live Board
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Interactive IPD ward occupancy, bed turns, maintenance reports, and transfers.
              {lastUpdated && <span className="ml-2 font-mono text-slate-400">Last updated: {lastUpdated} (20s sync)</span>}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData()}
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

        {/* Occupancy Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase text-slate-400">Total Beds</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{totalBedsCount}</p>
            <p className="mt-1 text-[11px] text-slate-500 font-medium">All physical beds</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase text-emerald-700">Available</p>
            <p className="mt-2 text-2xl font-black text-emerald-800">{availableBedsCount}</p>
            <p className="mt-1 text-[11px] text-emerald-700 font-medium">Ready for admit</p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase text-sky-700">Occupied</p>
            <p className="mt-2 text-2xl font-black text-sky-800">{occupiedBedsCount}</p>
            <p className="mt-1 text-[11px] text-sky-700 font-medium">Active patients</p>
          </div>
          <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase text-purple-700">Reserved</p>
            <p className="mt-2 text-2xl font-black text-purple-800">{reservedBedsCount}</p>
            <p className="mt-1 text-[11px] text-purple-700 font-medium">Held for bookings</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase text-amber-700">Cleaning</p>
            <p className="mt-2 text-2xl font-black text-amber-800">{cleaningBedsCount}</p>
            <p className="mt-1 text-[11px] text-amber-700 font-medium">Turnover required</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase text-rose-700">Maintenance</p>
            <p className="mt-2 text-2xl font-black text-rose-800">{maintenanceBedsCount}</p>
            <p className="mt-1 text-[11px] text-rose-700 font-medium">Out of service</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by bed, patient name, UHID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>

            {/* Ward select */}
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:border-teal-500 focus:outline-none"
            >
              <option value="ALL">All Wards ({wards.length})</option>
              {wards.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name} ({w.type})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'Available', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition-all ${
                  selectedStatus === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Wards & Bed Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="mx-auto h-8 w-8 text-teal-600 animate-spin" />
            <p className="mt-3 text-sm font-bold text-slate-700">Loading hospital bed board...</p>
          </div>
        ) : Object.keys(bedsByWard).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <BedDouble className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">No beds match your filter criteria</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the status or ward filter.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(bedsByWard).map(([wardName, wardBeds]) => (
              <section key={wardName} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                      <BedDouble className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 font-heading">
                        {wardName}
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        {wardBeds[0]?.wardId?.type} Ward • {wardBeds.length} total beds • ₹{(wardBeds[0]?.dailyCharge / 100).toFixed(0)}/day
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                      {wardBeds.filter((b) => b.status === 'Available').length} Available
                    </span>
                    <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100">
                      {wardBeds.filter((b) => b.status === 'Occupied').length} Occupied
                    </span>
                  </div>
                </div>

                {/* Bed Tiles Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {wardBeds.map((bed) => {
                    const styling = STATUS_COLORS[bed.status] || STATUS_COLORS.Available;
                    const isSelected = selectedBed?._id === bed._id;
                    const occupant = bed.currentAdmissionId?.patientId;

                    return (
                      <div
                        key={bed._id}
                        onClick={() => handleBedClick(bed)}
                        className={`group relative rounded-xl border p-4 cursor-pointer transition-all ${styling.bg} ${
                          isSelected
                            ? 'ring-2 ring-teal-600 shadow-md border-teal-500 scale-[1.01]'
                            : `${styling.border} hover:shadow-md hover:border-slate-400`
                        }`}
                      >
                        {/* Top: Bed Number & Status */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${styling.dot}`} />
                            <span className="text-base font-black text-slate-900 font-heading">
                              {bed.bedNumber}
                            </span>
                          </div>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${styling.badge}`}>
                            {bed.status}
                          </span>
                        </div>

                        {/* Middle: Occupant or Reservation details */}
                        <div className="mt-3 min-h-[38px]">
                          {bed.status === 'Occupied' && occupant && (
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                                <User className="h-3 w-3 text-sky-600 shrink-0" />
                                {occupant.name}
                              </p>
                              <p className="text-[10px] font-mono text-slate-500">
                                UHID: {occupant.uhid}
                              </p>
                            </div>
                          )}

                          {bed.status === 'Reserved' && (
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-purple-900 truncate">
                                Held for: {bed.heldForBookingId?.patientId?.name || 'Booking hold'}
                              </p>
                              {bed.holdUntil && (
                                <p className="text-[10px] text-purple-700 font-mono flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Until {new Date(bed.holdUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </div>
                          )}

                          {bed.status === 'Available' && (
                            <p className="text-xs text-emerald-700 font-medium">Ready for immediate admit</p>
                          )}

                          {bed.status === 'Cleaning' && (
                            <p className="text-xs text-amber-700 font-medium">Turnover & sanitation required</p>
                          )}

                          {bed.status === 'Maintenance' && (
                            <p className="text-xs text-rose-700 font-medium truncate" title={bed.maintenanceReason}>
                              {bed.maintenanceReason || 'Out of service'}
                            </p>
                          )}
                        </div>

                        {/* Bottom: Rate and Click Action hint */}
                        <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-600">₹{(bed.dailyCharge / 100).toFixed(0)}/day</span>
                          <span className="text-[10px] font-bold text-teal-700 group-hover:underline">
                            Click for actions →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Slide-over Action Panel for Selected Bed */}
        {selectedBed && (
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-all">
            {/* Panel Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black">
                  <BedDouble className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-heading">
                    Bed {selectedBed.bedNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedBed.wardId?.name} • {selectedBed.wardId?.type} Ward
                  </p>
                </div>
              </div>
              <button
                onClick={closePanel}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Status and Details Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Status</span>
                  <StatusBadge value={selectedBed.status} size="sm" />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Daily Charge</span>
                  <span className="font-bold text-slate-900">₹{(selectedBed.dailyCharge / 100).toFixed(2)}</span>
                </div>
                {selectedBed.holdUntil && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Hold Expires</span>
                    <span className="font-mono font-bold text-purple-700">
                      {new Date(selectedBed.holdUntil).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {selectedBed.maintenanceReason && (
                  <div className="pt-2 border-t border-slate-200 text-xs">
                    <span className="font-bold text-rose-700 block">Maintenance Reason:</span>
                    <span className="text-slate-700">{selectedBed.maintenanceReason}</span>
                  </div>
                )}
              </div>

              {/* Occupant Details (if occupied) */}
              {selectedBed.status === 'Occupied' && selectedBed.currentAdmissionId && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-2">
                  <h4 className="text-xs font-black uppercase text-sky-800 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-sky-600" /> Current Inpatient
                  </h4>
                  <p className="text-sm font-black text-slate-900">
                    {selectedBed.currentAdmissionId.patientId?.name || 'Occupied'}
                  </p>
                  <p className="text-xs font-mono text-slate-600">
                    UHID: {selectedBed.currentAdmissionId.patientId?.uhid || '***'}
                  </p>
                  <p className="text-xs font-mono text-slate-600">
                    Admission No: {selectedBed.currentAdmissionId.admissionNumber}
                  </p>
                </div>
              )}

              {/* Role-Valid Actions Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Authorized Actions for {user.role}
                </h4>

                {/* 1. Nurse Actions */}
                {user.role === 'nurse' && (
                  <div className="space-y-2">
                    {selectedBed.status === 'Cleaning' && (
                      <button
                        onClick={() => handleStatusChange('Available')}
                        disabled={actionLoading}
                        className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Mark Sanitized & Available
                      </button>
                    )}

                    {selectedBed.status === 'Available' && (
                      <button
                        onClick={() => setPanelAction('maintenance')}
                        className="w-full rounded-xl border border-rose-300 bg-rose-50 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-100 flex items-center justify-center gap-2"
                      >
                        <AlertTriangle className="h-4 w-4 text-rose-600" /> Report Maintenance
                      </button>
                    )}

                    {selectedBed.status === 'Occupied' && (
                      <button
                        onClick={() => setPanelAction('transfer')}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center justify-center gap-2"
                      >
                        <ArrowRightLeft className="h-4 w-4" /> Transfer Patient Bed
                      </button>
                    )}
                  </div>
                )}

                {/* 2. Receptionist Actions */}
                {user.role === 'receptionist' && (
                  <div className="space-y-2">
                    {selectedBed.status === 'Available' && (
                      <>
                        <button
                          onClick={() => handleStatusChange('Reserved')}
                          disabled={actionLoading}
                          className="w-full rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 flex items-center justify-center gap-2"
                        >
                          <Clock className="h-4 w-4" /> Hold Bed (6h Reservation)
                        </button>
                      </>
                    )}

                    {selectedBed.status === 'Reserved' && (
                      <button
                        onClick={() => handleStatusChange('Available')}
                        disabled={actionLoading}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center justify-center gap-2"
                      >
                        <XCircle className="h-4 w-4 text-rose-600" /> Release Bed to Available
                      </button>
                    )}

                    {selectedBed.status === 'Occupied' && (
                      <button
                        onClick={() => setPanelAction('transfer')}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center justify-center gap-2"
                      >
                        <ArrowRightLeft className="h-4 w-4" /> Transfer Patient Bed
                      </button>
                    )}
                  </div>
                )}

                {/* 3. Doctor Actions */}
                {user.role === 'doctor' && (
                  <div className="space-y-2">
                    {selectedBed.status === 'Occupied' && selectedBed.currentAdmissionId?.patientId?.name !== 'Occupied' && (
                      <>
                        <button
                          onClick={() => setPanelAction('roundNote')}
                          className="w-full rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-teal-700 flex items-center justify-center gap-2"
                        >
                          <FileText className="h-4 w-4" /> Add Doctor Round Note
                        </button>
                        <button
                          onClick={() => setPanelAction('transfer')}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center justify-center gap-2"
                        >
                          <ArrowRightLeft className="h-4 w-4" /> Transfer Bed
                        </button>
                        <button
                          onClick={() => setPanelAction('discharge')}
                          className="w-full rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Discharge Patient
                        </button>
                      </>
                    )}
                    {selectedBed.status === 'Occupied' && selectedBed.currentAdmissionId?.patientId?.name === 'Occupied' && (
                      <p className="text-xs text-slate-400 italic">
                        This bed is assigned to another attending physician.
                      </p>
                    )}
                  </div>
                )}

                {/* 4. Admin Actions */}
                {user.role === 'admin' && (
                  <div className="space-y-2">
                    {selectedBed.status === 'Cleaning' && (
                      <button
                        onClick={() => handleStatusChange('Available')}
                        disabled={actionLoading}
                        className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Mark Sanitized & Available
                      </button>
                    )}

                    {selectedBed.status === 'Available' && (
                      <>
                        <button
                          onClick={() => handleStatusChange('Reserved')}
                          disabled={actionLoading}
                          className="w-full rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700 flex items-center justify-center gap-2"
                        >
                          <Clock className="h-4 w-4" /> Hold Bed Manually
                        </button>
                        <button
                          onClick={() => setPanelAction('maintenance')}
                          className="w-full rounded-xl border border-rose-300 bg-rose-50 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-100 flex items-center justify-center gap-2"
                        >
                          <AlertTriangle className="h-4 w-4 text-rose-600" /> Report Maintenance
                        </button>
                      </>
                    )}

                    {selectedBed.status === 'Reserved' && (
                      <button
                        onClick={() => handleStatusChange('Available')}
                        disabled={actionLoading}
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center justify-center gap-2"
                      >
                        <XCircle className="h-4 w-4 text-rose-600" /> Release Bed Hold
                      </button>
                    )}

                    {selectedBed.status === 'Maintenance' && (
                      <div className="space-y-2 pt-2">
                        <input
                          type="text"
                          placeholder="Maintenance clearance certificate/note *"
                          value={actionReason}
                          onChange={(e) => setActionReason(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                        />
                        <button
                          onClick={() => handleStatusChange('Available', actionReason)}
                          disabled={actionLoading || !actionReason.trim()}
                          className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Clear Maintenance to Available
                        </button>
                      </div>
                    )}

                    {selectedBed.status === 'Occupied' && (
                      <>
                        <button
                          onClick={() => setPanelAction('transfer')}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center justify-center gap-2"
                        >
                          <ArrowRightLeft className="h-4 w-4" /> Transfer Bed
                        </button>
                        <button
                          onClick={() => setPanelAction('discharge')}
                          className="w-full rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Discharge Override
                        </button>
                      </>
                    )}

                    {/* View Bed Audit Ledger */}
                    <button
                      onClick={() => loadBedEvents(selectedBed._id)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5"
                    >
                      <History className="h-4 w-4 text-slate-500" /> View Bed Event Audit Ledger
                    </button>
                  </div>
                )}
              </div>

              {/* Sub-Panel: Report Maintenance Form */}
              {panelAction === 'maintenance' && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-rose-900">Report Bed Maintenance</h4>
                  <textarea
                    rows={2}
                    placeholder="Specify maintenance reason (electrical, plumbing, sanitization)..."
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="w-full rounded-xl border border-rose-200 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPanelAction(null)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('Maintenance', actionReason)}
                      disabled={actionLoading || !actionReason.trim()}
                      className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      Submit Maintenance
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-Panel: Transfer Bed Form */}
              {panelAction === 'transfer' && (
                <form onSubmit={handleTransferSubmit} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900">Transfer Patient to New Bed</h4>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Target Available Bed *
                    </label>
                    <select
                      value={targetBedId}
                      onChange={(e) => setTargetBedId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs font-medium"
                      required
                    >
                      <option value="">Select target bed</option>
                      {beds
                        .filter((b) => b.status === 'Available' && b._id !== selectedBed._id)
                        .map((b) => (
                          <option key={b._id} value={b._id}>
                            {b.wardId?.name} — Bed {b.bedNumber} (₹{(b.dailyCharge / 100).toFixed(0)}/day)
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Reason for Transfer *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Clinical escalation, patient preference..."
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPanelAction(null)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      Confirm Transfer
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-Panel: Discharge Form */}
              {panelAction === 'discharge' && (
                <form onSubmit={handleDischargeSubmit} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900">Complete Discharge Summary</h4>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Final Diagnosis *</label>
                    <input
                      type="text"
                      required
                      value={dischargeSummary.finalDiagnosis}
                      onChange={(e) => setDischargeSummary({ ...dischargeSummary, finalDiagnosis: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Treatment Given *</label>
                    <textarea
                      rows={2}
                      required
                      value={dischargeSummary.treatmentGiven}
                      onChange={(e) => setDischargeSummary({ ...dischargeSummary, treatmentGiven: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Condition at Discharge *</label>
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
                    </select>
                  </div>
                  {user.role === 'admin' && (
                    <div>
                      <label className="text-[10px] font-bold uppercase text-rose-600 block mb-1">
                        Admin Override Reason *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="State why admin is discharging..."
                        value={dischargeOverrideReason}
                        onChange={(e) => setDischargeOverrideReason(e.target.value)}
                        className="w-full rounded-xl border border-rose-300 p-2 text-xs"
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPanelAction(null)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      Discharge & Free Bed
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-Panel: Doctor Round Note */}
              {panelAction === 'roundNote' && (
                <form onSubmit={handleRoundNoteSubmit} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900">Add Doctor Round Note</h4>
                  <textarea
                    rows={3}
                    required
                    placeholder="Document clinical assessment, progress, and daily treatment instructions..."
                    value={roundNoteText}
                    onChange={(e) => setRoundNoteText(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPanelAction(null)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading || !roundNoteText.trim()}
                      className="rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      Save Round Note
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-Panel: Bed Event Audit Ledger (Admin) */}
              {panelAction === 'history' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-slate-700">Audit Ledger (Append-Only)</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{bedEvents.length} events</span>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {bedEvents.map((ev, i) => (
                      <div key={i} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-900">{ev.action}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(ev.at).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold">{ev.from}</span>
                          <span>→</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold">{ev.to}</span>
                        </div>
                        {ev.reason && <p className="text-[11px] text-slate-500 italic">{ev.reason}</p>}
                        <p className="text-[10px] text-slate-400">By: {ev.by?.name} ({ev.by?.role})</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BedBoard;
