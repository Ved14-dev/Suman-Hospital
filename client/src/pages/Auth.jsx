import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HeartPulse, LockKeyhole, Mail, UserRound, Phone, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const demoCredentials = [
  { role: 'Admin', email: 'admin@sumanhospital.com' },
  { role: 'Receptionist', email: 'receptionist@sumanhospital.com' },
  { role: 'Doctor (HOD)', email: 'dr.gauri.warhekar@sumanhospital.com' },
  { role: 'Nurse', email: 'nurse@sumanhospital.com' },
  { role: 'Pharmacist', email: 'pharmacist@sumanhospital.com' },
  { role: 'Patient', email: 'patient@sumanhospital.com' },
];

const Auth = ({ mode = 'login' }) => {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fillDemo = (email) => {
    setForm({ name: '', email, password: '', phone: '' });
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      let nextUser;
      if (isRegister) {
        await register(form);
        nextUser = { role: 'patient' };
      } else {
        await login(form);
        nextUser = JSON.parse(sessionStorage.getItem('suman_user'));
      }

      const role = nextUser?.role;
      const defaultRoute =
        role === 'admin'
          ? '/admin-dashboard'
          : role === 'doctor'
          ? '/doctor-dashboard'
          : role === 'patient'
          ? '/patient-dashboard'
          : '/portal/dashboard';

      navigate(location.state?.from?.pathname || defaultRoute);
    } catch (err) {
      setError(err.response?.data?.message || 'Please check your details and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 grid place-items-center p-5 selection:bg-teal-500 selection:text-white">
      <div className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-8 shadow-2xl border border-slate-100">
        <Link to="/" className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-teal-600/20">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <p className="font-heading font-black text-slate-900 text-lg leading-tight">Suman Hospital</p>
            <p className="text-xs text-teal-700 font-bold uppercase tracking-wider">Patient & ERP Care Portal</p>
          </div>
        </Link>

        <h1 className="text-2xl font-heading font-black text-slate-900 tracking-tight mb-1">
          {isRegister ? 'Create Patient Account' : 'Sign in to Workspace'}
        </h1>
        <p className="text-xs text-slate-500 mb-6">
          {isRegister
            ? 'Register to book OPD slots, access prescription history and test reports.'
            : 'Access the role-based ERP and patient care system.'}
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <UserRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  required
                  placeholder="e.g. Ramesh Patil"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Hospital Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                required
                type="email"
                placeholder="name@sumanhospital.com"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="+91 98200 12345"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <LockKeyhole className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                required
                type="password"
                minLength="6"
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          <button
            disabled={busy}
            className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 disabled:opacity-60 shadow-xs transition-all cursor-pointer active:scale-98"
          >
            {busy ? 'Verifying...' : isRegister ? 'Create Patient Account' : 'Sign in to Portal'}
          </button>
        </form>

        {/* Demo Credentials Quick-Fill (only on login mode) */}
        {!isRegister && (
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-heading flex items-center gap-1">
              <KeyRound className="w-3 h-3" />
              <span>Demo Quick-Fill Accounts (enter password below):</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {demoCredentials.map((c) => (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => fillDemo(c.email)}
                  className="text-[10px] font-semibold px-2 py-1 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  {c.role}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-center mt-6 text-slate-600">
          {isRegister ? 'Already have an account?' : 'Need a patient account?'}{' '}
          <Link className="font-bold text-teal-700 hover:underline" to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Auth;
