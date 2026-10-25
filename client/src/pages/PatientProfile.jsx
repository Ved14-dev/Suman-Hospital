import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertTriangle,
  Clock,
  HeartPulse,
  FileText,
  CreditCard,
  Edit,
  ArrowLeft,
  ShieldCheck,
  UserX,
  Stethoscope,
  PlusCircle,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Modal from '../components/Modal.jsx';
import { fetchPatientById, updatePatient, deactivatePatient } from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const PatientProfile = () => {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [history, setHistory] = useState({ noShowCount: 0, cancellationCount: 0, totalVisits: 0 });
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Deactivate Modal State
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const loadPatientProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchPatientById(token, id);
      if (res.success && res.data) {
        setPatient(res.data.patient);
        setVisits(res.data.visits || []);
        setHistory(res.data.history || { noShowCount: 0, cancellationCount: 0, totalVisits: 0 });
        setEditFormData({
          name: res.data.patient.name || '',
          gender: res.data.patient.gender || 'Other',
          phone: res.data.patient.phone || '',
          alternatePhone: res.data.patient.alternatePhone || '',
          email: res.data.patient.email || '',
          address: res.data.patient.address || '',
          bloodGroup: res.data.patient.bloodGroup || 'Unknown',
          emergencyName: res.data.patient.emergencyContact?.name || '',
          emergencyRelation: res.data.patient.emergencyContact?.relation || '',
          emergencyPhone: res.data.patient.emergencyContact?.phone || '',
          allergies: (res.data.patient.allergies || []).join(', '),
          chronicConditions: (res.data.patient.chronicConditions || []).join(', '),
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load patient record.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatientProfile();
  }, [id, token]);

  const handleEditSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: editFormData.name,
        gender: editFormData.gender,
        phone: editFormData.phone,
        alternatePhone: editFormData.alternatePhone,
        email: editFormData.email,
        address: editFormData.address,
        bloodGroup: editFormData.bloodGroup,
        emergencyContact: {
          name: editFormData.emergencyName,
          relation: editFormData.emergencyRelation,
          phone: editFormData.emergencyPhone,
        },
        allergies: editFormData.allergies ? editFormData.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
        chronicConditions: editFormData.chronicConditions ? editFormData.chronicConditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
      };
      await updatePatient(token, id, payload);
      setIsEditOpen(false);
      await loadPatientProfile();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to update patient profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (reason) => {
    setIsDeactivating(true);
    try {
      await deactivatePatient(token, id, reason);
      setIsDeactivateOpen(false);
      await loadPatientProfile();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to deactivate patient.');
    } finally {
      setIsDeactivating(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout breadcrumbs={[{ label: 'Patients', path: '/portal/patients' }, { label: 'Patient Profile' }]}>
        <div className="py-20 text-center animate-pulse space-y-3">
          <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto" />
          <div className="h-6 bg-slate-200 rounded-md w-60 mx-auto" />
          <div className="h-4 bg-slate-100 rounded-md w-40 mx-auto" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !patient) {
    return (
      <DashboardLayout breadcrumbs={[{ label: 'Patients', path: '/portal/patients' }, { label: 'Error' }]}>
        <div className="bg-rose-50 border border-rose-200 p-8 rounded-2xl text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-sm font-bold text-rose-900">{error || 'Patient record could not be found.'}</p>
          <Link
            to="/portal/patients"
            className="inline-flex items-center gap-2 text-xs font-bold text-teal-700 hover:text-teal-900 underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Patients Directory</span>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Patients', path: '/portal/patients' },
        { label: patient.name },
      ]}
    >
      <div className="space-y-6">
        {/* Top Profile Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border-2 border-teal-200 text-teal-800 flex items-center justify-center font-heading font-black text-2xl shrink-0">
              {patient.name?.charAt(0) || 'P'}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-heading font-black text-slate-900 tracking-tight">
                  {patient.name}
                </h1>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-teal-100/80 text-teal-900 border border-teal-200">
                  {patient.uhid}
                </span>
                <StatusBadge value={patient.isActive ? 'Active' : 'Inactive'} size="xs" />
              </div>
              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                <span>{patient.gender || 'Other'}</span>
                <span>·</span>
                <span>{patient.approxAge ? `${patient.approxAge} Years` : patient.dob || 'Age N/A'}</span>
                <span>·</span>
                <span className="font-bold text-slate-700">Blood Group: {patient.bloodGroup || 'Unknown'}</span>
                {patient.userId && (
                  <>
                    <span>·</span>
                    <span className="text-teal-700 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Portal Verified
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {['admin', 'receptionist'].includes(user?.role) && (
              <Link
                to="/portal/opd/walkin"
                state={{ preselectedPatientId: patient._id }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Issue OPD Visit</span>
              </Link>
            )}

            {['admin', 'receptionist'].includes(user?.role) && (
              <button
                onClick={() => setIsEditOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}

            {user?.role === 'admin' && patient.isActive && (
              <button
                onClick={() => setIsDeactivateOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Deactivate</span>
              </button>
            )}
          </div>
        </div>

        {/* Attendance & Reliability Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-heading">
              Total Completed Visits
            </span>
            <span className="text-2xl font-black text-slate-900 font-heading">
              {history.totalVisits}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-heading">
              Cancellations
            </span>
            <span className="text-2xl font-black text-amber-700 font-heading">
              {history.cancellationCount}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-heading">
              No-Show Count
            </span>
            <span className={`text-2xl font-black font-heading ${history.noShowCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {history.noShowCount}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-heading">
              Registry Status
            </span>
            <span className="text-sm font-bold text-emerald-700 block mt-1">
              {patient.isActive ? 'Active Registry' : 'Deactivated'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex gap-4 text-xs font-bold">
          {[
            { id: 'overview', label: 'Overview & Contacts' },
            { id: 'visits', label: `Visits & Appointments (${visits.length})` },
            { id: 'clinical', label: 'Clinical (Allergies & History)' },
            { id: 'prescriptions', label: 'Prescriptions & Notes' },
            { id: 'bills', label: 'Billing Invoices' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-teal-600 text-teal-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-heading border-b border-slate-100 pb-2">
                Contact & Address
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-3 text-slate-700">
                  <Phone className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Primary: <strong className="font-mono text-slate-900">{patient.phone}</strong></span>
                </div>
                {patient.alternatePhone && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Alternate: <strong className="font-mono text-slate-900">{patient.alternatePhone}</strong></span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <Mail className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Email: <strong className="text-slate-900">{patient.email}</strong></span>
                  </div>
                )}
                <div className="flex items-start gap-3 text-slate-700">
                  <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span>Address: {patient.address || 'Address not provided'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-heading border-b border-slate-100 pb-2">
                Emergency Contact
              </h3>
              {patient.emergencyContact?.name || patient.emergencyContact?.phone ? (
                <div className="space-y-2 text-xs">
                  <p><strong className="text-slate-900">{patient.emergencyContact.name}</strong> ({patient.emergencyContact.relation || 'Relation N/A'})</p>
                  <p className="font-mono text-slate-700 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {patient.emergencyContact.phone || 'No phone recorded'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400">No emergency contact information on file.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Visits Timeline */}
        {activeTab === 'visits' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-heading mb-4">
              Consultation & Admission Timeline (Newest First)
            </h3>
            {visits.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No recorded visits for this patient yet.</p>
            ) : (
              <div className="space-y-4 divide-y divide-slate-100">
                {visits.map((apt) => (
                  <div key={apt._id} className="pt-4 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-slate-900">
                          {apt.doctorId?.name || 'Attending Doctor'}
                        </strong>
                        <span className="text-xs text-slate-500">({apt.departmentId?.name})</span>
                        {apt.tokenNumber && (
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                            Token #{apt.tokenNumber}
                          </span>
                        )}
                        <StatusBadge value={apt.status} size="xs" />
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-3">
                        <span>Date: <strong>{apt.date}</strong></span>
                        <span>Slot: <strong>{apt.timeSlot}</strong></span>
                        <span>Source: <strong className="capitalize">{apt.source || 'online'}</strong></span>
                      </p>
                      {apt.reasonForVisit && (
                        <p className="text-xs text-slate-700">Reason: {apt.reasonForVisit}</p>
                      )}
                      {apt.consultationNotes && (
                        <div className="mt-2 text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-slate-800">
                          <span className="font-bold block text-slate-900">Consultation Note:</span>
                          {apt.consultationNotes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Clinical Information */}
        {activeTab === 'clinical' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-heading border-b border-slate-100 pb-2">
                Known Drug & Food Allergies
              </h3>
              {patient.allergies?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((allergy, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold"
                    >
                      ⚠️ {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No known drug or environmental allergies recorded.</p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-heading border-b border-slate-100 pb-2">
                Chronic Medical Conditions
              </h3>
              {patient.chronicConditions?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.chronicConditions.map((condition, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold"
                    >
                      {condition}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No chronic medical conditions recorded.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Prescriptions */}
        {activeTab === 'prescriptions' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-heading mb-4">
              Medical Prescriptions & EMR Notes
            </h3>
            {visits.filter((v) => v.consultationNotes).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No signed prescription or clinical notes recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {visits.filter((v) => v.consultationNotes).map((v) => (
                  <div key={v._id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <div>
                        <strong>{v.doctorId?.name}</strong> · {v.departmentId?.name}
                      </div>
                      <span className="font-mono text-slate-500">{v.date}</span>
                    </div>
                    <p className="whitespace-pre-line text-slate-800">{v.consultationNotes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Bills */}
        {activeTab === 'bills' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center py-12">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800 font-heading">Billing Invoices</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              OPD consultation fees and pharmacy billing receipts will appear here as billing transactions are recorded.
            </p>
          </div>
        )}

        {/* Edit Modal */}
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Edit Patient: ${patient.name}`}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleEditSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Alternate Phone</label>
                <input
                  type="tel"
                  value={editFormData.alternatePhone}
                  onChange={(e) => setEditFormData({ ...editFormData, alternatePhone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Known Allergies (comma-separated)</label>
                <input
                  type="text"
                  value={editFormData.allergies}
                  onChange={(e) => setEditFormData({ ...editFormData, allergies: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chronic Conditions (comma-separated)</label>
                <input
                  type="text"
                  value={editFormData.chronicConditions}
                  onChange={(e) => setEditFormData({ ...editFormData, chronicConditions: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Deactivate Confirm Dialog */}
        <ConfirmDialog
          isOpen={isDeactivateOpen}
          onClose={() => setIsDeactivateOpen(false)}
          onConfirm={handleDeactivate}
          title="Deactivate Patient Record"
          message={`Are you sure you want to deactivate patient record for "${patient.name}" (UHID: ${patient.uhid})?`}
          confirmText="Deactivate"
          isDestructive={true}
          requireReason={true}
          reasonPlaceholder="Mandatory reason for deactivation..."
          isLoading={isDeactivating}
        />
      </div>
    </DashboardLayout>
  );
};

export default PatientProfile;
