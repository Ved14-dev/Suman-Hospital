import React from 'react';
import { Printer, X, HeartPulse } from 'lucide-react';

const PrintSlip = ({ appointment, onClose }) => {
  if (!appointment) return null;

  const handlePrint = () => {
    window.print();
  };

  const patientName = appointment.patientId?.name || 'Walk-in Patient';
  const uhid = appointment.patientId?.uhid || 'N/A';
  const doctorName = appointment.doctorId?.name || 'Attending Physician';
  const specialization = appointment.doctorId?.specialization || '';
  const roomNumber = appointment.doctorId?.roomNumber || 'OPD Room';
  const departmentName = appointment.departmentId?.name || 'General OPD';
  const tokenNumber = appointment.tokenNumber || appointment.token || 1;
  const visitDate = appointment.date;
  const source = appointment.source || 'walk-in';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Container - on screen: modal card; on print: isolated print page */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden print:w-full print:max-w-none print:shadow-none print:border-none print:m-0 print:p-0">
        {/* On-screen Action Toolbar (hidden during print) */}
        <div className="print:hidden p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            OPD Token Slip Preview
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* The Printable Slip itself */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-900 bg-white">
          {/* Hospital Letterhead */}
          <div className="text-center border-b-2 border-slate-900 pb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center print:border print:border-slate-800">
                <HeartPulse className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-heading font-black tracking-tight text-slate-950 uppercase">
                Suman Multispecialty Hospital
              </h2>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              Civil Lines, Amravati, Maharashtra - 444601
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Emergency & OPD Hotline: +91 (022) 2890-4400
            </p>
          </div>

          {/* Token Number Display */}
          <div className="text-center py-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
              DAILY CONSULTATION TOKEN
            </p>
            <p className="text-5xl font-black text-slate-950 font-mono my-1 tracking-tight">
              #{tokenNumber}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-teal-800">
              <span className="capitalize">{source} Visit</span>
              <span>·</span>
              <span>Date: {visitDate}</span>
            </div>
          </div>

          {/* Patient and Doctor Details */}
          <div className="space-y-3 text-xs divide-y divide-slate-100">
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500 font-semibold">Patient Name:</span>
              <strong className="text-slate-900 font-bold uppercase">{patientName}</strong>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500 font-semibold">UHID:</span>
              <strong className="text-slate-900 font-mono font-bold">{uhid}</strong>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500 font-semibold">Department:</span>
              <span className="text-slate-800 font-medium">{departmentName}</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500 font-semibold">Consulting Doctor:</span>
              <div className="text-right">
                <strong className="text-slate-900 font-bold block">{doctorName}</strong>
                <span className="text-[10px] text-slate-500 block">{specialization}</span>
              </div>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500 font-semibold">Room / Location:</span>
              <strong className="text-teal-700 font-bold">{roomNumber}</strong>
            </div>
            {appointment.reasonForVisit && (
              <div className="pt-2 flex justify-between">
                <span className="text-slate-500 font-semibold">Reason:</span>
                <span className="text-slate-700">{appointment.reasonForVisit}</span>
              </div>
            )}
          </div>

          {/* Instructions Footer */}
          <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-500 space-y-1 text-center">
            <p>Please wait near the consulting room. Your token will be announced on the OPD display screen.</p>
            <p className="font-mono text-slate-400">Generated on {new Date().toLocaleTimeString('en-IN')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintSlip;
