import React from 'react';
import { Clock, MapPin, Calendar, Award, ShieldCheck, Stethoscope } from 'lucide-react';

const DoctorCard = ({ doctor, onBookClick }) => {
  // Extract clean initials (e.g., "Dr. Rajesh Sharma" -> "RS")
  const getInitials = (name = '') => {
    const cleanName = name.replace(/^Dr\.\s*/i, '').trim();
    const parts = cleanName.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase() || 'MD';
  };

  const initials = getInitials(doctor.name);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group card-hover-lift">
      {/* Top Banner: Description-Focused Typography & Monogram (No AI or Stock Photos) */}
      <div className="relative bg-gradient-to-br from-slate-50 via-teal-50/40 to-sky-50 pt-7 px-6 pb-3 text-center border-b border-slate-100">
        {/* Monogram Badge */}
        <div className="relative w-20 h-20 mx-auto mb-3">
          <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-slate-900 to-teal-800 text-white flex items-center justify-center font-heading font-extrabold text-2xl shadow-md border-2 border-white group-hover:scale-105 transition-transform duration-300">
            {initials}
          </div>
          <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 border-2 border-white">
            <Award className="w-3 h-3" />
            <span>{doctor.experience}+ Yrs</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-teal-700 uppercase tracking-wider mb-1">
          {doctor.isHOD ? (
            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-extrabold text-[10px]">
              ⭐ Head of Department (HOD)
            </span>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Verified Faculty</span>
            </>
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors font-heading leading-tight">
          {doctor.name}
        </h3>

        <p className="text-xs font-semibold text-slate-600 mt-1 mb-2">
          {doctor.specialization}
        </p>

        {doctor.department && (
          <span className="inline-block bg-teal-100/80 text-teal-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
            {typeof doctor.department === 'object' ? doctor.department.name : 'Specialist Department'}
          </span>
        )}
      </div>

      {/* Body Info */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5 text-xs text-slate-600">
          <div className="flex items-start gap-2">
            <span className="font-semibold text-slate-900 shrink-0">Credentials:</span>
            <span className="text-slate-700 font-medium">{doctor.qualification}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <Clock className="w-4 h-4 text-teal-700 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-800">{doctor.consultationTimings}</span>
          </div>

          {doctor.roomNumber && (
            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{doctor.roomNumber}</span>
            </div>
          )}

          <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed pt-1">
            {doctor.bio}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={() => onBookClick(doctor)}
            className="w-full py-2.5 px-4 bg-[#b91c1c] hover:bg-[#991b1b] text-white rounded-xl font-bold text-xs shadow-xs hover:shadow transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Consultation Slot</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorCard;
