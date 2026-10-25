import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Toast from './components/Toast.jsx';

import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Departments from './pages/Departments.jsx';
import Doctors from './pages/Doctors.jsx';
import Services from './pages/Services.jsx';
import Contact from './pages/Contact.jsx';
import HealthInsights from './pages/HealthInsights.jsx';
import Auth from './pages/Auth.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import {
  PatientDashboard,
  DoctorDashboard,
  AdminDashboard,
  StaffDashboard,
} from './pages/Dashboard.jsx';
import Patients from './pages/Patients.jsx';
import PatientRegistration from './pages/PatientRegistration.jsx';
import PatientProfile from './pages/PatientProfile.jsx';
import LiveQueue from './pages/LiveQueue.jsx';
import WalkInRegistration from './pages/WalkInRegistration.jsx';
import Appointments from './pages/Appointments.jsx';
import NoShowReport from './pages/NoShowReport.jsx';
import EMR from './pages/EMR.jsx';
import Pharmacy from './pages/Pharmacy.jsx';
import IPD from './pages/IPD.jsx';
import BedBoard from './pages/BedBoard.jsx';
import BedRequestsQueue from './pages/BedRequestsQueue.jsx';
import AdmissionsPage from './pages/AdmissionsPage.jsx';
import NursePatientsPage from './pages/NursePatientsPage.jsx';
import DoctorInpatientsPage from './pages/DoctorInpatientsPage.jsx';
import PatientBookBedPage from './pages/PatientBookBedPage.jsx';
import WardsSettingsPage from './pages/WardsSettingsPage.jsx';
import PrintableDischargeSummary from './pages/PrintableDischargeSummary.jsx';
import { isModuleEnabled } from './config/modules.js';

