import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Printer,
  XCircle,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  CalendarPlus,
  ArrowRight,
  Filter,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import PrintSlip from '../components/PrintSlip.jsx';
import {
  fetchAppointments,
  fetchMyAppointments,
  checkInAppointment,
  rescheduleAppointment,
  cancelAppointment,
  markNoShowAppointment,
  fetchAvailability,
  fetchDoctors,
  fetchDepartments,
} from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const Appointments = () => {
  const { token, user } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Print Slip State
  const [printApt, setPrintApt] = useState(null);

  // Reschedule Modal State
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [slotMessage, setSlotMessage] = useState('');

  // Cancel Modal State
  const [cancelApt, setCancelApt] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const loadAppointments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (user.role === 'patient') {
        const res = await fetchMyAppointments(token);
        if (res.success) {
          setAppointments(res.data || []);
          setTotal((res.data || []).length);
          setTotalPages(1);
        }
      } else {
        const params = {
          page,
          limit: 15,
          status: statusFilter || undefined,
          date: dateFilter || undefined,
        };
        const res = await fetchAppointments(token, params);
        if (res.success) {
          setAppointments(res.data.appointments || []);
          setTotal(res.data.total || 0);
          setTotalPages(res.data.totalPages || 1);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch appointments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [token, user, page, statusFilter, dateFilter]);

  // Load available slots when reschedule date changes
  useEffect(() => {
    if (rescheduleApt && rescheduleDate) {
      const docId = rescheduleApt.doctorId?._id || rescheduleApt.doctorId;
      fetchAvailability(docId, rescheduleDate).then((res) => {
        if (res.success) {
          setAvailableSlots(res.slots || []);
          setSlotMessage(res.message || '');
        }
      }).catch(() => {
        setAvailableSlots([]);
        setSlotMessage('Unable to load availability for this date.');
      });
    } else {
      setAvailableSlots([]);
      setSlotMessage('');
    }
  }, [rescheduleApt, rescheduleDate]);

  // Actions
  const handleCheckIn = async (aptId) => {
    try {
      const res = await checkInAppointment(token, aptId);
      if (res.success && res.data) {
        setPrintApt(res.data);
        await loadAppointments();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Check-in failed.');
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleDate || !rescheduleSlot) return;
    setIsRescheduling(true);
    try {
      await rescheduleAppointment(token, rescheduleApt._id, {
        date: rescheduleDate,
        timeSlot: rescheduleSlot,
        reason: rescheduleReason,
      });
      setRescheduleApt(null);
      setRescheduleDate('');
      setRescheduleSlot('');
      setRescheduleReason('');
      await loadAppointments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reschedule appointment.');
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    setIsCancelling(true);
    try {
      await cancelAppointment(token, cancelApt._id, cancelReason.trim());
      setCancelApt(null);
      setCancelReason('');
      await loadAppointments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel appointment.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleMarkNoShow = async (aptId) => {
    if (!window.confirm('Mark this appointment as No-show? This slot will be released.')) return;
    try {
      await markNoShowAppointment(token, aptId);
      await loadAppointments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark No-show.');
    }
  };

  const columns = [
    {
      header: 'Date & Slot',
      key: 'date',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block font-mono">{row.date}</span>
          <span className="text-[11px] text-teal-700 font-semibold">{row.timeSlot}</span>
          {row.tokenNumber && (
            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded font-mono text-[10px] bg-slate-100 text-slate-800 font-bold border border-slate-200">
              Token #{row.tokenNumber}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Patient Name & UHID',
      key: 'patientId',
      render: (row) => (
        <div>
          <strong className="text-slate-900 block">{row.patientId?.name || 'Walk-in Patient'}</strong>
          <span className="font-mono text-[10px] text-slate-500">{row.patientId?.uhid || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Doctor & Department',
      key: 'doctorId',
      render: (row) => (
        <div>
          <strong className="text-slate-800 block">{row.doctorId?.name}</strong>
          <span className="text-[11px] text-slate-500">{row.departmentId?.name}</span>
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'source',
      render: (row) => (
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded capitalize font-mono ${
          row.source === 'walk-in' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {row.source || 'online'}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => <StatusBadge value={row.status} size="xs" />,
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* Check-in button for today's appointment if not checked in */}
          {['receptionist', 'admin'].includes(user.role) && !row.tokenNumber && !['Cancelled', 'Completed', 'Rescheduled'].includes(row.status) && (
            <button
              onClick={() => handleCheckIn(row._id)}
              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Check in patient for today's queue"
            >
              Check-in
            </button>
          )}

          {/* Print slip if token exists */}
          {row.tokenNumber && (
            <button
              onClick={() => setPrintApt(row)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Print Token Slip"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}

          {/* Reschedule */}
          {!['Cancelled', 'Completed', 'Rescheduled'].includes(row.status) && (
            <button
              onClick={() => {
                setRescheduleApt(row);
                setRescheduleDate(row.date);
                setRescheduleSlot('');
              }}
              className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Reschedule
            </button>
          )}

          {/* Cancel */}
          {!['Cancelled', 'Completed', 'Rescheduled'].includes(row.status) && (
            <button
              onClick={() => {
                setCancelApt(row);
                setCancelReason('');
              }}
              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
              title="Cancel Appointment"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}

          {/* Mark No-Show */}
          {['receptionist', 'admin', 'doctor'].includes(user.role) && !['Cancelled', 'Completed', 'Rescheduled', 'No-show'].includes(row.status) && (
            <button
              onClick={() => handleMarkNoShow(row._id)}
              className="px-1.5 py-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded text-[10px] font-semibold cursor-pointer"
              title="Mark No-show"
            >
              No-show
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Appointments' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-black text-slate-900 tracking-tight">
              {user.role === 'patient' ? 'My Hospital Visits & Bookings' : 'Hospital Appointments Master'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Search, reschedule, check in on arrival, or track consultation lifecycles.
            </p>
          </div>
        </div>

        {/* DataTable */}
        <DataTable
          columns={columns}
          data={appointments}
          isLoading={isLoading}
          error={error}
          currentPage={page}
          totalPages={totalPages}
          totalRecords={total}
          onPageChange={setPage}
          filterControls={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs p-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Rescheduled">Rescheduled</option>
                <option value="No-show">No-show</option>
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs p-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
              />

              {(statusFilter || dateFilter) && (
                <button
                  onClick={() => {
                    setStatusFilter('');
                    setDateFilter('');
                    setPage(1);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          }
        />

        {/* Reschedule Modal */}
        <Modal
          isOpen={Boolean(rescheduleApt)}
          onClose={() => setRescheduleApt(null)}
          title="Reschedule Appointment"
          subtitle={`Doctor: ${rescheduleApt?.doctorId?.name} · Current slot: ${rescheduleApt?.date} at ${rescheduleApt?.timeSlot}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">New Target Date *</label>
              <input
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Available Slot *</label>
              <select
                required
                value={rescheduleSlot}
                onChange={(e) => setRescheduleSlot(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
              >
                <option value="">Choose an open slot</option>
                {availableSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
              {slotMessage && <p className="mt-1 text-[11px] text-slate-500">{slotMessage}</p>}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Reason for Rescheduling</label>
              <textarea
                rows="2"
                placeholder="e.g. Patient requested morning slot change"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRescheduleApt(null)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRescheduling || !rescheduleSlot}
                className="px-5 py-2 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50"
              >
                {isRescheduling ? 'Rescheduling...' : 'Confirm New Slot'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Cancel Modal */}
        <Modal
          isOpen={Boolean(cancelApt)}
          onClose={() => setCancelApt(null)}
          title="Cancel Appointment"
          subtitle={`Patient: ${cancelApt?.patientId?.name} on ${cancelApt?.date}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Mandatory Reason for Cancellation <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows="3"
                required
                placeholder="Enter cancellation reason..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelApt(null)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isCancelling || !cancelReason.trim()}
                className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Printable Slip Preview */}
        {printApt && <PrintSlip appointment={printApt} onClose={() => setPrintApt(null)} />}
      </div>
    </DashboardLayout>
  );
};

export default Appointments;
