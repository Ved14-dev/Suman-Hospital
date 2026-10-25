import React from 'react';

const BADGE_STYLES = {
  // Queue & Lifecycle
  'Waiting': 'bg-amber-50 text-amber-700 border border-amber-200/80',
  'In Consultation': 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 animate-pulse',
  'Completed': 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  'Cancelled': 'bg-rose-50 text-rose-700 border border-rose-200/80',
  'Rescheduled': 'bg-purple-50 text-purple-700 border border-purple-200/80',
  'No-show': 'bg-slate-100 text-slate-700 border border-slate-300',
  'Pending': 'bg-amber-50 text-amber-700 border border-amber-200/80',
  'Confirmed': 'bg-sky-50 text-sky-700 border border-sky-200/80',
  'Not Arrived': 'bg-slate-100 text-slate-500 border border-slate-200',

  // Status
  'Active': 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  'Inactive': 'bg-rose-50 text-rose-700 border border-rose-200/80',
  'walk-in': 'bg-teal-50 text-teal-700 border border-teal-200 font-mono',
  'online': 'bg-blue-50 text-blue-700 border border-blue-200 font-mono',
};

const StatusBadge = ({ value, className = '', size = 'sm' }) => {
  if (!value) return null;
  const style = BADGE_STYLES[value] || 'bg-slate-100 text-slate-700 border border-slate-200';
  const sizeClasses = size === 'xs' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full select-none ${sizeClasses} ${style} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 shrink-0" />
      <span>{value}</span>
    </span>
  );
};

export default StatusBadge;
