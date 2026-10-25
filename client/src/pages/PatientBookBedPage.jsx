import React, { useEffect, useState } from 'react';
import {
  BedDouble,
  Calendar,
  CheckCircle2,
  Clock,
  HeartPulse,
  Info,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  cancelBedBooking,
  createBedBooking,
  fetchBedBookings,
  fetchDoctors,
  fetchMyAdmission,
  fetchWardAvailability,
} from '../api/api.js';

const PatientBookBedPage = () => {
  const { token, user } = useAuth();
  const [availability, setAvailability] = useState([]);
  const [myAdmission, setMyAdmission] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [wardType, setWardType] = useState('General');
  const [expectedDate, setExpectedDate] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [reason, setReason] = useState('');

  // Min and max date calculation (today to today+7)
  const todayStr = new Date().toISOString().slice(0, 10);
  const maxDateObj = new Date(Date.now() + 7 * 86400000);
  const maxDateStr = maxDateObj.toISOString().slice(0, 10);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [availRes, admRes, bookRes, docRes] = await Promise.all([
        fetchWardAvailability(token),
        fetchMyAdmission(token),
        fetchBedBookings(token),
        fetchDoctors().catch(() => ({ data: [] })),
      ]);
      setAvailability(availRes.data || []);
      setMyAdmission(admRes.data || null);
      setMyBookings(bookRes.data || []);
      setDoctors(docRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load booking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      setExpectedDate(todayStr);
      loadData();
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wardType || !expectedDate) {
      setError('Ward type and expected date are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await createBedBooking(token, {
        wardType,
        expectedDate,
        doctorId: doctorId || undefined,
        reason,
      });
      setSuccessMsg(`Booking request submitted successfully! Reference: ${res.data.bookingNumber}`);
      setReason('');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit bed booking request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this bed booking request?')) return;
    try {
      await cancelBedBooking(token, bookingId, { reason: 'Cancelled by patient' });
      setSuccessMsg('Booking cancelled successfully.');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel booking.');
    }
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Book a Bed' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black font-heading text-slate-900">Hospital Bed Booking</h1>
            <p className="mt-1 text-sm text-slate-500">
              Check real-time ward availability, request an inpatient bed, and track your admission status.
            </p>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-600 font-bold text-xs">Dismiss</button>
          </div>
        )}
        {successMsg && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-600 font-bold text-xs">Dismiss</button>
          </div>
        )}

        {/* Current Active Admission Card (if patient is admitted) */}
        {myAdmission && (
          <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-sky-50 p-6 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-teal-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black">
                  <BedDouble className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Your Current Inpatient Admission</h2>
                  <p className="text-xs text-slate-500 font-mono">Admission No: {myAdmission.admissionNumber}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" /> Currently Admitted
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div className="p-3 bg-white/80 rounded-xl border border-teal-100">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Ward & Bed</p>
                <p className="mt-1 text-base font-black text-slate-900">{myAdmission.ward} — {myAdmission.bedNumber}</p>
                <p className="text-xs text-teal-700 font-medium">({myAdmission.wardType} Ward)</p>
              </div>
              <div className="p-3 bg-white/80 rounded-xl border border-teal-100">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Admitted Date</p>
                <p className="mt-1 text-base font-black text-slate-900">{myAdmission.admittedDate}</p>
                <p className="text-xs text-slate-500 font-medium">{myAdmission.daysSoFar} day(s) touched</p>
              </div>
              <div className="p-3 bg-white/80 rounded-xl border border-teal-100">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Treating Doctor</p>
                <p className="mt-1 text-base font-black text-slate-900">{myAdmission.doctorName || 'Assigned Physician'}</p>
                <p className="text-xs text-slate-500">{myAdmission.specialization || 'Specialist'}</p>
              </div>
              <div className="p-3 bg-white/80 rounded-xl border border-teal-100">
                <p className="text-[10px] font-extrabold uppercase text-slate-400">Daily Rate</p>
                <p className="mt-1 text-base font-black text-slate-900">₹{(myAdmission.dailyCharge / 100).toFixed(0)}</p>
                <p className="text-xs text-slate-500">per calendar day</p>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: Real-time Ward Availability & Rates */}
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Info className="h-4 w-4 text-teal-600" /> Ward Availability & Tariffs (Live)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {availability.map((item) => (
              <div
                key={item.wardType}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900">{item.wardType} Ward</h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      item.availableBeds > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.availableBeds > 0 ? `${item.availableBeds} Available` : 'Full'}
                  </span>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-slate-900">₹{item.dailyRateRupees}</span>
                    <span className="text-xs font-semibold text-slate-400"> / day</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Total: {item.totalBeds} beds</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWardType(item.wardType);
                    document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="mt-4 w-full rounded-xl bg-slate-50 border border-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors"
                >
                  Select {item.wardType}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Bed Booking Request Form */}
        {!myAdmission && (
          <section id="booking-form" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <Send className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Request a Bed Booking</h2>
                <p className="text-xs text-slate-500">
                  Submit a request for an inpatient bed. Hospital staff will confirm availability and reserve your bed.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Ward Type Preference <span className="text-rose-500">*</span>
                </label>
                <select
                  value={wardType}
                  onChange={(e) => setWardType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  required
                >
                  <option value="General">General Medicine Ward (₹800/day)</option>
                  <option value="Pediatric">Pediatric Care Ward (₹1,200/day)</option>
                  <option value="Maternity/Gynae">Maternity & Gynae Wing (₹1,500/day)</option>
                  <option value="Private">Executive Private Suite (₹3,500/day)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Expected Admission Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  min={todayStr}
                  max={maxDateStr}
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Bookings accepted up to 7 days in advance.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Preferred / Referring Doctor (Optional)
                </label>
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">Any Available Specialist</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Reason for Admission / Clinical Symptoms
                </label>
                <input
                  type="text"
                  maxLength={500}
                  placeholder="e.g. Scheduled elective surgery, high fever observation..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div className="md:col-span-2 pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50 transition-all"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? 'Submitting Request...' : 'Submit Bed Request'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Section 3: My Bed Requests History */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-600" /> My Bed Requests
            </h2>
            <span className="text-xs text-slate-400 font-bold">{myBookings.length} total request(s)</span>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading requests...</p>
          ) : myBookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
              <BedDouble className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-bold text-slate-700">No bed requests submitted yet</p>
              <p className="text-xs text-slate-400">Use the form above to request an inpatient bed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Ward Type</th>
                    <th className="py-3 px-4">Expected Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned Bed / Remarks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myBookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.bookingNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{b.wardType}</td>
                      <td className="py-3 px-4 text-slate-600">{b.expectedDate}</td>
                      <td className="py-3 px-4">
                        <StatusBadge value={b.status} size="xs" />
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {b.bedId ? (
                          <span className="font-bold text-teal-700">Bed {b.bedId.bedNumber} (Reserved)</span>
                        ) : (
                          b.decisionReason || 'Under staff review'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {['Requested', 'Approved'].includes(b.status) && (
                          <button
                            onClick={() => handleCancel(b._id)}
                            className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                          >
                            Cancel
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
      </div>
    </DashboardLayout>
  );
};

export default PatientBookBedPage;
