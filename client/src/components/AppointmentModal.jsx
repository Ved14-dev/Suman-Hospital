import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Phone, Mail, CheckCircle2, FileText, HeartPulse } from 'lucide-react';

const AppointmentModal = ({ isOpen, onClose, doctors = [], selectedDoctor = null }) => {
  const [doctorId, setDoctorId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredSlot, setPreferredSlot] = useState('10:30 AM');
  const [reason, setReason] = useState('');
  const [submittedData, setSubmittedData] = useState(null);

  useEffect(() => {
    if (selectedDoctor) {
      setDoctorId(selectedDoctor._id || selectedDoctor.id || '');
    } else if (doctors.length > 0) {
      setDoctorId(doctors[0]._id);
    }
  }, [selectedDoctor, doctors]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const docObj = doctors.find((d) => d._id === doctorId) || selectedDoctor || { name: 'Specialist Physician' };
    const refNo = 'SUMAN-' + Math.floor(100000 + Math.random() * 900000);

    setSubmittedData({
      refNo,
      doctorName: docObj.name,
      specialization: docObj.specialization || 'Medical Specialist',
      patientName,
      date: preferredDate || new Date().toISOString().split('T')[0],
      slot: preferredSlot,
      room: docObj.roomNumber || 'OPD Block A, Counter 3',
    });
  };

  const handleReset = () => {
    setSubmittedData(null);
    setPatientName('');
    setPatientPhone('');
    setPatientEmail('');
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden relative my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-teal-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading">Book Doctor Appointment</h3>
              <p className="text-xs text-sky-100 font-medium">Suman  OPD Services</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/90 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!submittedData ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
            {/* Select Doctor */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">Select Doctor / Specialist</label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                required
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white font-medium text-slate-800"
              >
                {doctors.map((doc) => (
                  <option key={doc._id} value={doc._id}>
                    {doc.name} - {doc.specialization} ({typeof doc.department === 'object' ? doc.department?.name : 'Department'})
                  </option>
                ))}
              </select>
            </div>

            {/* Patient Name */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">Patient Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-medium"
                />
              </div>
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Mobile Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98200 12345"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="patient@example.com"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Date & Time Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Preferred Date</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-1">Time Slot</label>
                <select
                  value={preferredSlot}
                  onChange={(e) => setPreferredSlot(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-medium bg-white"
                >
                  <option value="09:30 AM">09:30 AM - Morning Slot</option>
                  <option value="11:00 AM">11:00 AM - Morning Slot</option>
                  <option value="02:30 PM">02:30 PM - Afternoon Slot</option>
                  <option value="04:30 PM">04:30 PM - Evening Slot</option>
                  <option value="06:00 PM">06:00 PM - Evening Slot</option>
                </select>
              </div>
            </div>

            {/* Symptoms / Note */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">Medical Reason / Symptoms (Optional)</label>
              <textarea
                rows={2}
                placeholder="Describe your health issue or purpose of visit..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-medium resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                Confirm Appointment Slot
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation Receipt View */
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-full border border-emerald-200 mb-1">
                APPOINTMENT CONFIRMED
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 font-heading">
                Ref No: {submittedData.refNo}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                A confirmation SMS and email pass has been sent to {patientEmail}.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-medium">Doctor:</span>
                <span className="font-bold text-slate-900">{submittedData.doctorName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-medium">Patient:</span>
                <span className="font-bold text-slate-900">{submittedData.patientName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500 font-medium">Date & Slot:</span>
                <span className="font-bold text-sky-700">{submittedData.date} at {submittedData.slot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Reporting OPD Counter:</span>
                <span className="font-bold text-slate-800">{submittedData.room}</span>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Done & Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentModal;
