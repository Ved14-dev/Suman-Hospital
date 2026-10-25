import React, { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  CalendarCheck,
  UserPlus,
  Clock,
  FileText,
  CreditCard,
  Pill,
  BedDouble,
  Stethoscope,
  Building2,
  BarChart3,
  LogOut,
  Menu,
  X,
  HeartPulse,
  LayoutDashboard,
  ShieldAlert,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GlobalSearch from './GlobalSearch';
import { hasPermission } from '../utils/permissions';
import { isModuleEnabled } from '../config/modules';

const DashboardLayout = ({ children, breadcrumbs = [] }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  // Role-based sidebar menu items and groups
  const getNavGroups = () => {
    if (user.role === 'patient') {
      return [
        {
          title: 'Care Portal',
          items: [
            { label: 'Overview', path: '/patient-dashboard', icon: LayoutDashboard },
            { label: 'Book Appointment', path: '/portal/opd/book', icon: CalendarCheck },
            { label: 'My Appointments', path: '/portal/appointments', icon: Clock },
            { label: 'Medical Records', path: '/portal/records', icon: FileText },
            { label: 'My Profile', path: '/portal/profile', icon: Settings },
            ...(isModuleEnabled('ipd')
              ? [{ label: 'Book a Bed', path: '/portal/book-bed', icon: BedDouble }]
              : []),
          ],
        },
      ];
    }

    const groups = [];

    // General Staff Dashboard
    const homePath =
      user.role === 'admin'
        ? '/admin-dashboard'
        : user.role === 'doctor'
        ? '/doctor-dashboard'
        : '/portal/dashboard';

    groups.push({
      title: 'Hospital ERP',
      items: [{ label: 'Workspace Overview', path: homePath, icon: LayoutDashboard }],
    });

    // Module: Patient Registry
    const patientItems = [];
    if (hasPermission(user, 'patient:read') || hasPermission(user, 'patient:search')) {
      patientItems.push({ label: 'Patient Registry', path: '/portal/patients', icon: Users });
    }
    if (hasPermission(user, 'patient:create')) {
      patientItems.push({ label: 'Register Patient', path: '/portal/patients/new', icon: UserPlus });
    }
    if (patientItems.length) {
      groups.push({ title: 'Patients', items: patientItems });
    }

    // Module: Appointments & OPD Queue
    const opdItems = [];
    if (hasPermission(user, 'opd:queue_view')) {
      opdItems.push({
        label: user.role === 'doctor' ? "Today's Patient Queue" : 'Live OPD Queue',
        path: '/portal/opd/queue',
        icon: Clock,
      });
    }
    if (hasPermission(user, 'appointment:walkin')) {
      opdItems.push({ label: 'Walk-in Registration', path: '/portal/opd/walkin', icon: UserPlus });
    }
    if (hasPermission(user, 'appointment:view_all') || hasPermission(user, 'appointment:view_own')) {
      opdItems.push({ label: 'All Appointments', path: '/portal/appointments', icon: CalendarCheck });
    }
    if (user.role === 'admin') {
      opdItems.push({ label: 'No-Show & Cancel Reports', path: '/portal/opd/reports', icon: BarChart3 });
    }
    if (opdItems.length) {
      groups.push({ title: 'OPD & Appointments', items: opdItems });
    }

    // Module: Clinical / EMR
    const emrItems = [];
    if (isModuleEnabled('emr') && hasPermission(user, 'emr:view')) {
      emrItems.push({ label: 'Clinical Records & Notes', path: '/portal/emr', icon: FileText });
    }
    if (emrItems.length) {
      groups.push({ title: 'Clinical EMR', items: emrItems });
    }

    // Module: Billing
    if (isModuleEnabled('billing') && (hasPermission(user, 'billing:create') || hasPermission(user, 'billing:full'))) {
      groups.push({
        title: 'Billing & Cashier',
        items: [{ label: 'Billing Invoices', path: '/portal/billing', icon: CreditCard }],
      });
    }

    // Module: Pharmacy
    if (isModuleEnabled('pharmacy') && hasPermission(user, 'pharmacy:full')) {
      groups.push({
        title: 'Pharmacy',
        items: [{ label: 'Medicine Inventory', path: '/portal/pharmacy', icon: Pill }],
      });
    }

    // Module: IPD Beds
    if (isModuleEnabled('ipd')) {
      const ipdItems = [];

      // Staff bed board
      if (hasPermission(user, 'ipd:view_beds') || hasPermission(user, 'ipd:full')) {
        ipdItems.push({ label: 'Bed Board', path: '/portal/beds', icon: BedDouble });
      }

      // Receptionist & Admin Bookings Queue
      if (hasPermission(user, 'ipd:booking_approve') || hasPermission(user, 'ipd:full')) {
        ipdItems.push({ label: 'Bed Requests Queue', path: '/portal/ipd/bookings', icon: Clock });
      }

      // Admissions list (Staff)
      if (hasPermission(user, 'ipd:admit') || hasPermission(user, 'ipd:full') || user.role === 'nurse') {
        ipdItems.push({ label: 'Inpatient Admissions', path: '/portal/ipd/admissions', icon: Users });
      }

      // Nurse Station
      if (user.role === 'nurse') {
        ipdItems.push({ label: 'My Ward Patients', path: '/portal/ipd/nursing', icon: HeartPulse });
      }

      // Doctor Inpatients
      if (user.role === 'doctor') {
        ipdItems.push({ label: 'My In-patients', path: '/portal/ipd/my-patients', icon: Stethoscope });
      }

      // Admin Wards & Beds configuration
      if (user.role === 'admin') {
        ipdItems.push({ label: 'Wards & Beds Settings', path: '/portal/ipd/wards', icon: Settings });
      }

      // Patient Book a Bed
      if (user.role === 'patient') {
        ipdItems.push({ label: 'Book a Bed', path: '/portal/book-bed', icon: BedDouble });
      }

      if (ipdItems.length > 0) {
        groups.push({
          title: 'Inpatient (IPD)',
          items: ipdItems,
        });
      }
    }

    // Module: Admin & Staff
    if (user.role === 'admin' && isModuleEnabled('staff')) {
      groups.push({
        title: 'Administration',
        items: [
          { label: 'Hospital Staff', path: '/portal/staff', icon: Users },
        ],
      });
    }

    return groups;
  };

  const navGroups = getNavGroups();

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 flex overflow-hidden">
      {/* Sidebar - h-screen, sticky, independent scroll */}
      <aside
        className={`${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 w-72 h-screen overflow-y-auto bg-slate-950 text-white transition-transform duration-300 flex flex-col shrink-0 border-r border-slate-900/60`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-900 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/20">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <strong className="font-heading font-extrabold text-sm tracking-tight text-white block leading-tight">
                Suman Hospital
              </strong>
              <span className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-widest">
                ERP System
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Workspace Badge */}
        <div className="px-5 py-3 bg-slate-900/50 border-b border-slate-900 flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            {user.role} workspace
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 font-heading">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive: navActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          navActive || isActive
                            ? 'bg-teal-600 text-white shadow-xs font-extrabold'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom User Profile & Sign Out */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/80">
          <div className="flex items-center justify-between gap-3 mb-3 px-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 capitalize truncate">{user.role}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold text-xs shrink-0 font-heading">
              {user.name?.charAt(0) || 'U'}
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer border border-rose-950/50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content Area - scrolls on its own */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Sticky Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-2xl">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search (patients search by UHID, phone, name) */}
            <GlobalSearch />
          </div>

          {/* Top-right User and Hospital status */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-900 font-heading leading-tight">{user.name}</p>
              <p className="text-[10px] text-teal-700 font-bold uppercase tracking-wider">{user.role}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-xs font-heading">
              {user.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Link to={user.role === 'admin' ? '/admin-dashboard' : user.role === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard'} className="hover:text-teal-700 transition-colors">
                Home
              </Link>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  {crumb.path ? (
                    <Link to={crumb.path} className="hover:text-teal-700 transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-slate-900 font-bold">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
