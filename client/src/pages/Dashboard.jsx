import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Users,
  UserPlus,
  FileText,
  Activity,
  ArrowRight,
  Printer,
  HeartPulse,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import {
  fetchAdminStats,
  fetchDepartments,
  fetchDoctors,
  fetchMyAppointments,
  fetchAvailability,
  createAppointment,
  fetchLiveQueue,
} from '../api/api';

const titleFor = (role) => {
  switch (role) {
    case 'patient':
      return 'Your Health & Care Portal';
    case 'doctor':
      return 'Today at a Glance';
    case 'receptionist':
      return 'Front Desk & OPD Operations';
    case 'nurse':
      return 'Nursing & Triage Station';
    case 'pharmacist':
      return 'Pharmacy Dispensary';
    default:
      return 'Hospital Operations ERP';
  }
};

// ----------------- PATIENT DASHBOARD -----------------
export const PatientDashboard = () => {
  const { token, user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({
    departmentId: '',
    doctorId: '',
    date: '',
    timeSlot: '',
    reasonForVisit: '',
  });
  const [message, setMessage] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  const loadData = async () => {
    try {
      const [depts, docs, mine] = await Promise.all([
        fetchDepartments(),
        fetchDoctors(),
        fetchMyAppointments(token),
      ]);
      setDepartments(depts.data || []);
      setDoctors(docs.data || []);
      setAppointments(mine.data || []);
    } catch (err) {
      setMessage('Unable to load appointments.');
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  useEffect(() => {
    if (form.doctorId && form.date) {
      fetchAvailability(form.doctorId, form.date)
        .then((res) => setSlots(res.slots || []))
        .catch(() => setSlots([]));
    } else {
      setSlots([]);
    }
  }, [form.doctorId, form.date]);

  const handleBook = async (e) => {
    e.preventDefault();
    setIsBooking(true);
    setMessage('');
    try {
      await createAppointment(token, form);
      setMessage('Appointment requested successfully. Doctor will confirm.');
      setForm({ departmentId: '', doctorId: '', date: '', timeSlot: '', reasonForVisit: '' });
      await loadData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'That slot is unavailable.');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-teal-700 uppercase tracking-widest font-heading">
              Patient Portal
            </p>
            <h1 className="text-2xl font-heading font-black text-slate-900 tracking-tight mt-1">
              {titleFor('patient')}
            </h1>
          </div>
          <div className="text-xs text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-xl">
            {appointments.filter((a) => ['Pending', 'Confirmed'].includes(a.status)).length} upcoming visits
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <CalendarPlus className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Book Consultation Slot
              </h2>
            </div>

            {message && (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
                {message}
              </div>
            )}

            <form onSubmit={handleBook} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Specialty Department</label>
                <select
                  required
                  value={form.departmentId}
                  onChange={(e) =>
                    setForm({ ...form, departmentId: e.target.value, doctorId: '', timeSlot: '' })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">Select a Department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Doctor</label>
                <select
                  required
                  value={form.doctorId}
                  onChange={(e) => setForm({ ...form, doctorId: e.target.value, timeSlot: '' })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">Select a Doctor</option>
                  {doctors
                    .filter((doc) => !form.departmentId || (doc.department?._id || doc.department) === form.departmentId)
                    .map((doc) => (
                      <option key={doc._id} value={doc._id}>
                        {doc.name} · {doc.specialization}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value, timeSlot: '' })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Available Slot</label>
                  <select
                    required
                    value={form.timeSlot}
                    onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">{form.date ? 'Choose slot' : 'Select date first'}</option>
                    {slots.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Consultation</label>
                <textarea
                  rows="2"
                  placeholder="Describe your symptoms or reason for visit..."
                  value={form.reasonForVisit}
                  onChange={(e) => setForm({ ...form, reasonForVisit: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isBooking}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isBooking ? 'Booking...' : 'Request Appointment'}
              </button>
            </form>
          </div>

          {/* Appointments List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 font-heading border-b border-slate-100 pb-3">
              Your Scheduled Consultations
            </h2>
            {appointments.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No appointments booked yet.</p>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto">
                {appointments.map((apt) => (
                  <div key={apt._id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs">
                    <div>
                      <strong className="text-slate-900 block">{apt.doctorId?.name}</strong>
                      <span className="text-[11px] text-slate-500">{apt.departmentId?.name}</span>
                      <p className="font-mono text-slate-700 mt-1">{apt.date} at {apt.timeSlot}</p>
                    </div>
                    <StatusBadge value={apt.status} size="xs" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ----------------- DOCTOR DASHBOARD -----------------
export const DoctorDashboard = () => {
  const { token, user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    Promise.all([fetchMyAppointments(token), fetchLiveQueue(token)]).then(([appRes, queueRes]) => {
      if (appRes.success) setAppointments(appRes.data || []);
      if (queueRes.success) setQueue(queueRes.data?.queue || []);
    }).catch(() => {});
  }, [token]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-teal-700 uppercase tracking-widest font-heading">
              Doctor Station
            </p>
            <h1 className="text-2xl font-heading font-black text-slate-900 tracking-tight mt-1">
              {titleFor('doctor')}
            </h1>
          </div>
          <Link
            to="/portal/opd/queue"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <span>Open Today's Live Queue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Doctor Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Waiting in Queue"
            value={queue.filter((q) => q.queueStatus === 'Waiting').length}
            subtitle="Patients in waiting area"
            icon={Clock3}
            color="amber"
          />
          <StatCard
            title="In Consultation"
            value={queue.filter((q) => q.queueStatus === 'In Consultation').length}
            subtitle="Currently inside room"
            icon={Activity}
            color="purple"
          />
          <StatCard
            title="Completed Today"
            value={queue.filter((q) => q.queueStatus === 'Completed').length}
            subtitle="Consultations finished"
            icon={CheckCircle2}
            color="emerald"
          />
        </div>

        {/* Active Patients Queue Overview */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 font-heading">Today's Patient Line</h3>
            <Link to="/portal/opd/queue" className="text-xs font-bold text-teal-700 hover:underline">
              View Full Queue Screen →
            </Link>
          </div>
          {queue.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No patients checked into your queue today.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {queue.slice(0, 6).map((q) => (
                <div key={q._id} className="py-3 flex justify-between items-center">
                  <div>
                    <span className="font-mono font-bold text-slate-900 mr-2">Token #{q.tokenNumber}</span>
                    <strong className="text-slate-800">{q.patientId?.name || 'Walk-in'}</strong>
                    <span className="text-[10px] text-slate-400 ml-2">UHID: {q.patientId?.uhid}</span>
                  </div>
                  <StatusBadge value={q.queueStatus} size="xs" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

// ----------------- ADMIN DASHBOARD -----------------
export const AdminDashboard = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchAdminStats(token).then((res) => {
      if (res.success) setStats(res.data || {});
    }).catch(() => {});
  }, [token]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold text-teal-700 uppercase tracking-widest font-heading">
            Executive Admin
          </p>
          <h1 className="text-2xl font-heading font-black text-slate-900 tracking-tight mt-1">
            Hospital Operations Overview
          </h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Registered Patients"
            value={stats.patients}
            subtitle="Central Patient Registry"
            icon={Users}
            color="teal"
          />
          <StatCard
            title="Active Doctors"
            value={stats.doctors}
            subtitle="Across 4 Departments"
            icon={HeartPulse}
            color="emerald"
          />
          <StatCard
            title="Today's Appointments"
            value={stats.todayAppointments}
            subtitle="Scheduled & walk-ins"
            icon={CalendarPlus}
            color="blue"
          />
          <StatCard
            title="Currently in OPD Queue"
            value={stats.activeQueue}
            subtitle="Waiting or in consultation"
            icon={Clock3}
            color="amber"
          />
        </div>

        {/* Quick Launch Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/portal/patients"
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all group"
          >
            <Users className="w-6 h-6 text-teal-600 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-sm text-slate-900">Patient Registry</h3>
            <p className="text-xs text-slate-500 mt-1">Search, register walk-ins, and inspect clinical history.</p>
          </Link>
          <Link
            to="/portal/opd/queue"
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all group"
          >
            <Clock3 className="w-6 h-6 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-sm text-slate-900">Live OPD Queue</h3>
            <p className="text-xs text-slate-500 mt-1">Real-time doctor tokens, call next, and wait times.</p>
          </Link>
          <Link
            to="/portal/opd/reports"
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all group"
          >
            <FileText className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-sm text-slate-900">No-Show & Cancel Reports</h3>
            <p className="text-xs text-slate-500 mt-1">Audit attendance rate, slot abandonments, and reasons.</p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ----------------- GENERAL STAFF DASHBOARD (Receptionist, Nurse, Pharmacist) -----------------
export const StaffDashboard = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold text-teal-700 uppercase tracking-widest font-heading">
            {user.role} workspace
          </p>
          <h1 className="text-2xl font-heading font-black text-slate-900 tracking-tight mt-1">
            {titleFor(user.role)}
          </h1>
        </div>

        {/* Quick Launch Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/portal/patients"
            className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all"
          >
            <Users className="w-7 h-7 text-teal-600 mb-3" />
            <h3 className="font-bold text-sm text-slate-900">Patient Registry</h3>
            <p className="text-xs text-slate-500 mt-1">Lookup patient UHID, contact details, and clinical tags.</p>
          </Link>

          {['receptionist', 'admin'].includes(user.role) && (
            <>
              <Link
                to="/portal/patients/new"
                className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all"
              >
                <UserPlus className="w-7 h-7 text-emerald-600 mb-3" />
                <h3 className="font-bold text-sm text-slate-900">Register New Patient</h3>
                <p className="text-xs text-slate-500 mt-1">Front desk registration without portal account.</p>
              </Link>
              <Link
                to="/portal/opd/walkin"
                className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all"
              >
                <CalendarPlus className="w-7 h-7 text-sky-600 mb-3" />
                <h3 className="font-bold text-sm text-slate-900">Issue Walk-in Token</h3>
                <p className="text-xs text-slate-500 mt-1">Generate today's token slip for doctor clinic.</p>
              </Link>
            </>
          )}

          <Link
            to="/portal/opd/queue"
            className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all"
          >
            <Clock3 className="w-7 h-7 text-amber-600 mb-3" />
            <h3 className="font-bold text-sm text-slate-900">Live OPD Queue</h3>
            <p className="text-xs text-slate-500 mt-1">Check in arrivals, print token slips, and monitor wait times.</p>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};
