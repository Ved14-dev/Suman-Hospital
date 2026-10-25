import React, { useState, useEffect } from 'react';
import { BarChart3, AlertOctagon, XCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { fetchNoShowCancellationReport } from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const NoShowReport = () => {
  const { token } = useAuth();
  const [data, setData] = useState({ summary: { total: 0, noShows: 0, cancellations: 0 }, records: [] });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const res = await fetchNoShowCancellationReport(token, params);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [token, startDate, endDate]);

  return (
    <DashboardLayout breadcrumbs={[{ label: 'OPD Queue', path: '/portal/opd/queue' }, { label: 'No-Show & Cancellation Reports' }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-black text-slate-900 tracking-tight">
              No-Show & Cancellation Analytics
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Admin audit of slot abandonments, reasons, and patient attendance rates.
            </p>
          </div>
          <Link
            to="/portal/opd/queue"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Queue</span>
          </Link>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Lost Consultations"
            value={data.summary.total}
            subtitle="Combined no-shows & cancellations"
            icon={BarChart3}
            color="rose"
          />
          <StatCard
            title="Total No-Shows"
            value={data.summary.noShows}
            subtitle="Patient failed to arrive"
            icon={AlertOctagon}
            color="purple"
          />
          <StatCard
            title="Total Cancellations"
            value={data.summary.cancellations}
            subtitle="Cancelled with documented reason"
            icon={XCircle}
            color="amber"
          />
        </div>

        {/* Report Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-heading">
              Detailed Audit Records ({data.records.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Slot</th>
                  <th className="py-3 px-4">Patient (UHID)</th>
                  <th className="py-3 px-4">Doctor & Dept</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.records.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400">
                      No no-shows or cancellations recorded for the selected period.
                    </td>
                  </tr>
                ) : (
                  data.records.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono">
                        <strong className="block text-slate-900">{r.date}</strong>
                        <span className="text-[11px] text-slate-500">{r.timeSlot}</span>
                      </td>
                      <td className="py-3 px-4">
                        <strong className="block text-slate-900">{r.patientId?.name || 'Walk-in'}</strong>
                        <span className="font-mono text-[10px] text-teal-700">{r.patientId?.uhid}</span>
                      </td>
                      <td className="py-3 px-4">
                        <strong className="block text-slate-800">{r.doctorId?.name}</strong>
                        <span className="text-[11px] text-slate-500">{r.departmentId?.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge value={r.status} size="xs" />
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-sm">
                        {r.cancellationReason || (r.status === 'No-show' ? 'Patient did not arrive for scheduled slot' : 'N/A')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NoShowReport;
