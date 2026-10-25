import React from 'react';
import {
  Building2,
  Target,
  Eye,
  Award,
  ShieldCheck,
  Heart,
  Clock,
  CheckCircle2,
  Users,
  Microscope,
} from 'lucide-react';
import SectionHeading from '../components/SectionHeading.jsx';

const About = () => {
  return (
    <div className="space-y-16 pb-16">
      {/* Banner */}
      <section className="bg-slate-900 text-white py-16 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <span className="inline-block px-3.5 py-1 bg-sky-950 text-sky-300 font-bold text-xs rounded-full border border-sky-800">
            ESTABLISHED IN 1998
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold font-heading tracking-tight">
            About Suman  Hospital
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Delivering ethical, patient-centric, and evidence-based healthcare for over 25 years in Amravati.
          </p>
        </div>
      </section>

      {/* History & Overview */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">Our Heritage</span>
            <h2 className="text-3xl font-extrabold text-slate-900 font-heading leading-tight">
              A Legacy of Healing & Surgical Innovations
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              It stands as a premier 100-bed quaternary care medical institution housing 4 super-specialty departments, advanced Cath Labs,  joint replacement suites, and Level-III NICU facilities.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Our clinical care model combines international diagnostic standard protocols with compassionate bedside nursing. Over 150,000 OPD patients and 25,000 surgical procedures are handled annually by our dedicated medical team.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
                <div className="text-2xl font-extrabold text-sky-700 font-heading">25+</div>
                <div className="text-xs font-semibold text-slate-600">Years of Clinical Excellence</div>
              </div>
              <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                <div className="text-2xl font-extrabold text-teal-700 font-heading">99.2%</div>
                <div className="text-xs font-semibold text-slate-600">Patient Satisfaction Score</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <img
              src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80"
              alt="Suman Infrastructure"
              className="rounded-3xl shadow-xl border-4 border-white object-cover w-full h-96"
            />
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="bg-slate-50 py-16 px-4 lg:px-8 border-y border-slate-200">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Mission */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 font-heading">Our Mission</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              To provide accessible, ethical, high-quality healthcare using modern medical technology, while maintaining transparent pricing, patient dignity, and compassionate care for every section of society.
            </p>
          </div>

          {/* Vision */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 font-heading">Our Vision</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              To be recognized as the most trusted healthcare institution in India for clinical outcomes, medical research,  surgical innovations, and patient safety standards.
            </p>
          </div>
        </div>
      </section>

      {/* Infrastructure & Facilities */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        <SectionHeading
          badge="Infrastructure"
          title="State-of-the-Art Facilities"
          subtitle="Built to international healthcare building codes with advanced emergency, diagnostic, and infection control systems."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Modular Operation Theaters',
              desc: '6 Ultra-clean laminar airflow operation theaters equipped with HEPA filters, HD laparoscopy, and  navigation arms.',
              icon: Building2,
            },
            {
              title: '3 Tesla MRI & 128-Slice CT',
              desc: 'Silent 3T MRI scanner and ultra-fast low-radiation multi-detector CT for high-precision neuro and cardiac imaging.',
              icon: Microscope,
            },
            {
              title: 'Advanced ICU & CCU Suites',
              desc: '50 Critical care beds with 1:1 nurse monitoring, bedside dialysis, high-frequency ventilators, and continuous central telemetry.',
              icon: Heart,
            },
          ].map((item, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <item.icon className="w-8 h-8 text-sky-600" />
              <h4 className="text-lg font-bold text-slate-900 font-heading">{item.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timings & Visiting Hours */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-8 lg:p-12 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Hospital Operating Hours</span>
            <h3 className="text-2xl lg:text-3xl font-bold font-heading">Working Hours & Visitor Guidelines</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300 pt-2">
              <div className="space-y-1">
                <span className="font-bold text-white block">Outpatient Department (OPD):</span>
                <span>Monday - Saturday: 08:00 AM - 08:00 PM</span>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-white block">Emergency & Ambulance:</span>
                <span className="text-rose-400 font-bold">24 Hours / 365 Days Open</span>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-white block">IPD Patient Visiting Hours:</span>
                <span>Morning: 10:00 AM - 12:00 PM | Evening: 05:00 PM - 07:00 PM</span>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-white block">Pharmacy & Diagnostics:</span>
                <span>24/7 Continuous Service</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-slate-800/80 p-6 rounded-2xl border border-slate-700 space-y-3 text-center">
            <Clock className="w-10 h-10 text-teal-400 mx-auto" />
            <h4 className="text-lg font-bold text-white font-heading">24/7 Information Desk</h4>
            <p className="text-xs text-slate-300">Call our main desk for visitor passes or room inquiries.</p>
            <a
              href="tel:+9107212555555"
              className="inline-block w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-extrabold text-xs rounded-xl transition-colors"
            >
              +91 (0721) 2555555
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
