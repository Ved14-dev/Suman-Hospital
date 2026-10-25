import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, AlertCircle, ArrowLeft, CheckCircle2, Search } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import { createPatient } from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const PatientRegistration = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    gender: 'Male',
    dob: '',
    approxAge: '',
    phone: '',
    alternatePhone: '',
    email: '',
    address: '',
    bloodGroup: 'Unknown',
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
    allergies: '',
    chronicConditions: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [overrideDuplicate, setOverrideDuplicate] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage('');
    if (duplicateWarning) setDuplicateWarning(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    // Prepare payload
    const payload = {
      name: formData.name.trim(),
      gender: formData.gender,
      dob: formData.dob || undefined,
      approxAge: formData.approxAge ? Number(formData.approxAge) : undefined,
      phone: formData.phone.trim(),
      alternatePhone: formData.alternatePhone ? formData.alternatePhone.trim() : undefined,
      email: formData.email ? formData.email.trim() : undefined,
      address: formData.address ? formData.address.trim() : undefined,
      bloodGroup: formData.bloodGroup,
      emergencyContact: {
        name: formData.emergencyName?.trim(),
        relation: formData.emergencyRelation?.trim(),
        phone: formData.emergencyPhone?.trim(),
      },
      allergies: formData.allergies ? formData.allergies.split(',').map((s) => s.trim()).filter(Boolean) : [],
      chronicConditions: formData.chronicConditions ? formData.chronicConditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
      overrideDuplicate,
      overrideReason: overrideDuplicate ? overrideReason : undefined,
    };

    try {
      const res = await createPatient(token, payload);
      if (res.success && res.data) {
        navigate(`/portal/patients/${res.data._id}`, {
          state: { message: `Patient registered successfully with UHID: ${res.data.uhid}` },
        });
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.duplicateWarning && data.existingPatient) {
        setDuplicateWarning(data.existingPatient);
        setErrorMessage(data.message || 'Duplicate patient detected.');
      } else {
        setErrorMessage(data?.message || 'Failed to register patient. Please verify the input.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Patients', path: '/portal/patients' },
        { label: 'New Registration' },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-black text-slate-900 tracking-tight">
              Patient Registration
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Register a new hospital patient. Generates an atomic unique UHID format (SMH-XXXXXX).
            </p>
          </div>
          <Link
            to="/portal/patients"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Registry</span>
          </Link>
        </div>

        {/* Duplicate Warning Alert */}
        {duplicateWarning && (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Potential Duplicate Patient Detected</h4>
                <p className="text-xs text-amber-800 mt-1">
                  A patient with matching name and phone is already registered in the system:
                </p>
                <div className="mt-2 text-xs bg-white/80 p-3 rounded-xl border border-amber-200/60 font-mono space-y-1">
                  <div>UHID: <strong>{duplicateWarning.uhid}</strong></div>
                  <div>Name: <strong>{duplicateWarning.name}</strong></div>
                  <div>Phone: <strong>{duplicateWarning.phone}</strong></div>
                  {duplicateWarning.dob && <div>DOB: <strong>{duplicateWarning.dob}</strong></div>}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Link
                    to={`/portal/patients/${duplicateWarning.id}`}
                    className="text-xs font-bold text-teal-700 underline hover:text-teal-900"
                  >
                    View Existing Patient Record ({duplicateWarning.uhid})
                  </Link>
                </div>
              </div>
            </div>

            {/* Override Checkbox */}
            <div className="pt-3 border-t border-amber-200/80 space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overrideDuplicate}
                  onChange={(e) => setOverrideDuplicate(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Confirm this is a distinct person and proceed with registration</span>
              </label>
              {overrideDuplicate && (
                <input
                  type="text"
                  required
                  placeholder="Reason for duplicate override (e.g. same name in household, new contact)"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              )}
            </div>
          </div>
        )}

        {errorMessage && !duplicateWarning && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          {/* Section 1: Demographics */}
          <div>
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              1. Patient Demographics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Ramesh V. Patil"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Approx. Age (Years)</label>
                <input
                  type="number"
                  name="approxAge"
                  min="0"
                  max="130"
                  placeholder="e.g. 42"
                  value={formData.approxAge}
                  onChange={handleChange}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
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
          </div>

          {/* Section 2: Contact Information */}
          <div>
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              2. Contact & Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="e.g. +91 98200 12345"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alternate Phone</label>
                <input
                  type="tel"
                  name="alternatePhone"
                  placeholder="e.g. +91 98200 67890"
                  value={formData.alternatePhone}
                  onChange={handleChange}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="e.g. patient@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  name="address"
                  placeholder="Street, locality, town, district"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Emergency Contact */}
          <div>
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              3. Emergency Contact Person
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  name="emergencyName"
                  placeholder="e.g. Sunita Patil"
                  value={formData.emergencyName}
                  onChange={handleChange}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                <input
                  type="text"
                  name="emergencyRelation"
                  placeholder="e.g. Spouse / Brother / Father"
                  value={formData.emergencyRelation}
                  onChange={handleChange}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  name="emergencyPhone"
                  placeholder="e.g. +91 98200 99999"
                  value={formData.emergencyPhone}
                  onChange={handleChange}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Clinical Background */}
          <div>
            <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              4. Clinical Background (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Known Allergies <span className="font-normal text-slate-400">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  name="allergies"
                  placeholder="e.g. Penicillin, Sulfa drugs, Peanuts"
                  value={formData.allergies}
                  onChange={handleChange}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chronic Medical Conditions <span className="font-normal text-slate-400">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  name="chronicConditions"
                  placeholder="e.g. Type-2 Diabetes, Hypertension, Asthma"
                  value={formData.chronicConditions}
                  onChange={handleChange}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Toolbar */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/portal/patients')}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (duplicateWarning && !overrideDuplicate)}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register Patient & Generate UHID</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default PatientRegistration;
