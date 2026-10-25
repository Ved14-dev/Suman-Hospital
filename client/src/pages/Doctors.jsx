import React, { useState, useEffect } from 'react';
import { Search, Filter, Stethoscope, UserX } from 'lucide-react';
import SectionHeading from '../components/SectionHeading.jsx';
import DoctorCard from '../components/DoctorCard.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import { fetchDoctors, fetchDepartments } from '../api/api.js';

const Doctors = ({ onOpenBookModal, onSelectDoctorForModal }) => {
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDeptSlug, setSelectedDeptSlug] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDeptList = async () => {
      try {
        const deptRes = await fetchDepartments();
        setDepartments(deptRes.data || []);
      } catch (err) {
        console.error('Error loading department list:', err);
      }
    };
    loadDeptList();
  }, []);

  useEffect(() => {
    const loadDoctorList = async () => {
      try {
        setLoading(true);
        const params = {};
        if (selectedDeptSlug !== 'all') {
          params.department = selectedDeptSlug;
        }
        if (searchTerm.trim() !== '') {
          params.search = searchTerm.trim();
        }
        const res = await fetchDoctors(params);
        setDoctors(res.data || []);
      } catch (err) {
        console.error('Error loading doctor directory:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      loadDoctorList();
    }, 250);

    return () => clearTimeout(timer);
  }, [selectedDeptSlug, searchTerm]);

  return (
    <div className="space-y-12 pb-16">
      {/* Banner */}
      <section className="bg-slate-900 text-white py-14 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <span className="inline-block px-3.5 py-1 bg-sky-950 text-sky-300 font-bold text-xs rounded-full border border-sky-800">
            MEDICAL FACULTY & CONSULTANTS
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading tracking-tight">
            Find a Doctor & Book OPD
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto">
            Browse senior consultants across 6 super-specialties. Check consultation timings and book slots.
          </p>
        </div>
      </section>

      {/* Search & Filter Toolbar */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 space-y-4">
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by name or specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          {/* Department Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scroll-smooth no-scrollbar">
            <button
              onClick={() => setSelectedDeptSlug('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedDeptSlug === 'all'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Specialists
            </button>
            {departments.map((dept) => (
              <button
                key={dept.slug}
                onClick={() => setSelectedDeptSlug(dept.slug)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedDeptSlug === dept.slug
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {dept.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors Grid */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        {loading ? (
          <SkeletonLoader type="doctor" count={6} />
        ) : doctors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => (
              <DoctorCard
                key={doctor._id}
                doctor={doctor}
                onBookClick={(doc) => {
                  onSelectDoctorForModal(doc);
                  onOpenBookModal();
                }}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <UserX className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-heading">No Doctors Found</h3>
            <p className="text-xs text-slate-500">
              We couldn't find any specialist matching your search query. Try clearing the filter or search term.
            </p>
            <button
              onClick={() => {
                setSelectedDeptSlug('all');
                setSearchTerm('');
              }}
              className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold hover:bg-sky-700 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Doctors;
