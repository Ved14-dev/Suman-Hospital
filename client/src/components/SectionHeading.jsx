import React from 'react';

const SectionHeading = ({ badge, title, subtitle, align = 'center' }) => {
  const alignClass = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center mx-auto';

  return (
    <div className={`max-w-3xl mb-12 ${alignClass}`}>
      {badge && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700 uppercase tracking-wider mb-3 border border-sky-200">
          {badge}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-heading leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-base text-slate-600 leading-relaxed font-normal">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SectionHeading;
