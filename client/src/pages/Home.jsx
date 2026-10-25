import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HeartPulse,
  Award,
  Users,
  Building2,
  PhoneCall,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  ChevronRight,
  Stethoscope,
  Activity,
  ArrowRight,
  BedDouble,
  CheckCircle,
  BookOpen,
  ExternalLink,
  Sparkles,
  Baby,
  Bone,
} from 'lucide-react';
import SectionHeading from '../components/SectionHeading.jsx';
import DepartmentCard from '../components/DepartmentCard.jsx';
import DoctorCard from '../components/DoctorCard.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import { fetchDepartments, fetchDoctors, fetchServices } from '../api/api.js';

const Home = ({ onOpenBookModal, onSelectDoctorForModal }) => {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        const [deptRes, docRes, servRes] = await Promise.all([
          fetchDepartments(),
          fetchDoctors(),
          fetchServices(),
        ]);
        setDepartments(deptRes.data || []);
        setDoctors(docRes.data || []);
        setServices(servRes.data || []);
      } catch (err) {
        console.error('Error fetching home page data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative hero-gradient pt-12 pb-20 px-4 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text */}
          <div className="lg:col-span-7 space-y-6">

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight font-heading leading-tight">
              Compassionate Care, <br />
              <span className="bg-gradient-to-r from-sky-600 to-teal-600 bg-clip-text text-transparent">
                Advanced Medicine.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl">
              Suman  Hospital delivers world-class medical treatments, 24/7 trauma emergency care,  surgeries, and expert clinical consultations.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button
                onClick={onOpenBookModal}
                className="px-6 py-3.5 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer text-sm"
              >
                <Calendar className="w-5 h-5" />
                <span>Book Appointment Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <Link
                to="/doctors"
                className="px-6 py-3.5 bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Stethoscope className="w-5 h-5 text-sky-600" />
                <span>Find a Doctor</span>
              </Link>
            </div>

            {/* Quick Stats Strip */}

          </div>

          {/* Right Feature Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-900 text-white">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgIB3als2QoSY59h5GQ39tp7QI52KmhZIU3a12-Q1zGg&s"
                alt="Hospital Facility"
                className="w-full h-72 object-cover"
              />
              <div className="p-6 space-y-4 bg-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Emergency OPD Desk</span>
                  <span className="flex items-center gap-1.5 text-xs text-rose-400 font-bold">

                  </span>
                </div>
                <h3 className="text-xl font-bold font-heading">Need Urgent Medical Attention?</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Our Level-I Emergency Department and Mobile ICU Ambulances respond immediately for cardiac arrests, severe trauma, and stroke emergencies.
                </p>
                <a
                  href="tel:+9107212555555"
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
                >
                  <PhoneCall className="w-4 h-4 animate-bounce" />
                  <span>Call Emergency: +91 (0721) 2555555</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Access Action Cards */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 -mt-10 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg flex items-start gap-4 hover:border-sky-500 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">Instant OPD Booking</h3>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Schedule a consultation slot with top senior specialists online.
              </p>
              <button
                onClick={onOpenBookModal}
                className="text-xs font-bold text-sky-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Book Slot</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg flex items-start gap-4 hover:border-teal-500 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">Find Doctor by Specialty</h3>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Browse our directory of 15+ experienced medical doctors.
              </p>
              <Link
                to="/doctors"
                className="text-xs font-bold text-teal-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Browse Directory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg flex items-start gap-4 hover:border-amber-500 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">Hospital & OPD Timings</h3>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                OPD: Mon - Sat (8 AM - 8 PM) | Emergency: 24 Hours Open.
              </p>
              <Link
                to="/contact"
                className="text-xs font-bold text-amber-700 hover:underline inline-flex items-center gap-1"
              >
                <span>View Locations</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Departments */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        <SectionHeading
          badge="Center of Excellence"
          title="Specialized Clinical Departments"
          subtitle="Explore our state-of-the-art departments staffed by leading consultants, surgeons, and nurses."
        />

        {loading ? (
          <SkeletonLoader type="department" count={6} />
        ) : (
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

      {/* Featured Doctors Directory Preview */}
      <section className="bg-slate-900 text-white py-16 px-4 lg:px-8 rounded-3xl max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
          <div>
            <span className="inline-block px-3 py-1 bg-sky-950 text-sky-300 font-bold text-xs rounded-full border border-sky-800 mb-2">
              MEET OUR EXPERTS
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold font-heading text-white">
              Featured Doctors & Specialists
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-2 max-w-xl">
              Distinguished medical faculty with decades of clinical experience across cardiology, orthopedics, neurology, and pediatrics.
            </p>
          </div>
          <Link
            to="/doctors"
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shrink-0"
          >
            <span>View All Doctors</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <SkeletonLoader type="doctor" count={3} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-slate-900">
            {doctors.slice(0, 3).map((doctor) => (
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
        )}
      </section>

      {/* Expert Opinions & Health Articles Preview Section (Part 2) */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 font-bold text-xs rounded-full border border-teal-200 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Evidence-Based Health Library</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              Expert Opinions & Latest Health Articles
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
              Curated clinical insights, peer-reviewed publications, and video briefings across our four core departments.
            </p>
          </div>
          <Link
            to="/health-insights"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#b91c1c] hover:underline shrink-0"
          >
            <span>Explore All Articles & Videos</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: General Checkup */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-teal-500 transition-colors shadow-2xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5" />
                  General Checkup
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-heading leading-snug">
                A Checkup for the Checkup: Do You Really Need a Yearly Physical?
              </h3>
              <p className="text-xs text-slate-600 line-clamp-3">
                Evidence-based guidelines on shifting from routine indiscriminate panels to personalized cardiovascular risk screening.
              </p>
              <p className="text-[11px] text-slate-400 font-medium">Source: Harvard Health Publishing</p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">Video + Article</span>
              <Link to="/health-insights" className="text-xs font-bold text-[#b91c1c] hover:underline flex items-center gap-1">
                <span>View</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Pediatrics */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-teal-500 transition-colors shadow-2xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <Baby className="w-3.5 h-3.5" />
                  Pediatrics
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-heading leading-snug">
                All About the AAP Recommended Immunization Schedule
              </h3>
              <p className="text-xs text-slate-600 line-clamp-3">
                The American Academy of Pediatrics protocol for protecting infants and children against 18 vaccine-preventable diseases.
              </p>
              <p className="text-[11px] text-slate-400 font-medium">Source: AAP HealthyChildren.org</p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">Video + Article</span>
              <Link to="/health-insights" className="text-xs font-bold text-[#b91c1c] hover:underline flex items-center gap-1">
                <span>View</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: Orthopedics */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-teal-500 transition-colors shadow-2xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                  <Bone className="w-3.5 h-3.5" />
                  Orthopedics
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-heading leading-snug">
                -Assisted Joint Replacement: Precision in Knee Surgery
              </h3>
              <p className="text-xs text-slate-600 line-clamp-3">
                Sub-millimeter precision in joint replacement, bone-sparing s, and accelerated post-op recovery protocols.
              </p>
              <p className="text-[11px] text-slate-400 font-medium">Source: AAOS OrthoInfo / Mayo Clinic</p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">Video + Article</span>
              <Link to="/health-insights" className="text-xs font-bold text-[#b91c1c] hover:underline flex items-center gap-1">
                <span>View</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 4: Gynaecology & Panchakarma */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-teal-500 transition-colors shadow-2xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Gynae & Panchakarma
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-heading leading-snug">
                Clinical Efficacy of Panchakarma in PCOS Management
              </h3>
              <p className="text-xs text-slate-600 line-clamp-3">
                Peer-reviewed research and AIIA clinical protocols on Ayurvedic bio-cleansing for hormonal and metabolic regulation in women.
              </p>
              <p className="text-[11px] text-slate-400 font-medium">Source: PubMed / AIIA Ayush</p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">Video + Article</span>
              <Link to="/health-insights" className="text-xs font-bold text-[#b91c1c] hover:underline flex items-center gap-1">
                <span>View</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Key Services Preview */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        <SectionHeading
          badge="Patient Care Services"
          title="World-Class Healthcare Solutions"
          subtitle="From 24/7 cardiac cath labs to  surgeries, we provide end-to-end medical care."
        />

        {loading ? (
          <SkeletonLoader count={4} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.slice(0, 4).map((service) => (
              <div
                key={service._id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">
                    {service.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {service.description}
                </p>
                {service.features && service.features.length > 0 && (
                  <ul className="space-y-1 pt-1">
                    {service.features.slice(0, 2).map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                        <CheckCircle className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-center pt-8">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <span>Explore All Medical Services</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Emergency Strip Callout */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-teal-900 text-white rounded-3xl p-8 lg:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <span className="inline-block px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full">
              24/7 TRAUMA & ICU RESPONSE
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold font-heading">
              Have a Medical Emergency?
            </h2>
            <p className="text-xs md:text-sm text-sky-100 max-w-xl">
              Our mobile ICU ambulances with cardiac life support are dispatched within minutes across the city.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <a
              href="tel:+9107212555555"
              className="px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-lg transition-colors flex items-center gap-2 text-xs"
            >
              <PhoneCall className="w-4 h-4 animate-bounce" />
              <span>Call +91 (0721) 2555555</span>
            </a>
            <Link
              to="/contact"
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-colors text-xs"
            >
              Hospital Directions
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
