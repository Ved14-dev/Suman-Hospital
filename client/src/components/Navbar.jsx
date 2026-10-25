import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Phone,
  PhoneCall,
  User,
  Menu,
  X,
  HeartPulse,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Clean SVG WhatsApp icon for authentic branding
const WhatsAppIcon = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const Navbar = ({ onOpenBookModal }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Departments', path: '/departments' },
    { name: 'Doctors', path: '/doctors' },
    { name: 'Services', path: '/services' },
    { name: 'Health Insights', path: '/health-insights' },
    { name: 'Contact', path: '/contact' },
  ];

  const portalPath = user
    ? user.role === 'admin'
      ? '/admin-dashboard'
      : user.role === 'doctor'
      ? '/doctor-dashboard'
      : user.role === 'patient'
      ? '/patient-dashboard'
      : '/portal/dashboard'
    : '/login';

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-xs">
      {/* Top Utility Strip (Exact reference layout: 3 circular buttons, For Appointment text + phone, outlined Login) */}
      <div className="bg-white border-b border-slate-200/80 px-4 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: 3 circular icon buttons + "For Appointment" contact block */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Emergency Alert circular button (Red) */}
              <a
                href="tel:+9107212555555"
                aria-label="24/7 Emergency Trauma Care Hotline"
                title="Emergency Trauma Hotline: +91 (0721) 2555555"
                className="w-8 h-8 rounded-full bg-[#b91c1c] hover:bg-[#991b1b] text-white flex items-center justify-center shadow-xs transition-transform hover:scale-105"
              >
                <ShieldAlert className="w-4 h-4" />
              </a>

              {/* WhatsApp circular button (Green) */}
              <a
                href="https://wa.me/918446094203?text=Hello%20Suman%20Hospital,%20I%20would%20like%20to%20enquire%20about%20an%20appointment"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat with Hospital on WhatsApp"
                title="Chat with Suman Hospital on WhatsApp"
                className="w-8 h-8 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white flex items-center justify-center shadow-xs transition-transform hover:scale-105"
              >
                <WhatsAppIcon className="w-4 h-4 fill-white stroke-none" />
              </a>

              {/* Appointment Phone circular button (Red) */}
              <a
                href="tel:+918446094203"
                aria-label="Call Hospital for Appointment"
                title="Call Desk: +91 84460 94203"
                className="w-8 h-8 rounded-full bg-[#b91c1c] hover:bg-[#991b1b] text-white flex items-center justify-center shadow-xs transition-transform hover:scale-105"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>

            {/* Appointment Label and Phone Number */}
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-medium text-slate-500 leading-tight">
                For Appointment
              </span>
              <a
                href="tel:+918446094203"
                className="text-xs sm:text-sm font-bold text-[#b91c1c] tracking-tight hover:underline"
              >
                +91 84460 94203
              </a>
            </div>
          </div>

          {/* Far Right: Outlined "Login" button per reference screenshot */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(portalPath)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#b91c1c] border border-[#b91c1c] hover:bg-[#b91c1c]/10 rounded-md transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#b91c1c]" />
                  <span>Portal ({user.name.split(' ')[0]})</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  title="Logout"
                  className="p-1.5 text-slate-500 hover:text-[#b91c1c] rounded-md transition-colors"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#b91c1c] border border-[#b91c1c] hover:bg-[#b91c1c]/10 rounded-md transition-colors"
              >
                <User className="w-3.5 h-3.5 text-[#b91c1c]" />
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Bar (Plain black nav links on left, two CTA buttons on right) */}
      <nav className="bg-white/95 backdrop-blur-md px-4 lg:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 font-heading leading-none">
                Suman <span className="text-teal-700">Hospital</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase mt-1">
                & Trauma Care
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links in plain black text */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `text-sm font-semibold transition-colors duration-150 py-1 relative ${isActive
                    ? 'text-black font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#b91c1c] after:rounded-full'
                    : 'text-black hover:text-[#b91c1c]'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
          </div>

          {/* Desktop CTAs: Outlined secondary ("Find a Doctor") + Solid red primary ("Book Appointment") */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {/* Outlined Secondary Action */}
            <Link
              to="/doctors"
              className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-bold text-[#b91c1c] border-2 border-[#b91c1c] bg-transparent hover:bg-[#b91c1c]/5 rounded-lg transition-colors whitespace-nowrap"
            >
              Find a Doctor
            </Link>

            {/* Filled Primary Action (Solid red, visually dominant) */}
            <button
              onClick={onOpenBookModal}
              className="inline-flex items-center justify-center px-5 py-2 text-xs sm:text-sm font-bold text-white bg-[#b91c1c] hover:bg-[#991b1b] rounded-lg shadow-sm hover:shadow-md transition-all whitespace-nowrap cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Book Appointment
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-slate-800 hover:text-[#b91c1c] rounded-lg focus:outline-hidden"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-slate-200">
            <div className="flex flex-col gap-1 pb-3">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-between ${isActive
                      ? 'bg-slate-100 text-black font-bold border-l-4 border-[#b91c1c]'
                      : 'text-black hover:bg-slate-50'
                    }`
                  }
                >
                  <span>{link.name}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </NavLink>
              ))}

              {/* Mobile CTAs */}
              <div className="pt-3 flex flex-col gap-2 px-2">
                <Link
                  to="/doctors"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center text-xs font-bold text-[#b91c1c] border-2 border-[#b91c1c] rounded-lg bg-white"
                >
                  Find a Doctor
                </Link>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenBookModal();
                  }}
                  className="w-full py-2.5 text-center text-xs font-bold text-white bg-[#b91c1c] hover:bg-[#991b1b] rounded-lg shadow-sm"
                >
                  Book Appointment
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
