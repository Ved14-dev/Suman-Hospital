import React, { useState, useEffect } from 'react';
import {
  Clock,
  PhoneCall,
  Play,
  CheckCircle2,
  Printer,
  RefreshCw,
  AlertCircle,
  User,
  Users,
  Search,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import StatCard from '../components/StatCard.jsx';
import Modal from '../components/Modal.jsx';
import PrintSlip from '../components/PrintSlip.jsx';
import {
  fetchLiveQueue,
  fetchDoctors,
  callNextPatient,
  startConsultation,
  completeConsultation,
  markNoShowAppointment,
  cancelAppointment,
} from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const LiveQueue = () => {
  const { token, user } = useAuth();

  const [queue, setQueue] = useState([]);
  const [summary, setSummary] = useState({ total: 0, waiting: 0, inConsultation: 0, completed: 0 });
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Complete Consultation Modal State
  const [activeConsultationApt, setActiveConsultationApt] = useState(null);
  const [consultationNotes, setConsultationNotes] = useState('');
  const [isSubmittingNotes, setIsSubmittingNotes] = useState(false);

  // Print Slip Modal State
  const [selectedPrintApt, setSelectedPrintApt] = useState(null);

  // Cancel Modal State
  const [cancelModalApt, setCancelModalApt] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Load doctors list (for receptionist/admin filter)
  useEffect(() => {
    if (user?.role !== 'doctor') {
      fetchDoctors().then((res) => {
        if (res.success) setDoctors(res.data || []);
      }).catch(() => {});
    }
  }, [user]);

  // Load live queue
  const loadQueue = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedDoctorId) params.doctorId = selectedDoctorId;
      const res = await fetchLiveQueue(token, params);
      if (res.success && res.data) {
        setQueue(res.data.queue || []);
        setSummary(res.data.summary || { total: 0, waiting: 0, inConsultation: 0, completed: 0 });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch OPD queue.');
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadQueue(true);
  }, [token, selectedDoctorId]);

  // Polling every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadQueue(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [token, selectedDoctorId]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadQueue(false);
  };

  // Queue Doctor Actions
  const handleCallNext = async (aptId) => {
    try {
      await callNextPatient(token, aptId);
      await loadQueue(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to call patient.');
    }
  };

  const handleStartConsultation = async (aptId) => {
    try {
      await startConsultation(token, aptId);
      await loadQueue(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start consultation.');
    }
  };

  const handleCompleteClick = (apt) => {
    setActiveConsultationApt(apt);
    setConsultationNotes(apt.consultationNotes || '');
  };

  const handleSaveCompletion = async (e) => {
    e.preventDefault();
    if (!activeConsultationApt) return;
    setIsSubmittingNotes(true);
    try {
      await completeConsultation(token, activeConsultationApt._id, consultationNotes);
      setActiveConsultationApt(null);
      setConsultationNotes('');
      await loadQueue(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete consultation.');
    } finally {
      setIsSubmittingNotes(false);
    }
  };

  const handleMarkNoShow = async (aptId) => {
    if (!window.confirm('Mark this patient as No-Show for today?')) return;
    try {
      await markNoShowAppointment(token, aptId);
      await loadQueue(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark No-Show.');
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelModalApt || !cancelReason.trim()) return;
    try {
      await cancelAppointment(token, cancelModalApt._id, cancelReason.trim());
      setCancelModalApt(null);
      setCancelReason('');
      await loadQueue(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel appointment.');
    }
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'OPD Queue' }]}>
      <div className="space-y-6">
        {/* Header and Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-black text-slate-900 tracking-tight">
              {user.role === 'doctor' ? "Today's Patient Queue" : 'Hospital OPD Live Queue'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Live consultation tracking, daily tokens, and patient calling (Auto-refreshes every 15s).
            </p>
          </div>

          <div className="flex items-center gap-3">
            {user.role !== 'doctor' && (
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All OPD Doctors</option>
                {doctors.map((doc) => (
                  <option key={doc._id} value={doc._id}>
                    {doc.name} ({doc.specialization})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Manual Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-teal-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Tokens Today"
            value={summary.total}
            subtitle="Scheduled & walk-ins"
            icon={Users}
            color="teal"
          />
          <StatCard
            title="Currently Waiting"
            value={summary.waiting}
            subtitle="In OPD waiting area"
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="In Consultation"
            value={summary.inConsultation}
            subtitle="Inside doctor rooms"
            icon={Play}
            color="purple"
          />
          <StatCard
            title="Completed"
            value={summary.completed}
            subtitle="Consultations finished"
            icon={CheckCircle2}
            color="emerald"
          />
        </div>

        {/* Queue Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-heading">
              Queue Tokens for Today
            </h3>
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
              {queue.filter((q) => ['Waiting', 'In Consultation'].includes(q.queueStatus)).length} active in line
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Token #</th>
                  <th className="py-3 px-4">Patient Name & UHID</th>
                  <th className="py-3 px-4">Doctor & Room</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Queue Status</th>
                  <th className="py-3 px-4">Wait Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td colSpan="7" className="py-4 px-4">
                        <div className="h-4 bg-slate-200 rounded-md w-full" />
                      </td>
                    </tr>
                  ))
                ) : queue.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-14 text-center text-slate-400">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-xs text-slate-600">No active queue tokens for today.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Walk-ins and checked-in appointments will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  queue.map((item) => (
                    <tr
                      key={item._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        item.queueStatus === 'In Consultation' ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-black text-sm text-slate-900">
                        <span className="px-2 py-1 bg-slate-100 text-slate-800 rounded-lg border border-slate-200">
                          #{item.tokenNumber || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">
                          {item.patientId?.name || 'Walk-in Patient'}
                        </span>
                        <span className="font-mono text-[10px] text-teal-700 font-semibold">
                          {item.patientId?.uhid || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="font-semibold block">{item.doctorId?.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{item.doctorId?.roomNumber}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {item.reasonForVisit || 'General Consultation'}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge value={item.queueStatus} size="xs" />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {item.waitTimeMinutes ? `${item.waitTimeMinutes} mins` : 'Just checked in'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Doctor specific flow actions */}
                          {user.role === 'doctor' && (
                            <>
                              {item.queueStatus === 'Waiting' && (
                                <>
                                  <button
                                    onClick={() => handleCallNext(item._id)}
                                    className="px-2.5 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                    title="Call patient into room"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" />
                                    <span>Call</span>
                                  </button>
                                  <button
                                    onClick={() => handleStartConsultation(item._id)}
                                    className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                    <span>Start</span>
                                  </button>
                                </>
                              )}

                              {item.queueStatus === 'In Consultation' && (
                                <button
                                  onClick={() => handleCompleteClick(item)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs animate-bounce"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Complete & Notes</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* Print Token Slip (Receptionist, Admin, Nurse) */}
                          <button
                            onClick={() => setSelectedPrintApt(item)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Print Token Slip"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Receptionist/Admin Mark No-show or Cancel */}
                          {['receptionist', 'admin', 'doctor'].includes(user.role) && item.queueStatus === 'Waiting' && (
                            <>
                              <button
                                onClick={() => handleMarkNoShow(item._id)}
                                className="px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Mark as No-Show"
                              >
                                No-Show
                              </button>
                              <button
                                onClick={() => {
                                  setCancelModalApt(item);
                                  setCancelReason('');
                                }}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Cancel Visit"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Doctor Complete Consultation Modal */}
        <Modal
          isOpen={Boolean(activeConsultationApt)}
          onClose={() => setActiveConsultationApt(null)}
          title={`Complete Consultation: Token #${activeConsultationApt?.tokenNumber}`}
          subtitle={`Patient: ${activeConsultationApt?.patientId?.name} (UHID: ${activeConsultationApt?.patientId?.uhid})`}
        >
          <form onSubmit={handleSaveCompletion} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Consultation Diagnosis, Prescriptions & Clinical Notes
              </label>
              <textarea
                rows="6"
                required
                placeholder="Enter clinical examination findings, prescribed medications, dosage, follow-up advice..."
                value={consultationNotes}
                onChange={(e) => setConsultationNotes(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-hidden leading-relaxed font-sans"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveConsultationApt(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingNotes}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {isSubmittingNotes ? 'Completing...' : 'Sign & Complete Consultation'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Cancel Visit Modal */}
        <Modal
          isOpen={Boolean(cancelModalApt)}
          onClose={() => setCancelModalApt(null)}
          title={`Cancel Visit: Token #${cancelModalApt?.tokenNumber}`}
          subtitle={`Patient: ${cancelModalApt?.patientId?.name}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCancelSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mandatory Cancellation Reason <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows="3"
                required
                placeholder="Enter reason for cancelling today's OPD token..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelModalApt(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!cancelReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50"
              >
                Confirm Cancellation
              </button>
            </div>
          </form>
        </Modal>

        {/* Printable Token Slip Modal */}
        {selectedPrintApt && (
          <PrintSlip
            appointment={selectedPrintApt}
            onClose={() => setSelectedPrintApt(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default LiveQueue;
