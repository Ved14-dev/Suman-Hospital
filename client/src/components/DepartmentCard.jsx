import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HeartPulse,
  Bone,
  Baby,
  Sparkles,
  Brain,
  Stethoscope,
  ChevronRight,
  CheckCircle2,
  PhoneCall,
} from 'lucide-react';

const iconMap = {
  HeartPulse,
  Bone,
  Baby,
  Sparkles,
  Brain,
  Stethoscope,
};

const DepartmentCard = ({ department, onBookAppointment }) => {
  const [imgError, setImgError] = useState(false);
  const IconComponent = iconMap[department.icon] || Stethoscope;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group card-hover-lift">
      {/* Card Header Image with Overlay & Clean Vector Fallback */}
      <div className="relative h-48 overflow-hidden bg-slate-900">
        {!imgError && department.image ? (
          <img
            src={department.image}
            alt={`${department.name} clinical unit at Suman Hospital`}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-teal-950 to-slate-800 flex items-center justify-center">
            <IconComponent className="w-20 h-20 text-teal-400/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/30 to-transparent" />
        
        {/* Floating Dept Icon */}
        <div className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-white/95 backdrop-blur-xs flex items-center justify-center text-sky-600 shadow-md">
          <IconComponent className="w-5 h-5" />
        </div>

        {/* Title over overlay */}
        <div className="absolute bottom-3 left-4 right-4 text-white">
          <h3 className="text-xl font-bold font-heading drop-shadow-sm">
            {department.name}
          </h3>
          <p className="text-xs text-slate-200 line-clamp-1 font-medium">
            Head: {department.headOfDept || 'Medical Director'}
          </p>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <p className="text-xs text-slate-600 leading-relaxed mb-4 line-clamp-3">
            {department.shortDescription || department.description}
          </p>

          {/* Key Services Offered */}
          {department.servicesOffered && department.servicesOffered.length > 0 && (
            <div className="space-y-1.5 mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Key Procedures:</span>
              <ul className="space-y-1">
                {department.servicesOffered.slice(0, 3).map((serv, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 mt-0.5 shrink-0" />
                    <span className="line-clamp-1">{serv}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer CTAs */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <Link
            to={`/departments?slug=${department.slug}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors group/link"
          >
            <span>View Specialists & Info</span>
            <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
          </Link>

          <button
            onClick={() => onBookAppointment && onBookAppointment(department)}
            className="px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-bold transition-colors"
          >
            Consult
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepartmentCard;