import { useAuth } from './context/AuthContext.jsx';

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [toastInfo, setToastInfo] = useState({ message: '', type: 'success' });

  const isPortalRoute = pathname.startsWith('/portal') || pathname.includes('-dashboard');

  const handleOpenBookModal = () => {
    if (!user) {
      navigate('/login');
    } else if (user.role === 'patient') {
      navigate('/patient-dashboard');
    } else if (user.role === 'admin') {
      navigate('/admin-dashboard');
    } else if (user.role === 'doctor') {
      navigate('/doctor-dashboard');
    } else {
      navigate('/portal/dashboard');
    }
  };

  const showToast = (message, type = 'success') => {
    setToastInfo({ message, type });
  };

  const hideToast = () => {
    setToastInfo({ message: '', type: 'success' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-teal-500 selection:text-white">
      <ScrollToTop />

      {/* Render Public Navbar on Public Pages Only */}
      {!isPortalRoute && <Navbar onOpenBookModal={handleOpenBookModal} />}

      {/* Main Content Area */}
      <main className="flex-1">
        <Routes>
          {/* Public Website Routes */}
          <Route
            path="/"
            element={
              <Home
                onOpenBookModal={handleOpenBookModal}
                onSelectDoctorForModal={handleOpenBookModal}
              />
            }
          />
          <Route path="/about" element={<About />} />
          <Route
            path="/departments"
            element={
              <Departments
                onOpenBookModal={handleOpenBookModal}
                onSelectDoctorForModal={handleOpenBookModal}
              />
            }
          />
          <Route
            path="/doctors"
            element={
              <Doctors
                onOpenBookModal={handleOpenBookModal}
                onSelectDoctorForModal={handleOpenBookModal}
              />
            }
          />
          <Route path="/services" element={<Services onOpenBookModal={handleOpenBookModal} />} />
          <Route path="/contact" element={<Contact onShowToast={showToast} />} />
          <Route path="/health-insights" element={<HealthInsights />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth mode="register" />} />

          {/* Role-Specific Legacy Dashboards */}
          <Route element={<ProtectedRoute roles={['patient']} />}>
            <Route path="/patient-dashboard" element={<PatientDashboard />} />
            <Route path="/patient-dashboard/:section" element={<PatientDashboard />} />
          </Route>

          <Route element={<ProtectedRoute roles={['doctor']} />}>
            <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor-dashboard/:section" element={<DoctorDashboard />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin-dashboard/:section" element={<AdminDashboard />} />
          </Route>

          {/* Unified Hospital ERP Routes */}
          {/* General Staff Dashboard (Receptionist, Nurse, Pharmacist) */}
          <Route element={<ProtectedRoute roles={['admin', 'doctor', 'receptionist', 'nurse', 'pharmacist', 'patient']} />}>
            <Route path="/portal/dashboard" element={<StaffDashboard />} />
          </Route>

          {/* Patient Registry */}
          <Route element={<ProtectedRoute roles={['admin', 'receptionist', 'doctor', 'nurse', 'pharmacist']} />}>
            <Route path="/portal/patients" element={<Patients />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin', 'receptionist']} />}>
            <Route path="/portal/patients/new" element={<PatientRegistration />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin', 'receptionist', 'doctor', 'nurse', 'pharmacist', 'patient']} />}>
            <Route path="/portal/patients/:id" element={<PatientProfile />} />
          </Route>

          {/* OPD Queue & Walk-ins */}
          <Route element={<ProtectedRoute roles={['admin', 'receptionist', 'doctor', 'nurse']} />}>
            <Route path="/portal/opd/queue" element={<LiveQueue />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin', 'receptionist']} />}>
            <Route path="/portal/opd/walkin" element={<WalkInRegistration />} />
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/portal/opd/reports" element={<NoShowReport />} />
          </Route>

          {/* Appointments Master */}
          <Route element={<ProtectedRoute roles={['admin', 'receptionist', 'doctor', 'nurse', 'patient']} />}>
            <Route path="/portal/appointments" element={<Appointments />} />
            <Route path="/portal/opd/book" element={<PatientDashboard />} />
            <Route path="/portal/records" element={<PatientDashboard />} />
            <Route path="/portal/profile" element={<PatientDashboard />} />
          </Route>

          {/* Clinical EMR */}
          {isModuleEnabled('emr') && (
            <Route element={<ProtectedRoute roles={['admin', 'receptionist', 'doctor', 'nurse', 'pharmacist']} />}>
              <Route path="/portal/emr" element={<EMR />} />
            </Route>
          )}

          {isModuleEnabled('pharmacy') && (
            <Route element={<ProtectedRoute roles={['admin', 'pharmacist', 'doctor']} />}>
              <Route path="/portal/pharmacy" element={<Pharmacy />} />
            </Route>
          )}

          {isModuleEnabled('ipd') && (
            <>
              {/* Staff Bed Board and Core IPD Workflows */}
              <Route element={<ProtectedRoute roles={['admin', 'doctor', 'receptionist', 'nurse']} />}>
                <Route path="/portal/beds" element={<BedBoard />} />
                <Route path="/portal/ipd" element={<BedBoard />} />
                <Route path="/portal/ipd/admissions" element={<AdmissionsPage />} />
                <Route path="/portal/ipd/discharge-summary/:id" element={<PrintableDischargeSummary />} />
              </Route>

              {/* Receptionist & Admin Bookings Queue */}
              <Route element={<ProtectedRoute roles={['admin', 'receptionist']} />}>
                <Route path="/portal/ipd/bookings" element={<BedRequestsQueue />} />
              </Route>

              {/* Admin Wards & Beds Configuration */}
              <Route element={<ProtectedRoute roles={['admin']} />}>
                <Route path="/portal/ipd/wards" element={<WardsSettingsPage />} />
              </Route>

              {/* Nurse Station */}
              <Route element={<ProtectedRoute roles={['admin', 'nurse']} />}>
                <Route path="/portal/ipd/nursing" element={<NursePatientsPage />} />
              </Route>

              {/* Doctor Inpatients Station */}
              <Route element={<ProtectedRoute roles={['admin', 'doctor']} />}>
                <Route path="/portal/ipd/my-patients" element={<DoctorInpatientsPage />} />
              </Route>

              {/* Patient Bed Booking */}
              <Route element={<ProtectedRoute roles={['patient']} />}>
                <Route path="/portal/book-bed" element={<PatientBookBedPage />} />
              </Route>
            </>
          )}

          {/* Catch-all redirect to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Render Public Footer on Public Pages Only */}
      {!isPortalRoute && <Footer />}

      {/* Global Toast Alerts */}
      <Toast message={toastInfo.message} type={toastInfo.type} onClose={hideToast} />
    </div>
  );
}

export default App;
