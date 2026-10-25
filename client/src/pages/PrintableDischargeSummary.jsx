import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, HeartPulse, Printer, RefreshCw, XCircle } from 'lucide-react';
import { fetchAdmission } from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const PrintableDischargeSummary = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [admission, setAdmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchAdmission(token, id);
        setAdmission(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load discharge summary.');
      } finally {
        setLoading(false);
      }
    };
    if (token && id) load();
  }, [token, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 bg-white p-6 rounded-2xl shadow-sm">
          <RefreshCw className="h-5 w-5 animate-spin text-teal-600" />
          <span className="text-sm font-bold text-slate-700">Loading discharge summary...</span>
        </div>
      </div>
    );
  }

  if (error || !admission) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md bg-white p-6 rounded-2xl shadow-sm border border-rose-200 text-center space-y-3">
          <XCircle className="h-10 w-10 text-rose-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">Unable to load summary</h2>
          <p className="text-xs text-slate-500">{error || 'Admission not found.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const {
    admissionNumber,
    patientId,
    admittingDoctorId,
    departmentId,
    bedId,
    admittedAt,
    dischargedAt,
    dischargeSummary,
    finalChargeSummary,
  } = admission;

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6">
      {/* Top action toolbar (Hidden in Print) */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Admissions
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition-all"
        >
          <Printer className="h-4 w-4" /> Print / Save as PDF (A4)
        </button>
      </div>

      {/* A4 Letterhead Document Canvas */}
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 shadow-lg rounded-2xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none text-slate-900 font-sans">
        {/* Hospital Letterhead Header */}
        <div className="border-b-2 border-teal-700 pb-5 mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold print:border print:border-teal-700">
              <HeartPulse className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase font-heading">
                Suman Multispecialty Hospital
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Camp Road, Near Tapovan, Amravati — 444602, Maharashtra
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                Phone: +91 (022) 2890-4400 • Emergency: +91 98200 11999 • Web: sumanhospital.com
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block bg-teal-800 text-white font-extrabold text-[11px] tracking-wider uppercase px-3 py-1 rounded-sm">
              Discharge Summary
            </span>
            <p className="text-[11px] font-mono text-slate-600 mt-1 font-bold">
              Adm No: {admissionNumber}
            </p>
          </div>
        </div>

        {/* Patient Identification Grid */}
        <div className="border border-slate-300 rounded-lg p-3.5 mb-6 bg-slate-50/50 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Patient Name</span>
            <span className="font-black text-slate-900 text-sm">{patientId?.name}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">UHID</span>
            <span className="font-mono font-bold text-slate-900">{patientId?.uhid}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Age / Gender</span>
            <span className="font-semibold text-slate-800">{patientId?.approxAge || 'N/A'} Yrs / {patientId?.gender}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Group</span>
            <span className="font-bold text-slate-800">{patientId?.bloodGroup || 'Not Recorded'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Admitted Date</span>
            <span className="font-mono font-medium text-slate-800">{new Date(admittedAt).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Discharged Date</span>
            <span className="font-mono font-medium text-slate-800">
              {dischargedAt ? new Date(dischargedAt).toLocaleDateString() : 'Active'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Ward & Bed</span>
            <span className="font-semibold text-slate-800">{bedId?.wardId?.name} — {bedId?.bedNumber}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Attending Consultant</span>
            <span className="font-bold text-slate-900">{admittingDoctorId?.name}</span>
          </div>
        </div>

        {/* Clinical Summary Sections */}
        <div className="space-y-4 text-xs">
          {/* Final Diagnosis */}
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-black uppercase text-[11px] text-teal-900 tracking-wider mb-1">
              Final Diagnosis
            </h3>
            <p className="text-slate-800 font-semibold text-sm">
              {dischargeSummary?.finalDiagnosis || 'Not specified'}
            </p>
          </div>

          {/* Treatment Given */}
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-black uppercase text-[11px] text-teal-900 tracking-wider mb-1">
              Course in Hospital & Treatment Given
            </h3>
            <p className="text-slate-800 whitespace-pre-line leading-relaxed">
              {dischargeSummary?.treatmentGiven || 'Routine medical management.'}
            </p>
          </div>

          {/* Condition at Discharge */}
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-black uppercase text-[11px] text-teal-900 tracking-wider mb-1">
              Condition at Discharge
            </h3>
            <p className="font-bold text-slate-900">
              {dischargeSummary?.conditionAtDischarge || 'Stable'}
            </p>
          </div>

          {/* Advice on Discharge */}
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-black uppercase text-[11px] text-teal-900 tracking-wider mb-1">
              Advice on Discharge & Diet
            </h3>
            <p className="text-slate-800 whitespace-pre-line leading-relaxed">
              {dischargeSummary?.adviceOnDischarge || 'Adequate rest, follow prescribed diet and hydration.'}
            </p>
          </div>

          {/* Follow-up Plan */}
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-black uppercase text-[11px] text-teal-900 tracking-wider mb-1">
              Follow-up & Emergency Instructions
            </h3>
            <p className="text-slate-800 font-medium">
              {dischargeSummary?.followUp || 'Report to OPD if symptoms recur or emergency department if acute distress.'}
            </p>
          </div>

          {/* Final Bed Charge Summary */}
          {finalChargeSummary && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-1.5 text-xs">
              <h4 className="font-black uppercase text-[10px] text-slate-500 tracking-wider">
                Inpatient Bed Stay Tariff Summary
              </h4>
              <div className="flex justify-between items-center text-slate-700">
                <span>Calendar Days Touched (Day started counted as full):</span>
                <span className="font-bold font-mono">{finalChargeSummary.days} day(s)</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Applicable Daily Rate:</span>
                <span className="font-bold font-mono">₹{(finalChargeSummary.dailyCharge / 100).toFixed(2)}/day</span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center font-black text-slate-900 text-sm">
                <span>Total Inpatient Bed Charges:</span>
                <span className="font-mono text-teal-800">₹{(finalChargeSummary.total / 100).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Doctor Signature Block */}
        <div className="mt-12 pt-8 flex items-end justify-between text-xs">
          <div>
            <p className="text-slate-400 text-[10px] font-mono">Generated on: {new Date().toLocaleString()}</p>
            <p className="text-slate-400 text-[10px]">Valid with hospital seal and physician signature</p>
          </div>
          <div className="text-center w-56 border-t border-slate-400 pt-2">
            <p className="font-black text-slate-900">{admittingDoctorId?.name}</p>
            <p className="text-[10px] text-slate-500">{admittingDoctorId?.qualification || 'Consultant Physician'}</p>
            <p className="text-[10px] text-slate-400">Reg. No: MMC / SMH-DOC</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableDischargeSummary;
