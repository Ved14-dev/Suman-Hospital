import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  HeartPulse,
  Bone,
  Baby,
  Brain,
  Sparkles,
  Ambulance,
  Scan,
  BedDouble,
  Pill,
  CheckCircle2,
  Calendar,
  PhoneCall,
  ArrowRight,
} from 'lucide-react';
import SectionHeading from '../components/SectionHeading.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import { fetchServices } from '../api/api.js';

const iconMap = {
  Ambulance,
  HeartPulse,
  Bone,
  Baby,
  Brain,
  Sparkles,
  Activity,
  Scan,
  BedDouble,
  Pill,
};

const Services = ({ onOpenBookModal }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoading(true);
        const res = await fetchServices();
        setServices(res.data || []);
      } catch (err) {
        console.error('Error fetching medical services:', err);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  return (
    <div className="space-y-12 pb-16">
      {/* Banner */}
      <section className="bg-slate-900 text-white py-14 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <span className="inline-block px-3.5 py-1 bg-teal-950 text-teal-300 font-bold text-xs rounded-full border border-teal-800">
            ADVANCED CLINICAL CARE
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading tracking-tight">
            Medical Services & Facilities
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto">
            Explore our comprehensive quaternary healthcare services operating round-the-clock at Suman.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        {loading ? (
          <SkeletonLoader count={6} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service) => {
              const IconComp = iconMap[service.icon] || Activity;
              return (
                <div
                  key={service._id}
                  className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                        <IconComp className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 font-heading">
                          {service.name}
                        </h3>
                        {service.department && (
                          <span className="text-[11px] font-semibold text-teal-600">
                            {typeof service.department === 'object' ? service.department.name : 'Specialty Care'}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {service.description}
                    </p>

                    {service.features && service.features.length > 0 && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 pt-3">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Key Clinical Features:
                        </span>
                        <ul className="space-y-1.5">
                          {service.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-slate-800 font-medium">
                              <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <button
                      onClick={onOpenBookModal}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Book Consultation</span>
                    </button>

                    <a
                      href="tel:+918446094203"
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
                      <span>Inquire Service</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Services;
