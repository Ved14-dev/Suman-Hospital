import React from 'react';

const SkeletonLoader = ({ type = 'card', count = 3 }) => {
  const skeletons = Array.from({ length: count });

  if (type === 'department') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skeletons.map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 animate-skeleton">
            <div className="h-40 bg-slate-200 rounded-xl w-full" />
            <div className="h-6 bg-slate-200 rounded-md w-3/4" />
            <div className="h-4 bg-slate-200 rounded-md w-full" />
            <div className="h-4 bg-slate-200 rounded-md w-5/6" />
            <div className="h-8 bg-slate-200 rounded-lg w-1/3 pt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'doctor') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {skeletons.map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 animate-skeleton text-center">
            <div className="w-24 h-24 bg-slate-200 rounded-full mx-auto" />
            <div className="h-5 bg-slate-200 rounded-md w-2/3 mx-auto" />
            <div className="h-3 bg-slate-200 rounded-md w-1/2 mx-auto" />
            <div className="h-12 bg-slate-100 rounded-lg w-full" />
            <div className="h-9 bg-slate-200 rounded-xl w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {skeletons.map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 animate-skeleton space-y-3">
          <div className="h-5 bg-slate-200 rounded-md w-1/3" />
          <div className="h-4 bg-slate-200 rounded-md w-full" />
          <div className="h-4 bg-slate-200 rounded-md w-4/5" />
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
