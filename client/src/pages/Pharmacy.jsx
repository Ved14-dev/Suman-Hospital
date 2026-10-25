import React, { useEffect, useState } from 'react';
import { AlertTriangle, Package, RefreshCw, Search } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import { fetchMedicines, fetchStockAlerts, fetchStockLevels } from '../api/api';
import { useAuth } from '../context/AuthContext';

const Pharmacy = () => {
  const { token } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [levels, setLevels] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [medicineResponse, stockResponse, alertResponse] = await Promise.all([
        fetchMedicines(token, query ? { q: query } : {}),
        fetchStockLevels(token),
        fetchStockAlerts(token),
      ]);
      setMedicines(medicineResponse.data || []);
      setLevels(stockResponse.data || []);
      setAlerts(alertResponse.data || { counts: {} });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load pharmacy inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const submitSearch = (event) => {
    event.preventDefault();
    load();
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Pharmacy' }]}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold font-heading text-slate-900">Pharmacy Inventory</h1>
            <p className="text-sm text-slate-500 mt-1">Medicine master, available stock, and expiry alerts.</p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['Low stock', alerts?.counts?.lowStock || 0, 'Needs reorder'],
            ['Near expiry', alerts?.counts?.nearExpiry || 0, 'Within alert window'],
            ['Expired', alerts?.counts?.expired || 0, 'Excluded from stock'],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{label}</p>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
              <p className="mt-1 text-xs text-slate-500">{hint}</p>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form onSubmit={submitSearch} className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input aria-label="Search medicines" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by medicine or generic name" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" />
            </div>
            <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700">Search</button>
          </form>
          {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading inventory…</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <tr><th className="px-3 py-3">Medicine</th><th className="px-3 py-3">Form</th><th className="px-3 py-3">Available</th><th className="px-3 py-3">Reorder level</th><th className="px-3 py-3">Status</th></tr>
                </thead>
                <tbody>
                  {medicines.map((medicine) => {
                    const level = levels.find((item) => item.medicine?._id === medicine._id);
                    const available = level?.totalAvailable || 0;
                    const low = available <= (medicine.reorderLevel || 0);
                    return <tr key={medicine._id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-3"><p className="font-bold text-slate-900">{medicine.name}</p><p className="text-xs text-slate-500">{medicine.genericName || 'Generic not specified'}</p></td>
                      <td className="px-3 py-3 text-slate-600">{medicine.form || '—'} {medicine.strength || ''}</td>
                      <td className="px-3 py-3 font-bold text-slate-900">{available}</td>
                      <td className="px-3 py-3 text-slate-600">{medicine.reorderLevel || 0}</td>
                      <td className="px-3 py-3"><StatusBadge value={low ? 'Low stock' : 'In stock'} size="xs" /></td>
                    </tr>;
                  })}
                </tbody>
              </table>
              {!medicines.length && <p className="py-8 text-center text-sm text-slate-500"><Package className="mx-auto mb-2 h-6 w-6" />No medicines found.</p>}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Pharmacy;
