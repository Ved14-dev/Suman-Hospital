import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Send,
  UserCheck,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  approveBedBooking,
  cancelBedBooking,
  createBedBooking,
  fetchBedBookings,
  fetchBeds,
  fetchDoctors,
  fetchWards,
  quickSearchPatients,
  rejectBedBooking,
} from '../api/api';
import { useNavigate } from 'react-router-dom';

const BedRequestsQueue = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [wardFilter, setWardFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(null); // booking
  const [showRejectModal, setShowRejectModal] = useState(null); // booking

  // Available beds for approval
  const [availableBeds, setAvailableBeds] = useState([]);
  const [selectedBedId, setSelectedBedId] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New booking form state
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newWardType, setNewWardType] = useState('General');
  const [newExpectedDate, setNewExpectedDate] = useState('');
  const [newDoctorId, setNewDoctorId] = useState('');
  const [newReason, setNewReason] = useState('');

  const [doctors, setDoctors] = useState([]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const maxDateStr = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [bookRes, docRes] = await Promise.all([
        fetchBedBookings(token),
        fetchDoctors().catch(() => ({ data: [] })),
      ]);
      setBookings(bookRes.data || []);
      setDoctors(docRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bed booking queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      setNewExpectedDate(todayStr);
      loadData();
    }
  }, [token]);

  // Autocomplete patient search
  useEffect(() => {
    if (patientSearchTerm.trim().length >= 2) {
      quickSearchPatients(token, patientSearchTerm)
        .then((res) => setPatientSearchResults(res.data || []))
        .catch(() => setPatientSearchResults([]));
    } else {
      setPatientSearchResults([]);
    }
  }, [patientSearchTerm]);

  // Open approve modal & fetch available beds
  const handleOpenApprove = async (booking) => {
    setShowApproveModal(booking);
    setDecisionReason('');
    setSelectedBedId('');
    try {
      const bedsRes = await fetchBeds(token, { status: 'Available' });
      // Filter matching ward type
      const matchingBeds = (bedsRes.data || []).filter(
        (b) => b.wardId?.type === booking.wardType && b.status === 'Available'
      );
      setAvailableBeds(matchingBeds);
      if (matchingBeds.length > 0) setSelectedBedId(matchingBeds[0]._id);
    } catch (err) {
      setError('Failed to fetch available beds.');
    }
  };

  // Submit Approval
  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!showApproveModal) return;
    setSubmitting(true);
    setError('');
    try {
      await approveBedBooking(token, showApproveModal._id, {
        bedId: showApproveModal.expectedDate === todayStr ? selectedBedId : undefined,
        reason: decisionReason,
      });
      setSuccessMsg(`Booking ${showApproveModal.bookingNumber} approved.`);
      setShowApproveModal(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Approval failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Rejection
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!showRejectModal) return;
    setSubmitting(true);
    setError('');
    try {
      await rejectBedBooking(token, showRejectModal._id, {
        reason: decisionReason || 'Ward at capacity',
      });
      setSuccessMsg(`Booking ${showRejectModal.bookingNumber} rejected.`);
      setShowRejectModal(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Rejection failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel booking
  const handleCancel = async (bookingId) => {
    if (!window.confirm('Cancel this bed booking request?')) return;
    try {
      await cancelBedBooking(token, bookingId, { reason: 'Cancelled by front desk' });
      setSuccessMsg('Booking request cancelled.');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Cancellation failed.');
    }
  };

  // Submit new booking
  const handleCreateBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError('Please search and select a registered patient.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await createBedBooking(token, {
        patientId: selectedPatient._id,
        wardType: newWardType,
        expectedDate: newExpectedDate,
        doctorId: newDoctorId || undefined,
        reason: newReason,
      });
      setSuccessMsg(`Booking created: ${res.data.bookingNumber}`);
      setShowCreateModal(false);
      setSelectedPatient(null);
      setPatientSearchTerm('');
      setNewReason('');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create booking.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (wardFilter !== 'ALL' && b.wardType !== wardFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const numMatch = b.bookingNumber?.toLowerCase().includes(q);
      const patNameMatch = b.patientId?.name?.toLowerCase().includes(q);
      const uhidMatch = b.patientId?.uhid?.toLowerCase().includes(q);
      const phoneMatch = b.patientId?.phone?.includes(q);
      return numMatch || patNameMatch || uhidMatch || phoneMatch;
    }
    return true;
  });

  // Sort: Requested first, then by expected date
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (a.status === 'Requested' && b.status !== 'Requested') return -1;
    if (b.status === 'Requested' && a.status !== 'Requested') return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Inpatient (IPD)' }, { label: 'Bed Requests Queue' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black font-heading text-slate-900">Bed Requests Queue</h1>
            <p className="mt-1 text-xs text-slate-500">
              Process incoming bed booking requests, verify ward quotas, assign beds, and admit patients.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition-all"
            >
              <Plus className="h-4 w-4" /> Book for Patient / Walk-in
            </button>
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
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by patient name, UHID, booking ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
            >
              <option value="ALL">All Ward Types</option>
              <option value="General">General</option>
              <option value="Pediatric">Pediatric</option>
              <option value="Maternity/Gynae">Maternity/Gynae</option>
              <option value="Private">Private</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'Requested', 'Approved', 'Admitted', 'Rejected', 'Cancelled', 'Expired'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition-all ${
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

        {/* Bookings Queue Table */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <p className="py-16 text-center text-sm font-bold text-slate-500">Loading requests queue...</p>
          ) : sortedBookings.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-bold text-slate-700">No bed requests found</p>
              <p className="text-xs text-slate-400">Incoming bed requests will appear here for staff approval.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Booking Ref</th>
                    <th className="py-3.5 px-4">Patient (UHID)</th>
                    <th className="py-3.5 px-4">Ward Preference</th>
                    <th className="py-3.5 px-4">Expected Date</th>
                    <th className="py-3.5 px-4">Requested By</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Assigned Bed / Remarks</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedBookings.map((b) => (
                    <tr
                      key={b._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        b.status === 'Requested' ? 'bg-amber-50/30 font-medium' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.bookingNumber}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{b.patientId?.name || 'Walk-in'}</p>
                        <p className="text-[11px] font-mono text-slate-500">UHID: {b.patientId?.uhid}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{b.wardType}</td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className={b.expectedDate === todayStr ? 'font-black text-teal-700' : ''}>
                          {b.expectedDate} {b.expectedDate === todayStr && '(Today)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 capitalize">{b.requestedByRole}</td>
                      <td className="py-3 px-4">
                        <StatusBadge value={b.status} size="xs" />
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {b.bedId ? (
                          <span className="font-bold text-teal-700">Bed {b.bedId.bedNumber} (Reserved)</span>
                        ) : (
                          b.decisionReason || '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Actions for Requested */}
                        {b.status === 'Requested' && (
                          <>
                            <button
                              onClick={() => handleOpenApprove(b)}
                              className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-teal-700 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setShowRejectModal(b);
                                setDecisionReason('');
                              }}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* Actions for Approved: Admit Button */}
                        {b.status === 'Approved' && (
                          <>
                            <button
                              onClick={() => navigate('/portal/ipd/admissions', { state: { fromBooking: b } })}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition-colors inline-flex items-center gap-1"
                            >
                              <UserCheck className="h-3 w-3" /> Admit Now
                            </button>
                            <button
                              onClick={() => handleCancel(b._id)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal: Approve Booking */}
        {showApproveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900">
                  Approve Bed Booking: {showApproveModal.bookingNumber}
                </h3>
                <button onClick={() => setShowApproveModal(null)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl">
                <p><strong className="text-slate-900">Patient:</strong> {showApproveModal.patientId?.name} ({showApproveModal.patientId?.uhid})</p>
                <p><strong className="text-slate-900">Ward Preference:</strong> {showApproveModal.wardType}</p>
                <p><strong className="text-slate-900">Expected Date:</strong> {showApproveModal.expectedDate}</p>
              </div>

              <form onSubmit={handleApproveSubmit} className="space-y-4">
                {showApproveModal.expectedDate === todayStr ? (
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                      Assign Available Bed for Same-Day Hold *
                    </label>
                    {availableBeds.length === 0 ? (
                      <p className="text-xs text-rose-600 font-bold p-2 bg-rose-50 rounded-lg">
                        No available beds currently in {showApproveModal.wardType} Ward.
                      </p>
                    ) : (
                      <select
                        value={selectedBedId}
                        onChange={(e) => setSelectedBedId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium"
                        required
                      >
                        {availableBeds.map((b) => (
                          <option key={b._id} value={b._id}>
                            Bed {b.bedNumber} — {b.wardId?.name} (₹{(b.dailyCharge / 100).toFixed(0)}/day)
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1">Bed will be reserved with a 6-hour hold.</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 bg-sky-50 p-3 rounded-xl border border-sky-100">
                    ℹ️ For future dates, bed capacity will be verified against total ward beds. A specific physical bed will be assigned upon arrival on the expected date.
                  </p>
                )}

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Approval Note / Instructions</label>
                  <input
                    type="text"
                    placeholder="e.g. Approved, reporting to reception at 10 AM"
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowApproveModal(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || (showApproveModal.expectedDate === todayStr && !selectedBedId)}
                    className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {submitting ? 'Approving...' : 'Confirm Approval'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Reject Booking */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900">
                  Reject Booking Request: {showRejectModal.bookingNumber}
                </h3>
                <button onClick={() => setShowRejectModal(null)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Rejection Reason *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Specify why the request cannot be accommodated..."
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !decisionReason.trim()}
                    className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {submitting ? 'Rejecting...' : 'Reject Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Booking Request on behalf of patient */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900">
                  Create Bed Booking (Patient / Walk-in)
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <form onSubmit={handleCreateBookingSubmit} className="space-y-4">
                {/* Patient Search */}
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">
                    Search Registered Patient *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type name, phone, or UHID..."
                      value={patientSearchTerm}
                      onChange={(e) => {
                        setPatientSearchTerm(e.target.value);
                        setSelectedPatient(null);
                      }}
                      className="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-xs"
                    />
                  </div>

                  {/* Autocomplete dropdown */}
                  {patientSearchResults.length > 0 && !selectedPatient && (
                    <div className="mt-1 rounded-xl border border-slate-200 bg-white shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                      {patientSearchResults.map((p) => (
                        <div
                          key={p._id}
                          onClick={() => {
                            setSelectedPatient(p);
                            setPatientSearchTerm(`${p.name} (${p.uhid})`);
                            setPatientSearchResults([]);
                          }}
                          className="p-2.5 hover:bg-teal-50 cursor-pointer text-xs"
                        >
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">UHID: {p.uhid} • Phone: {p.phone}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedPatient && (
                    <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-900">
                        Selected: {selectedPatient.name} ({selectedPatient.uhid})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(null);
                          setPatientSearchTerm('');
                        }}
                        className="text-xs text-rose-600 font-bold"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Ward Type *</label>
                    <select
                      value={newWardType}
                      onChange={(e) => setNewWardType(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      required
                    >
                      <option value="General">General</option>
                      <option value="Pediatric">Pediatric</option>
                      <option value="Maternity/Gynae">Maternity/Gynae</option>
                      <option value="Private">Private</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Expected Date *</label>
                    <input
                      type="date"
                      min={todayStr}
                      max={maxDateStr}
                      value={newExpectedDate}
                      onChange={(e) => setNewExpectedDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Attending Doctor (Optional)</label>
                  <select
                    value={newDoctorId}
                    onChange={(e) => setNewDoctorId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  >
                    <option value="">Any Available Doctor</option>
                    {doctors.map((d) => (
                      <option key={d._id} value={d._id}>{d.name} ({d.specialization})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 block mb-1">Clinical Reason / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Referred from OPD for stabilization..."
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedPatient}
                    className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Submit Request'}
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

export default BedRequestsQueue;
