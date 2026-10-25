import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SectionHeading from '../components/SectionHeading.jsx';
import DepartmentCard from '../components/DepartmentCard.jsx';
import DoctorCard from '../components/DoctorCard.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import { fetchDepartments, fetchDepartmentBySlug } from '../api/api.js';
import { Stethoscope, CheckCircle2, Phone, UserCheck } from 'lucide-react';

const Departments = ({ onOpenBookModal, onSelectDoctorForModal }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSlug = searchParams.get('slug') || 'all';

  const [departments, setDepartments] = useState([]);
  const [selectedDeptData, setSelectedDeptData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deptLoading, setDeptLoading] = useState(false);

  // Fetch all departments
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        setLoading(true);
        const res = await fetchDepartments();
        setDepartments(res.data || []);
      } catch (err) {
        console.error('Error fetching departments:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDepartments();
  }, []);

  // Fetch selected department details if slug is selected
  useEffect(() => {
    if (activeSlug && activeSlug !== 'all') {
      const loadDeptDetail = async () => {
        try {
          setDeptLoading(true);
          const res = await fetchDepartmentBySlug(activeSlug);
          setSelectedDeptData(res.data || null);
        } catch (err) {
          console.error('Error fetching department details:', err);
        } finally {
          setDeptLoading(false);
        }
      };

      loadDeptDetail();
    } else {
      setSelectedDeptData(null);
    }
  }, [activeSlug]);

  return (
    <div className="space-y-12 pb-16">
      {/* Banner */}
      <section className="bg-slate-900 text-white py-14 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <span className="inline-block px-3.5 py-1 bg-teal-950 text-teal-300 font-bold text-xs rounded-full border border-teal-800">
            CENTERS OF CLINICAL EXCELLENCE
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading tracking-tight">
            Specialty Medical Departments
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto">
            Explore our 6 super-specialty wings offering round-the-clock emergency, outpatient, and surgical care.
          </p>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-3 no-scrollbar scroll-smooth border-b border-slate-200">
          <button
            onClick={() => setSearchParams({})}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeSlug === 'all'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Departments ({departments.length})
          </button>
          {departments.map((dept) => (
            <button
              key={dept.slug}
              onClick={() => setSearchParams({ slug: dept.slug })}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeSlug === dept.slug
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {dept.name}
            </button>
          ))}
        </div>
      </section>

      {/* Main Content Area */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        {loading ? (
          <SkeletonLoader type="department" count={6} />
        ) : activeSlug !== 'all' && selectedDeptData ? (
          /* Single Department Detailed View */
          <div className="space-y-10 animate-fadeIn">
            {/* Department Hero Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 lg:p-8 shadow-lg grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <span className="inline-block px-3 py-1 bg-sky-100 text-sky-800 text-xs font-bold rounded-full">
                  SPECIALTY OVERVIEW
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 font-heading">
                  {selectedDeptData.name}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {selectedDeptData.description}
                </p>

                <div className="pt-2 flex flex-wrap gap-4 text-xs font-medium text-slate-700">
                  <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block font-normal">Head of Department:</span>
                    <span className="font-bold text-slate-900">{selectedDeptData.headOfDept}</span>
                  </div>
                  <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block font-normal">Direct Helpline:</span>
                    <span className="font-bold text-sky-700">{selectedDeptData.phone}</span>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    onClick={() => onOpenBookModal()}
                    className="px-6 py-3 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Book Consultation in {selectedDeptData.name}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5">
                <img
                  src={selectedDeptData.image}
                  alt={`${selectedDeptData.name} clinical facilities and medical diagnostics at Suman Hospital`}
                  className="rounded-2xl shadow-md object-cover w-full h-72 border-2 border-slate-100"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Key Procedures Offered */}
            {selectedDeptData.servicesOffered && selectedDeptData.servicesOffered.length > 0 && (
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                <h3 className="text-xl font-bold text-slate-900 font-heading">Key Procedures & Clinical Treatments</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedDeptData.servicesOffered.map((serv, idx) => (
                    <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-start gap-2.5 text-xs text-slate-800 font-semibold shadow-2xs">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                      <span>{serv}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Faculty Doctors in this Department */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900 font-heading">
                  Department Faculty & Specialists ({selectedDeptData.doctors?.length || 0})
                </h3>
              </div>

              {deptLoading ? (
                <SkeletonLoader type="doctor" count={3} />
              ) : selectedDeptData.doctors && selectedDeptData.doctors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedDeptData.doctors.map((doc) => (
                    <DoctorCard
                      key={doc._id}
                      doctor={{ ...doc, department: { name: selectedDeptData.name } }}
                      onBookClick={(d) => {
                        onSelectDoctorForModal(d);
                        onOpenBookModal();
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
                  No doctors listed for this department at the moment.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* All Departments Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {departments.map((dept) => (
              <DepartmentCard
                key={dept._id}
                department={dept}
                onBookAppointment={() => onOpenBookModal()}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Departments;
