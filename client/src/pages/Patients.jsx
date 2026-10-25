import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Eye, UserX, Users, Phone, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { fetchPatients, deactivatePatient } from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { hasPermission } from '../utils/permissions.js';

const Patients = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState('true');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Deactivate Dialog State
  const [selectedPatientForDeactivate, setSelectedPatientForDeactivate] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load patients
  const loadPatients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        search: debouncedSearch || undefined,
        isActive: isActiveFilter === 'all' ? undefined : isActiveFilter,
      };
      const res = await fetchPatients(token, params);
      if (res.success) {
        setPatients(res.data.patients || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load patients registry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [token, page, debouncedSearch, isActiveFilter]);

  const handleDeactivateConfirm = async (reason) => {
    if (!selectedPatientForDeactivate) return;
    setIsDeactivating(true);
    try {
      await deactivatePatient(token, selectedPatientForDeactivate._id, reason);
      setSelectedPatientForDeactivate(null);
      await loadPatients();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to deactivate patient.');
    } finally {
      setIsDeactivating(false);
    }
  };

  const columns = [
    {
      header: 'UHID',
      key: 'uhid',
      render: (row) => (
        <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
          {row.uhid}
        </span>
      ),
    },
    {
      header: 'Patient Name',
      key: 'name',
      render: (row) => (
        <div>
          <button
            onClick={() => navigate(`/portal/patients/${row._id}`)}
            className="font-bold text-slate-900 hover:text-teal-700 transition-colors text-left block"
          >
            {row.name}
          </button>
          {row.userId ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-teal-600 font-semibold">
              <ShieldCheck className="w-3 h-3" />
              <span>Portal Account Linked</span>
            </span>
          ) : (
            <span className="text-[10px] text-slate-400">Walk-in Patient</span>
          )}
        </div>
      ),
    },
    {
      header: 'Demographics',
      key: 'gender',
      render: (row) => (
        <span className="text-slate-600">
          {row.gender || 'Other'} {row.approxAge ? `· ${row.approxAge} yrs` : ''}
        </span>
      ),
    },
    {
      header: 'Phone Number',
      key: 'phone',
      render: (row) => (
        <div className="flex items-center gap-1 text-slate-700 font-mono">
          <Phone className="w-3 h-3 text-slate-400" />
          <span>{row.phone}</span>
        </div>
      ),
    },
    {
      header: 'Blood Group',
      key: 'bloodGroup',
      render: (row) => (
        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[11px]">
          {row.bloodGroup || 'Unknown'}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'isActive',
      render: (row) => (
        <StatusBadge value={row.isActive ? 'Active' : 'Inactive'} size="xs" />
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => navigate(`/portal/patients/${row._id}`)}
            className="p-1.5 text-teal-700 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
            title="View Patient Profile"
          >
            <Eye className="w-4 h-4" />
          </button>
          {user?.role === 'admin' && row.isActive && (
            <button
              onClick={() => setSelectedPatientForDeactivate(row)}
              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Deactivate Patient (Soft Delete)"
            >
              <UserX className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Patients', path: '/portal/patients' }]}>
      <div className="space-y-6">
        {/* Header & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-black text-slate-900 tracking-tight">
              Hospital Patient Registry
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Centralized record directory across OPD visits, admissions, and emergency cases.
            </p>
          </div>
          {hasPermission(user, 'patient:create') && (
            <Link
              to="/portal/patients/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer active:scale-98"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register New Patient</span>
            </Link>
          )}
        </div>

        {/* Patients DataTable */}
        <DataTable
          columns={columns}
          data={patients}
          isLoading={isLoading}
          error={error}
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by UHID, Name, or Phone..."
          currentPage={page}
          totalPages={totalPages}
          totalRecords={total}
          onPageChange={setPage}
          filterControls={
            <select
              value={isActiveFilter}
              onChange={(e) => {
                setIsActiveFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs p-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-teal-500"
            >
              <option value="true">Active Patients</option>
              <option value="all">All Patients</option>
              <option value="false">Deactivated Only</option>
            </select>
          }
        />

        {/* Deactivation Confirm Dialog */}
        <ConfirmDialog
          isOpen={Boolean(selectedPatientForDeactivate)}
          onClose={() => setSelectedPatientForDeactivate(null)}
          onConfirm={handleDeactivateConfirm}
          title="Deactivate Patient Record"
          message={`Are you sure you want to deactivate patient "${selectedPatientForDeactivate?.name}" (UHID: ${selectedPatientForDeactivate?.uhid})? This is a soft-delete and clinical history will be preserved.`}
          confirmText="Deactivate Patient"
          isDestructive={true}
          requireReason={true}
          reasonPlaceholder="Enter reason for deactivation (e.g. registered in error, requested)..."
          isLoading={isDeactivating}
        />
      </div>
    </DashboardLayout>
  );
};

export default Patients;
