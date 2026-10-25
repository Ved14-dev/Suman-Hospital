import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'teal', className = '' }) => {
  const colorMap = {
    teal: 'bg-teal-50 text-teal-600 border-teal-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  const currentTheme = colorMap[color] || colorMap.teal;

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between gap-4 transition-all hover:shadow-md ${className}`}
    >
      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider font-heading">
          {title}
        </p>
        <p className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
          {value ?? '-'}
        </p>
        {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
      </div>
      {Icon && (
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${currentTheme}`}
        >
          <Icon className="w-6 h-6 stroke-[1.75]" />
        </div>
      )}
    </div>
  );
};

export default StatCard;
