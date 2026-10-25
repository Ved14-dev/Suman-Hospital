import React from 'react';
import { Link } from 'react-router-dom';
import {
  HeartPulse,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Award,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center text-white shadow-md">
                <HeartPulse className="w-6 h-6" />
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-white font-heading">
                Suman <span className="text-teal-400">Hospital</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed pr-4">
              Suman  Hospital is a premier 100-bed quaternary care institution dedicated to clinical excellence, patient safety, and cutting-edge medical diagnostics in Amravati, India.
            </p>
            <div className="flex items-center gap-3 pt-2">

              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
                <Award className="w-4 h-4 text-sky-400" />
                <span>NABL Lab Certified</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-heading border-l-2 border-teal-500 pl-3">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'About Suman', path: '/about' },
                { label: 'Specialty Departments', path: '/departments' },
                { label: 'Find a Specialist', path: '/doctors' },
                { label: 'Medical Services', path: '/services' },
                { label: 'Health Insights & Articles', path: '/health-insights' },
                { label: 'Contact & Support', path: '/contact' },
              ].map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="hover:text-teal-400 transition-colors flex items-center gap-1.5 group"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Key Departments */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-heading border-l-2 border-sky-500 pl-3">
              Departments
            </h4>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: 'General Checkup & Medicine', slug: 'general-medicine' },
                { label: 'Pediatrics & NICU', slug: 'pediatrics' },
                { label: 'Orthopedics & Joint', slug: 'orthopedics' },
                { label: 'Gynaecology & Panchakarma', slug: 'gynaecology' },
                { label: 'Cardiology & Cath Lab', slug: 'cardiology' },
                { label: 'Neurology & Brain Care', slug: 'neurology' },
              ].map((dept) => (
                <li key={dept.slug}>
                  <Link
                    to={`/departments?slug=${dept.slug}`}
                    className="hover:text-sky-400 transition-colors flex items-center gap-1.5 group"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition-colors" />
                    <span>{dept.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Emergency & Location */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-heading border-l-2 border-rose-500 pl-3">
              24/7 Helpline
            </h4>
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-3">
              <a
                href="tel:+9107212555555"
                className="flex items-start gap-3 group text-rose-400 hover:text-rose-300"
              >
                <Phone className="w-5 h-5 mt-0.5 text-rose-500 shrink-0" />
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Emergency Trauma</span>
                  <span className="text-sm font-bold tracking-tight">+91 (0721) 2555555</span>
                </div>
              </a>
              <a
                href="tel:+918446094203"
                className="flex items-start gap-3 group text-teal-400 hover:text-teal-300"
              >
                <Phone className="w-5 h-5 mt-0.5 text-teal-500 shrink-0" />
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Appointment Desk</span>
                  <span className="text-sm font-bold tracking-tight">+91 84460 94203</span>
                </div>
              </a>
              <div className="flex items-start gap-3 text-slate-300 text-xs">
                <Mail className="w-4 h-4 mt-0.5 text-teal-400 shrink-0" />
                <span>care@suman-hospital.org</span>
              </div>
              <div className="flex items-start gap-3 text-slate-300 text-xs">
                <MapPin className="w-4 h-4 mt-0.5 text-sky-400 shrink-0" />
                <span>Suman Care Marg, Near Hanuman Mandir, Amravati - 444601</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Suman  Hospital. All rights reserved. (College Project Demo Phase 1)</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 transition-colors cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 transition-colors cursor-pointer">Patient Charter</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
