import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { UserPlus, ArrowLeft, Printer, CheckCircle2, Search, UserCheck } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import PrintSlip from '../components/PrintSlip';
import {
  fetchDepartments,
  fetchDoctors,
  quickSearchPatients,
  createWalkInAppointment,
  fetchPatientById,
} from '../api/api';
import { useAuth } from '../context/AuthContext';

const WalkInRegistration = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('');

  // Mode: Existing Registered Patient vs Inline Registration
  const [isInlineNewPatient, setIsInlineNewPatient] = useState(false);

  // Existing Patient Search
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Inline New Patient Fields
  const [newPatient, setNewPatient] = useState({
    name: '',
    gender: 'Male',
    phone: '',
    dob: '',
    approxAge: '',
    bloodGroup: 'Unknown',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdAppointment, setCreatedAppointment] = useState(null);

  // Check if a patient was pre-selected from patient profile
  useEffect(() => {
    const preselectedId = location.state?.preselectedPatientId;
    if (preselectedId && token) {
      fetchPatientById(token, preselectedId).then((res) => {
        if (res.success && res.data?.patient) {
          setSelectedPatient(res.data.patient);
        }
      }).catch(() => {});
    }
  }, [location.state, token]);

  // Load departments and doctors
  useEffect(() => {
    Promise.all([fetchDepartments(), fetchDoctors()]).then(([deptsRes, docsRes]) => {
      if (deptsRes.success) setDepartments(deptsRes.data || []);
      if (docsRes.success) setDoctors(docsRes.data || []);
    }).catch(() => {});
  }, []);

  // Filtered doctors by department
  const filteredDoctors = doctors.filter((doc) => {
    if (!selectedDeptId) return true;
    const docDeptId = typeof doc.department === 'object' ? doc.department?._id : doc.department;
    return docDeptId === selectedDeptId;
  });

  // Debounced patient search
  useEffect(() => {
    if (!patientSearch || patientSearch.trim().length < 2 || isInlineNewPatient) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await quickSearchPatients(token, patientSearch.trim());
        if (res.success) setSearchResults(res.data || []);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [patientSearch, token, isInlineNewPatient]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      setErrorMessage('Please select an attending doctor.');
      return;
    }
    if (!isInlineNewPatient && !selectedPatient) {
      setErrorMessage('Please search and select an existing patient or switch to register inline.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Find doctor's department ID if not manually selected
      const chosenDoc = doctors.find((d) => d._id === selectedDoctorId);
      const chosenDeptId = selectedDeptId || (typeof chosenDoc?.department === 'object' ? chosenDoc?.department?._id : chosenDoc?.department);

      const payload = {
        doctorId: selectedDoctorId,
        departmentId: chosenDeptId,
        reasonForVisit: reasonForVisit.trim(),
      };

      if (isInlineNewPatient) {
        payload.newPatientData = {
          ...newPatient,
          approxAge: newPatient.approxAge ? Number(newPatient.approxAge) : undefined,
        };
      } else {
        payload.patientId = selectedPatient._id;
      }

      const res = await createWalkInAppointment(token, payload);
      if (res.success && res.data) {
        setCreatedAppointment(res.data);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to issue walk-in token.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'OPD Queue', path: '/portal/opd/queue' },
        { label: 'Walk-in Registration' },
      ]}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-black text-slate-900 tracking-tight">
              OPD Walk-in Visit & Token Generation
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Issue an immediate daily consultation token for today's OPD clinic.
            </p>
          </div>
          <Link
            to="/portal/opd/queue"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Queue</span>
          </Link>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          {/* Section 1: Patient Selection */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
              <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-heading">
                1. Patient Information
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsInlineNewPatient(!isInlineNewPatient);
                  setSelectedPatient(null);
                  setPatientSearch('');
                }}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
              >
                {isInlineNewPatient ? '← Search Existing Patient' : '+ Register Inline as New Walk-in'}
              </button>
            </div>

            {!isInlineNewPatient ? (
              <div className="space-y-3">
                {selectedPatient ? (
                  <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900">{selectedPatient.name}</strong>
                        <span className="font-mono text-xs font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded">
                          {selectedPatient.uhid}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Phone: {selectedPatient.phone} · {selectedPatient.gender} · {selectedPatient.approxAge ? `${selectedPatient.approxAge} yrs` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(null)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Search Patient (UHID, Name, or Phone) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        placeholder="Type at least 2 characters to search..."
                        className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    {/* Results Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="mt-2 bg-white rounded-xl shadow-lg border border-slate-200 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                        {searchResults.map((p) => (
                          <div
                            key={p._id}
                            onClick={() => {
                              setSelectedPatient(p);
                              setSearchResults([]);
                              setPatientSearch('');
                            }}
                            className="p-3 hover:bg-teal-50 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div>
                              <strong className="text-xs font-bold text-slate-900 block">{p.name}</strong>
                              <span className="text-[11px] text-slate-500">{p.phone} · {p.gender}</span>
                            </div>
                            <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                              {p.uhid}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Inline Registration Fields */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Patient name"
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98200 12345"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Approx. Age</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 35"
                    value={newPatient.approxAge}
                    onChange={(e) => setNewPatient({ ...newPatient, approxAge: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={newPatient.bloodGroup}
                    onChange={(e) => setNewPatient({ ...newPatient, bloodGroup: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Department and Doctor */}
          <div>
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider font-heading border-b border-slate-100 pb-2 mb-4">
              2. OPD Department & Attending Doctor
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => {
                    setSelectedDeptId(e.target.value);
                    setSelectedDoctorId('');
                  }}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                >
                  <option value="">All 4 Departments</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Doctor <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                >
                  <option value="">Choose an Attending Doctor</option>
                  {filteredDoctors.map((doc) => (
                    <option key={doc._id} value={doc._id}>
                      {doc.name} · {doc.specialization} ({doc.roomNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Visit / Symptoms</label>
                <input
                  type="text"
                  placeholder="e.g. Mild fever, knee pain checkup, regular follow-up..."
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Submit Toolbar */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/portal/opd/queue')}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Issuing Token...' : 'Issue Daily Token & Slip'}</span>
            </button>
          </div>
        </form>

        {/* Printable Slip Preview once created */}
        {createdAppointment && (
          <PrintSlip
            appointment={createdAppointment}
            onClose={() => {
              setCreatedAppointment(null);
              navigate('/portal/opd/queue');
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default WalkInRegistration;
