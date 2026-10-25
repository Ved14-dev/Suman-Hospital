import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  Building,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
} from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import { submitEnquiry } from '../api/api';

const Contact = ({ onShowToast }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const res = await submitEnquiry(formData);
      if (res.success) {
        onShowToast(res.message || 'Your enquiry has been saved to database!', 'success');
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
        });
      } else {
        setErrorMessage(res.message || 'Failed to submit enquiry');
      }
    } catch (err) {
      console.error('Enquiry submission error:', err);
      const apiErr = err.response?.data?.errors ? err.response.data.errors.join(', ') : err.response?.data?.message || 'Error connecting to backend server';
      setErrorMessage(apiErr);
      onShowToast(apiErr, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Banner */}
      <section className="bg-slate-900 text-white py-14 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <span className="inline-block px-3.5 py-1 bg-sky-950 text-sky-300 font-bold text-xs rounded-full border border-sky-800">
            GET IN TOUCH
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading tracking-tight">
            Contact & Location Details
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto">
            Have questions regarding OPD appointments, medical health packages, or hospital admissions? Send us a message.
          </p>
        </div>
      </section>

      {/* Main Grid */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Contact Details & Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xl font-bold text-slate-900 font-heading">
                Hospital Contact Information
              </h3>

              <div className="space-y-5 text-xs text-slate-700">
                {/* Address */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">Hospital Address</span>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">
                      Suman  Hospital, Suman Care Marg, Near Hanuman Mandir, Amravati - 400064, Maharashtra, India.
                    </p>
                  </div>
                </div>

                {/* Emergency Phone */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">24/7 Emergency Helpline</span>
                    <p className="text-rose-600 font-bold mt-0.5">+91 (0721) 2555555</p>
                    <p className="text-slate-500 text-[11px]">OPD & Appointments: +91 84460 94203</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">Email Address</span>
                    <p className="text-slate-600 mt-0.5">care@suman-hospital.org</p>
                    <p className="text-slate-500 text-[11px]">enquiries@suman-hospital.org</p>
                  </div>
                </div>

                {/* OPD Working Hours */}
                <div className="flex items-start gap-3.5 pt-2 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">Working Hours</span>
                    <p className="text-slate-600 mt-0.5">OPD Consultations: Mon - Sat (8 AM - 8 PM)</p>
                    <p className="text-emerald-700 font-bold text-[11px]">Casualty / Emergency: Open 24/7</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Contact Form */}
          <div className="lg:col-span-7">
            <div className="bg-white p-6 lg:p-8 rounded-3xl border border-slate-200 shadow-md space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 font-heading">
                  Send Us an Enquiry
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Fill out the form below. Enquiries are written directly to our MongoDB backend database.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Your Name *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g. Rahul Verma"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="rahul@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="+91 98200 54321"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Subject *</label>
                    <input
                      type="text"
                      name="subject"
                      required
                      placeholder="e.g. Master Health Checkup Query"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Message Content *</label>
                  <textarea
                    name="message"
                    rows={4}
                    required
                    placeholder="Write your query details here..."
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-medium resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Submitting Enquiry...' : 'Submit Enquiry to DB'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Embedded Google Maps Section */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm overflow-hidden space-y-3">
          <div className="px-4 pt-2">
            <h3 className="text-lg font-bold text-slate-900 font-heading">Hospital Location & Directions</h3>
            <p className="text-xs text-slate-500">Suman Care Marg, Near Hanuman Mandir, Amravati</p>
          </div>
          <div className="w-full h-80 rounded-2xl overflow-hidden border border-slate-200">
            <iframe
              title="Suman Hospital Map Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3768.187315579979!2d72.8465!3d19.186!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7b71158a18357%3A0xbfaea4931a742880!2sAmravati%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
