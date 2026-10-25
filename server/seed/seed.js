import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

import Department from '../models/Department.js';
import Doctor from '../models/Doctor.js';
import Service from '../models/Service.js';
import Enquiry from '../models/Enquiry.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import Counter from '../models/Counter.js';
import Ward from '../models/Ward.js';
import Bed from '../models/Bed.js';
import BedBooking from '../models/BedBooking.js';
import BedEvent from '../models/BedEvent.js';
import Admission from '../models/Admission.js';
import RoundNote from '../models/RoundNote.js';
import NursingRecord from '../models/NursingRecord.js';
import ClinicalProfile from '../models/ClinicalProfile.js';
import { getTodayIST } from '../utils/dateUtils.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital_db';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[Seed]: Connected to MongoDB at', MONGODB_URI);

    // Drop existing collections to ensure index definitions (like sparse: true) are freshly rebuilt
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      await mongoose.connection.db.dropCollection(col.name).catch(() => {});
    }
    console.log('[Seed]: Cleared existing collections and old indexes.');

    // 1. Create the 4 Specialty Departments for Suman Multispecialty Hospital
    const departmentsData = [
      {
        name: 'General Checkup',
        slug: 'general-checkup',
        shortDescription: 'Primary health consultations, preventive screenings, acute illness diagnosis, and lifestyle disease management.',
        description: 'The General Checkup department at Suman Multispecialty Hospital provides first-line clinical evaluation, chronic disease monitoring (diabetes, hypertension), preventive executive checkups, and comprehensive family care.',
        servicesOffered: [
          'Routine Physical Examinations & Health Screenings',
          'Hypertension & Type-2 Diabetes Care Clinic',
          'Fever & Acute Infection Management',
          'Preventive Health & Geriatric Wellness',
          'Lifestyle and Dietary Counseling',
        ],
        icon: 'Stethoscope',
        image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
        headOfDept: 'Dr. Rajesh Sharma (MD, General Medicine)',
        phone: '+91 (022) 2890-4401',
      },
      {
        name: 'Pediatrics',
        slug: 'pediatrics',
        shortDescription: 'Compassionate pediatric healthcare, infant immunization, developmental screening, and pediatric outpatient care.',
        description: 'Our Pediatrics department provides holistic child healthcare from birth through adolescence. Led by experienced pediatricians, we focus on child wellness, timely vaccinations, respiratory infection management, and pediatric growth milestones.',
        servicesOffered: [
          'Well-Baby Clinic & Immunization Protocols',
          'Pediatric Growth & Developmental Milestones Tracking',
          'Child Asthma & Allergy Management',
          'Neonatal Post-Discharge Monitoring',
          'Child Nutrition & Adolescent Counseling',
        ],
        icon: 'Baby',
        image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
        headOfDept: 'Dr. Ananya Sen (MD Pediatrics)',
        phone: '+91 (022) 2890-4402',
      },
      {
        name: 'Orthopedics',
        slug: 'orthopedics',
        shortDescription: 'Bone, joint, spine, and musculoskeletal care, fracture management, arthritis relief, and post-trauma rehabilitation.',
        description: 'Suman Orthopedic Center provides specialized outpatient diagnostics and treatments for joint pains, osteoarthritis, sports injuries, fractures, and back pain, backed by in-house digital radiography and physiotherapy.',
        servicesOffered: [
          'Fracture & Trauma Assessment & Casting',
          'Knee & Hip Osteoarthritis Conservative Management',
          'Spine & Low Back Pain Rehabilitation',
          'Arthroscopy & Sports Ligament Evaluation',
          'Physiotherapy & Mobility Recovery Guidance',
        ],
        icon: 'Bone',
        image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
        headOfDept: 'Dr. Vikramaditya Rao (MS Ortho, M.Ch)',
        phone: '+91 (022) 2890-4403',
      },
      {
        name: 'Gynaecology & Panchakarma',
        slug: 'gynaecology-panchakarma',
        shortDescription: 'Integrated women health, prenatal care, menstrual wellness, and authentic Ayurvedic Panchakarma therapeutic detox.',
        description: 'Spearheaded by HOD Dr. Gauri Warhekar (BAMS), our Gynaecology & Panchakarma department uniquely combines modern gynecological care with classical Ayurvedic wellness, offering natural postpartum recovery, fertility support, PCOS management, and authentic Panchakarma rejuvenation treatments.',
        servicesOffered: [
          'Comprehensive Antenatal & Postnatal Mother Care',
          'PCOS, PCOD & Menstrual Irregularity Holistic Clinic',
          'Classical Panchakarma Therapies (Abhyanga, Shirodhara, Basti)',
          'Natural Infertility & Pre-Conception Counseling',
          'Cervical Cancer Screening & Menopause Management',
        ],
        icon: 'HeartPulse',
        image: 'https://images.unsplash.com/photo-1512290900673-097e3a2416f4?auto=format&fit=crop&w=800&q=80',
        headOfDept: 'Dr. Gauri Warhekar (BAMS, HOD)',
        phone: '+91 (022) 2890-4404',
      },
    ];

    const insertedDepts = await Department.insertMany(departmentsData);
    const deptMap = {};
    insertedDepts.forEach((d) => {
      deptMap[d.slug] = d._id;
    });
    console.log(`[Seed]: Created ${insertedDepts.length} departments.`);

    // 2. Demo Users & Staff Credentials
    const passwordHash = await bcrypt.hash('password123', 12);

    const usersData = [
      {
        name: 'Hospital Administrator',
        email: 'admin@sumanhospital.com',
        role: 'admin',
        phone: '+91 98200 11001',
        passwordHash,
      },
      {
        name: 'Front Desk Receptionist',
        email: 'receptionist@sumanhospital.com',
        role: 'receptionist',
        phone: '+91 98200 11002',
        passwordHash,
      },
      {
        name: 'Pharmacy In-Charge',
        email: 'pharmacist@sumanhospital.com',
        role: 'pharmacist',
        phone: '+91 98200 11003',
        passwordHash,
      },
      {
        name: 'Senior Nurse Sneha',
        email: 'nurse@sumanhospital.com',
        role: 'nurse',
        phone: '+91 98200 11004',
        passwordHash,
      },
      {
        name: 'Ramesh Patil',
        email: 'patient@sumanhospital.com',
        role: 'patient',
        phone: '+91 98200 22001',
        passwordHash,
      },
      // Doctors
      {
        name: 'Dr. Gauri Warhekar',
        email: 'dr.gauri.warhekar@sumanhospital.com',
        role: 'doctor',
        phone: '+91 98200 33001',
        passwordHash,
      },
      {
        name: 'Dr. Rajesh Sharma',
        email: 'dr.rajesh.sharma@sumanhospital.com',
        role: 'doctor',
        phone: '+91 98200 33002',
        passwordHash,
      },
      {
        name: 'Dr. Sunita Deshmukh',
        email: 'dr.sunita.deshmukh@sumanhospital.com',
        role: 'doctor',
        phone: '+91 98200 33003',
        passwordHash,
      },
      {
        name: 'Dr. Ananya Sen',
        email: 'dr.ananya.sen@sumanhospital.com',
        role: 'doctor',
        phone: '+91 98200 33004',
        passwordHash,
      },
      {
        name: 'Dr. Rohan Patel',
        email: 'dr.rohan.patel@sumanhospital.com',
        role: 'doctor',
        phone: '+91 98200 33005',
        passwordHash,
      },
      {
        name: 'Dr. Vikramaditya Rao',
        email: 'dr.vikramaditya.rao@sumanhospital.com',
        role: 'doctor',
        phone: '+91 98200 33006',
        passwordHash,
      },
      {
        name: 'Dr. Amit Joshi',
        email: 'dr.amit.joshi@sumanhospital.com',
        role: 'doctor',
        phone: '+91 98200 33007',
        passwordHash,
      },
      {
        name: 'Dr. Pooja Kadam',
        email: 'dr.pooja.kadam@sumanhospital.com',
        role: 'doctor',
        phone: '+91 98200 33008',
        passwordHash,
      },
    ];

    const insertedUsers = await User.insertMany(usersData);
    const userMap = {};
    insertedUsers.forEach((u) => {
      userMap[u.email] = u._id;
    });
    console.log(`[Seed]: Created ${insertedUsers.length} users with credentials.`);

    // 3. Create Doctors (2 to 4 doctors per department, small hospital roster)
    // Mon-Sat schedules: days 1 (Mon) to 6 (Sat)
    const standardDays = [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      dayOfWeek,
      startTime: '10:00',
      endTime: '14:00',
      slotDurationMinutes: 30,
    }));

    const afternoonDays = [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      dayOfWeek,
      startTime: '14:00',
      endTime: '18:00',
      slotDurationMinutes: 30,
    }));

    const doctorsData = [
      // Gynaecology & Panchakarma
      {
        name: 'Dr. Gauri Warhekar',
        specialization: 'HOD - Gynaecology & Panchakarma Specialist',
        qualification: 'BAMS, MD (Panchakarma), PG Diploma in Reproductive Health',
        experience: 16,
        department: deptMap['gynaecology-panchakarma'],
        consultationTimings: 'Mon - Sat: 10:00 AM - 02:00 PM',
        bio: 'Dr. Gauri Warhekar heads the Gynaecology & Panchakarma wing at Suman Multispecialty Hospital. With over 16 years of clinical excellence, she integrates evidence-based women health protocols with classical Ayurvedic Panchakarma for PCOS, fertility, and post-natal rejuvenation.',
        rating: 4.95,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        userId: userMap['dr.gauri.warhekar@sumanhospital.com'],
        availability: standardDays,
        isHOD: true,
        roomNumber: 'OPD Block C, Room 301',
      },
      {
        name: 'Dr. Pooja Kadam',
        specialization: 'Consultant Ayurvedic Physician & Panchakarma Vaidya',
        qualification: 'BAMS, Fellow in Panchakarma Therapies',
        experience: 8,
        department: deptMap['gynaecology-panchakarma'],
        consultationTimings: 'Mon - Sat: 02:00 PM - 06:00 PM',
        bio: 'Dr. Pooja specializes in therapeutic detox treatments, Shirodhara for stress and hormone balancing, and therapeutic dietary programs for maternal health.',
        rating: 4.88,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        userId: userMap['dr.pooja.kadam@sumanhospital.com'],
        availability: afternoonDays,
        isHOD: false,
        roomNumber: 'OPD Block C, Room 302',
      },

      // General Checkup
      {
        name: 'Dr. Rajesh Sharma',
        specialization: 'Senior Consultant - Internal Medicine',
        qualification: 'MBBS, MD (General Medicine)',
        experience: 20,
        department: deptMap['general-checkup'],
        consultationTimings: 'Mon - Sat: 10:00 AM - 02:00 PM',
        bio: 'Dr. Rajesh Sharma brings two decades of clinical acumen in family medicine, hypertension, diabetes care, and acute diagnostic consultations.',
        rating: 4.92,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        userId: userMap['dr.rajesh.sharma@sumanhospital.com'],
        availability: standardDays,
        isHOD: true,
        roomNumber: 'OPD Block A, Room 101',
      },
      {
        name: 'Dr. Sunita Deshmukh',
        specialization: 'Consultant Physician & Family Medicine',
        qualification: 'MBBS, DNB (Family Medicine)',
        experience: 12,
        department: deptMap['general-checkup'],
        consultationTimings: 'Mon - Sat: 02:00 PM - 06:00 PM',
        bio: 'Dr. Sunita specializes in preventive health checks, lifestyle disease reversals, and infectious disease management.',
        rating: 4.85,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        userId: userMap['dr.sunita.deshmukh@sumanhospital.com'],
        availability: afternoonDays,
        isHOD: false,
        roomNumber: 'OPD Block A, Room 102',
      },

      // Pediatrics
      {
        name: 'Dr. Ananya Sen',
        specialization: 'Senior Consultant Pediatrician',
        qualification: 'MBBS, MD (Pediatrics), DCH',
        experience: 15,
        department: deptMap['pediatrics'],
        consultationTimings: 'Mon - Sat: 10:00 AM - 02:00 PM',
        bio: 'Dr. Ananya Sen is known for her warm, compassionate child care. She specializes in infant vaccination schedules, pediatric asthma, and growth milestone monitoring.',
        rating: 4.96,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        userId: userMap['dr.ananya.sen@sumanhospital.com'],
        availability: standardDays,
        isHOD: true,
        roomNumber: 'Children Wing, Room 201',
      },
      {
        name: 'Dr. Rohan Patel',
        specialization: 'Consultant Pediatrician & Neonatologist',
        qualification: 'MBBS, MD (Pediatrics)',
        experience: 9,
        department: deptMap['pediatrics'],
        consultationTimings: 'Mon - Sat: 02:00 PM - 06:00 PM',
        bio: 'Dr. Rohan provides dedicated outpatient care for child nutrition, recurrent infections, and adolescent guidance.',
        rating: 4.87,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        userId: userMap['dr.rohan.patel@sumanhospital.com'],
        availability: afternoonDays,
        isHOD: false,
        roomNumber: 'Children Wing, Room 202',
      },

      // Orthopedics
      {
        name: 'Dr. Vikramaditya Rao',
        specialization: 'Senior Orthopedic & Joint Surgeon',
        qualification: 'MBBS, MS (Orthopedics), M.Ch (Ortho)',
        experience: 18,
        department: deptMap['orthopedics'],
        consultationTimings: 'Mon - Sat: 10:00 AM - 02:00 PM',
        bio: 'Dr. Vikramaditya Rao specializes in knee, hip, and spine care, offering targeted therapies for arthritis, fractures, and back pain.',
        rating: 4.94,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        userId: userMap['dr.vikramaditya.rao@sumanhospital.com'],
        availability: standardDays,
        isHOD: true,
        roomNumber: 'OPD Block B, Room 105',
      },
      {
        name: 'Dr. Amit Joshi',
        specialization: 'Consultant Orthopedist & Sports Injury Specialist',
        qualification: 'MBBS, MS (Ortho), Fellowship in Sports Medicine',
        experience: 10,
        department: deptMap['orthopedics'],
        consultationTimings: 'Mon - Sat: 02:00 PM - 06:00 PM',
        bio: 'Dr. Amit Joshi manages sports sprains, ligament tears, fracture casting, and musculoskeletal rehabilitation.',
        rating: 4.86,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        userId: userMap['dr.amit.joshi@sumanhospital.com'],
        availability: afternoonDays,
        isHOD: false,
        roomNumber: 'OPD Block B, Room 106',
      },
    ];

    const insertedDoctors = await Doctor.insertMany(doctorsData);
    const docMap = {};
    insertedDoctors.forEach((doc) => {
      docMap[doc.name] = doc;
    });
    console.log(`[Seed]: Created ${insertedDoctors.length} doctors across 4 departments.`);

    // 4. Create Patients (Portal + Walk-ins) with atomic counter synchronization
    const patientsData = [
      {
        uhid: 'SMH-000001',
        name: 'Ramesh Patil',
        email: 'patient@sumanhospital.com',
        phone: '+91 98200 22001',
        gender: 'Male',
        dob: '1984-06-15',
        approxAge: 42,
        bloodGroup: 'B+',
        address: 'Flat 402, Shivneri Heights, Amravati',
        allergies: ['Penicillin'],
        chronicConditions: ['Mild Hypertension'],
        emergencyContact: { name: 'Sunita Patil', relation: 'Spouse', phone: '+91 98200 22099' },
        userId: userMap['patient@sumanhospital.com'],
        registeredAt: new Date(),
      },
      {
        uhid: 'SMH-000002',
        name: 'Priyanka Shinde',
        email: 'priyanka.shinde@example.com',
        phone: '+91 98330 44551',
        gender: 'Female',
        dob: '1992-11-20',
        approxAge: 33,
        bloodGroup: 'O+',
        address: 'B-12, Sai Krupa Colony, Badnera Road, Amravati',
        allergies: ['Dust mites'],
        chronicConditions: ['PCOS'],
        emergencyContact: { name: 'Kiran Shinde', relation: 'Brother', phone: '+91 98330 44552' },
        registeredBy: userMap['receptionist@sumanhospital.com'],
        registeredAt: new Date(),
      },
      {
        uhid: 'SMH-000003',
        name: 'Aarav Deshmukh',
        phone: '+91 97660 77881',
        gender: 'Male',
        dob: '2020-04-10',
        approxAge: 6,
        bloodGroup: 'A+',
        address: 'Plot 45, Rajapeth, Amravati',
        allergies: [],
        chronicConditions: ['Childhood Asthma'],
        emergencyContact: { name: 'Vikas Deshmukh', relation: 'Father', phone: '+91 97660 77881' },
        registeredBy: userMap['receptionist@sumanhospital.com'],
        registeredAt: new Date(),
      },
      {
        uhid: 'SMH-000004',
        name: 'Suresh B. Kulkarni',
        phone: '+91 94221 33445',
        gender: 'Male',
        dob: '1958-09-05',
        approxAge: 68,
        bloodGroup: 'AB+',
        address: 'C-7, Tapovan Road, Camp, Amravati',
        allergies: ['Sulfa drugs'],
        chronicConditions: ['Type-2 Diabetes', 'Knee Osteoarthritis'],
        emergencyContact: { name: 'Mahesh Kulkarni', relation: 'Son', phone: '+91 94221 33499' },
        registeredBy: userMap['receptionist@sumanhospital.com'],
        registeredAt: new Date(),
      },
      {
        uhid: 'SMH-000005',
        name: 'Meena Warhekar',
        phone: '+91 98229 11223',
        gender: 'Female',
        dob: '1989-02-14',
        approxAge: 37,
        bloodGroup: 'O-',
        address: '102, Shriram Complex, Gadge Nagar, Amravati',
        allergies: [],
        chronicConditions: [],
        emergencyContact: { name: 'Anil Warhekar', relation: 'Husband', phone: '+91 98229 11224' },
        registeredBy: userMap['admin@sumanhospital.com'],
        registeredAt: new Date(),
      },
    ];

    const insertedPatients = await Patient.insertMany(patientsData);
    console.log(`[Seed]: Created ${insertedPatients.length} patients with UHIDs.`);

    // Initialize Atomic Counter for UHID so subsequent registrations continue from 6
    await Counter.create({ _id: 'uhid', seq: insertedPatients.length });
    console.log(`[Seed]: Initialized Counter for 'uhid' at seq: ${insertedPatients.length}`);

    // 5. Create Appointments for Today (IST) to immediately populate the live OPD Queue
    const todayIST = getTodayIST();
    console.log(`[Seed]: Seeding appointments for today IST (${todayIST})`);

    const gauriDoc = docMap['Dr. Gauri Warhekar'];
    const rajeshDoc = docMap['Dr. Rajesh Sharma'];

    const appointmentsData = [
      // Walk-in Token #1 with Dr. Gauri Warhekar (In Consultation)
      {
        patientId: insertedPatients[1]._id, // Priyanka Shinde
        doctorId: gauriDoc._id,
        departmentId: deptMap['gynaecology-panchakarma'],
        date: todayIST,
        timeSlot: 'Walk-in',
        source: 'walk-in',
        tokenNumber: 1,
        status: 'Confirmed',
        queueStatus: 'In Consultation',
        checkedInAt: new Date(Date.now() - 35 * 60000), // 35 min ago
        consultationStartedAt: new Date(Date.now() - 10 * 60000), // 10 min ago
        reasonForVisit: 'PCOS follow-up and Panchakarma herbal consultation',
        bookedBy: userMap['receptionist@sumanhospital.com'],
      },
      // Online checked-in Token #2 with Dr. Gauri Warhekar (Waiting)
      {
        patientId: insertedPatients[4]._id, // Meena Warhekar
        doctorId: gauriDoc._id,
        departmentId: deptMap['gynaecology-panchakarma'],
        date: todayIST,
        timeSlot: '11:00',
        source: 'online',
        tokenNumber: 2,
        status: 'Confirmed',
        queueStatus: 'Waiting',
        checkedInAt: new Date(Date.now() - 20 * 60000),
        reasonForVisit: 'Pre-conception and routine antenatal checkup',
        bookedBy: userMap['receptionist@sumanhospital.com'],
      },
      // Walk-in Token #1 with Dr. Rajesh Sharma (Completed)
      {
        patientId: insertedPatients[3]._id, // Suresh Kulkarni
        doctorId: rajeshDoc._id,
        departmentId: deptMap['general-checkup'],
        date: todayIST,
        timeSlot: 'Walk-in',
        source: 'walk-in',
        tokenNumber: 1,
        status: 'Completed',
        queueStatus: 'Completed',
        checkedInAt: new Date(Date.now() - 80 * 60000),
        consultationStartedAt: new Date(Date.now() - 50 * 60000),
        consultationEndedAt: new Date(Date.now() - 25 * 60000),
        reasonForVisit: 'Blood sugar check and routine diabetic follow-up',
        consultationNotes: 'Fasting blood sugar 132 mg/dL. Advised dietary modifications, continued Metformin 500mg BD. Re-check HbA1c in 2 months.',
        bookedBy: userMap['receptionist@sumanhospital.com'],
      },
      // Online checked-in Token #2 with Dr. Rajesh Sharma (Waiting)
      {
        patientId: insertedPatients[0]._id, // Ramesh Patil (Portal User)
        doctorId: rajeshDoc._id,
        departmentId: deptMap['general-checkup'],
        date: todayIST,
        timeSlot: '10:30',
        source: 'online',
        tokenNumber: 2,
        status: 'Confirmed',
        queueStatus: 'Waiting',
        checkedInAt: new Date(Date.now() - 15 * 60000),
        reasonForVisit: 'General health checkup and mild seasonal cough',
        bookedBy: userMap['patient@sumanhospital.com'],
      },
    ];

    const insertedAppointments = await Appointment.insertMany(appointmentsData);
    console.log(`[Seed]: Created ${insertedAppointments.length} live appointments for today.`);

    // Initialize daily token counters for today so next walk-in gets token #3
    await Counter.create({ _id: `token_${gauriDoc._id.toString()}_${todayIST}`, seq: 2 });
    await Counter.create({ _id: `token_${rajeshDoc._id.toString()}_${todayIST}`, seq: 2 });

    // 6. Create Services for the 4 departments
    const servicesData = [
      {
        name: 'Executive & Family Health Checkups',
        description: 'Comprehensive preventative health assessments, complete blood profiling, vital screenings, and personalized lifestyle medicine consultations.',
        department: deptMap['general-checkup'],
        icon: 'Activity',
        features: [
          'Full-Body Vitals, ECG & Basic Metabolic Screening',
          'Hypertension & Diabetic Risk Profiling',
          'Same-Day Digital Laboratory Reports',
          'Senior Citizen Wellness Consultation',
        ],
      },
      {
        name: 'Child Immunization & Growth Tracking',
        description: 'Scheduled pediatric immunizations following Indian Academy of Pediatrics (IAP) guidelines, along with physical and cognitive growth monitoring.',
        department: deptMap['pediatrics'],
        icon: 'Baby',
        features: [
          'Complete IAP-Certified Vaccination Calendar',
          'Nutritional & Growth Velocity Monitoring',
          'Gentle Pediatric Consultation Environment',
          'Lactation and Infant Weaning Advice',
        ],
      },
      {
        name: 'Joint Pain & Fracture Management',
        description: 'Dedicated diagnostic and conservative therapy for arthritis, sports sprains, acute fractures, backache, and post-injury physiotherapy.',
        department: deptMap['orthopedics'],
        icon: 'Bone',
        features: [
          'Emergency Fracture Reduction & Plaster Casting',
          'Knee & Hip Osteoarthritis Care Clinic',
          'Post-Trauma Rehabilitation & Physiotherapy',
          'In-House Low-Radiation Digital Radiography',
        ],
      },
      {
        name: 'Ayurvedic Panchakarma & Women Wellness',
        description: 'Holistic reproductive health management integrated with authentic classical Panchakarma therapies (Shirodhara, Abhyanga, Basti) led by HOD Dr. Gauri Warhekar.',
        department: deptMap['gynaecology-panchakarma'],
        icon: 'HeartPulse',
        features: [
          'Natural PCOS / PCOD Correction Programs',
          'Classical Detox & Rejuvenation Panchakarma',
          'Comprehensive Prenatal & Postnatal Mother Care',
          'Authentic Medicated Herbal Formulations',
        ],
      },
      {
        name: '24/7 In-House Hospital Pharmacy',
        description: 'Stocked hospital pharmacy dispensing authentic verified cold-chain medications, Ayurvedic herbal preparations, and pediatric syrups.',
        department: deptMap['general-checkup'],
        icon: 'Pills',
        features: [
          'Authentic Allopathic & Ayurvedic Formulations',
          'Cold-Chain Temperature Controlled Storage',
          'Computerized Prescription Safety Check',
          'Convenient OPD Counter Dispensing',
        ],
      },
      {
        name: 'Digital Laboratory & Diagnostic Testing',
        description: 'Rapid diagnostic pathology services providing routine blood tests, urine analysis, lipid profiles, and hormonal evaluations.',
        department: deptMap['general-checkup'],
        icon: 'Scan',
        features: [
          'Automated Hematology & Biochemistry Analyzers',
          'Fast 60-Minute Turnaround for Routine Panels',
          'Direct EHR Integration for Doctor Review',
          'Sterile Diagnostic Collection Room',
        ],
      },
    ];

    const insertedServices = await Service.insertMany(servicesData);
    console.log(`[Seed]: Created ${insertedServices.length} hospital services.`);

    // 7. Create Sample Enquiries
    const sampleEnquiries = [
      {
        name: 'Sunil Deshmukh',
        email: 'sunil.deshmukh@example.com',
        phone: '+91 98230 45678',
        subject: 'Panchakarma Consultation Query with Dr. Gauri Warhekar',
        message: 'Namaste, I want to inquire regarding the Panchakarma detox package for chronic stress and rejuvenation. Please let me know available slots.',
        status: 'New',
      },
      {
        name: 'Pooja Patil',
        email: 'pooja.patil@example.com',
        phone: '+91 97110 88234',
        subject: 'Child Vaccination for 6-Month Infant',
        message: 'Hello, we want to book a vaccination slot with Dr. Ananya Sen for our baby next Saturday. Please confirm the timings.',
        status: 'In progress',
      },
    ];

    await Enquiry.insertMany(sampleEnquiries);
    console.log('[Seed]: Created sample enquiries.');

    // 8. IPD & Bed Management Seeding (Part A)
    // 8.1 Create 4 Specialty Wards
    const wardsData = [
      { name: 'General Medicine Ward', type: 'General', isActive: true },
      { name: 'Pediatric Care Ward', type: 'Pediatric', isActive: true },
      { name: 'Maternity & Gynae Wing', type: 'Maternity/Gynae', isActive: true },
      { name: 'Executive Private Suites', type: 'Private', isActive: true },
    ];
    const insertedWards = await Ward.insertMany(wardsData);
    const wardTypeMap = {};
    insertedWards.forEach((w) => {
      wardTypeMap[w.type] = w._id;
    });
    console.log(`[Seed]: Created ${insertedWards.length} specialty wards.`);

    // 8.2 Create 16 Physical Beds across the 4 Wards with statuses:
    // Available, Reserved, Occupied, Cleaning, Maintenance
    const bedsData = [
      // General Ward (5 beds) - 80000 paise (₹800/day)
      { wardId: wardTypeMap['General'], bedNumber: 'G-101', status: 'Occupied', dailyCharge: 80000 },
      { wardId: wardTypeMap['General'], bedNumber: 'G-102', status: 'Available', dailyCharge: 80000 },
      { wardId: wardTypeMap['General'], bedNumber: 'G-103', status: 'Reserved', dailyCharge: 80000 },
      { wardId: wardTypeMap['General'], bedNumber: 'G-104', status: 'Cleaning', dailyCharge: 80000 },
      {
        wardId: wardTypeMap['General'],
        bedNumber: 'G-105',
        status: 'Maintenance',
        dailyCharge: 80000,
        maintenanceReason: 'Wall panel & electrical socket repair',
      },

      // Pediatric Ward (4 beds) - 120000 paise (₹1,200/day)
      { wardId: wardTypeMap['Pediatric'], bedNumber: 'P-201', status: 'Available', dailyCharge: 120000 },
      { wardId: wardTypeMap['Pediatric'], bedNumber: 'P-202', status: 'Available', dailyCharge: 120000 },
      { wardId: wardTypeMap['Pediatric'], bedNumber: 'P-203', status: 'Available', dailyCharge: 120000 },
      { wardId: wardTypeMap['Pediatric'], bedNumber: 'P-204', status: 'Cleaning', dailyCharge: 120000 },

      // Maternity/Gynae Wing (4 beds) - 150000 paise (₹1,500/day)
      { wardId: wardTypeMap['Maternity/Gynae'], bedNumber: 'M-301', status: 'Available', dailyCharge: 150000 },
      { wardId: wardTypeMap['Maternity/Gynae'], bedNumber: 'M-302', status: 'Available', dailyCharge: 150000 },
      {
        wardId: wardTypeMap['Maternity/Gynae'],
        bedNumber: 'M-303',
        status: 'Maintenance',
        dailyCharge: 150000,
        maintenanceReason: 'Sanitization and AC maintenance',
      },
      { wardId: wardTypeMap['Maternity/Gynae'], bedNumber: 'M-304', status: 'Available', dailyCharge: 150000 },

      // Private Suites (3 beds) - 350000 paise (₹3,500/day)
      { wardId: wardTypeMap['Private'], bedNumber: 'PVT-401', status: 'Available', dailyCharge: 350000 },
      { wardId: wardTypeMap['Private'], bedNumber: 'PVT-402', status: 'Available', dailyCharge: 350000 },
      { wardId: wardTypeMap['Private'], bedNumber: 'PVT-403', status: 'Available', dailyCharge: 350000 },
    ];
    const insertedBeds = await Bed.insertMany(bedsData);
    const bedCodeMap = {};
    insertedBeds.forEach((b) => {
      bedCodeMap[b.bedNumber] = b;
    });
    console.log(`[Seed]: Created ${insertedBeds.length} beds covering all 5 statuses.`);

    // 8.3 Create Bed Bookings across all 6 statuses:
    // Requested, Approved, Admitted, Rejected, Cancelled, Expired
    const todayStr = getTodayIST();
    const [tY, tM, tD] = todayStr.split('-').map(Number);
    const futureDate1 = new Date(Date.UTC(tY, tM - 1, tD + 2, 12, 0, 0)).toISOString().slice(0, 10);
    const futureDate2 = new Date(Date.UTC(tY, tM - 1, tD + 3, 12, 0, 0)).toISOString().slice(0, 10);

    const sixHoursLater = new Date(Date.now() + 6 * 3600 * 1000);

    const bookingsData = [
      // 1. Requested
      {
        bookingNumber: 'SMH-BB-000001',
        patientId: insertedPatients[2]._id, // Aarav Deshmukh
        requestedByRole: 'receptionist',
        requestedByUserId: userMap['receptionist@sumanhospital.com'],
        wardType: 'Pediatric',
        expectedDate: futureDate1,
        doctorId: docMap['Dr. Ananya Sen']?._id,
        reason: 'Observation for pediatric asthma flare',
        status: 'Requested',
      },
      // 2. Approved (Demo patient account linked to same-day hold on G-103)
      {
        bookingNumber: 'SMH-BB-000002',
        patientId: insertedPatients[0]._id, // Ramesh Patil (demo patient)
        requestedByRole: 'patient',
        requestedByUserId: userMap['patient@sumanhospital.com'],
        wardType: 'General',
        expectedDate: todayStr,
        doctorId: docMap['Dr. Rajesh Sharma']?._id,
        reason: 'Elective medical admission for hypertension control',
        status: 'Approved',
        bedId: bedCodeMap['G-103']._id,
        holdUntil: sixHoursLater,
        decisionBy: userMap['receptionist@sumanhospital.com'],
        decisionAt: new Date(),
        decisionReason: 'Bed G-103 reserved with 6-hour hold',
      },
      // 3. Admitted (Priyanka Shinde on G-101)
      {
        bookingNumber: 'SMH-BB-000003',
        patientId: insertedPatients[1]._id, // Priyanka Shinde
        requestedByRole: 'doctor',
        requestedByUserId: userMap['dr.rajesh.sharma@sumanhospital.com'],
        wardType: 'General',
        expectedDate: todayStr,
        doctorId: docMap['Dr. Rajesh Sharma']?._id,
        reason: 'Acute febrile illness requiring inpatient IV hydration',
        status: 'Admitted',
        bedId: bedCodeMap['G-101']._id,
        decisionBy: userMap['receptionist@sumanhospital.com'],
        decisionAt: new Date(),
        decisionReason: 'Admitted directly from emergency OPD',
      },
      // 4. Rejected
      {
        bookingNumber: 'SMH-BB-000004',
        patientId: insertedPatients[3]._id, // Suresh B. Kulkarni
        requestedByRole: 'receptionist',
        requestedByUserId: userMap['receptionist@sumanhospital.com'],
        wardType: 'Private',
        expectedDate: futureDate1,
        reason: 'Requested executive suite for routine checkup',
        status: 'Rejected',
        decisionBy: userMap['admin@sumanhospital.com'],
        decisionAt: new Date(),
        decisionReason: 'Private suites fully booked for scheduled surgeries',
      },
      // 5. Cancelled
      {
        bookingNumber: 'SMH-BB-000005',
        patientId: insertedPatients[4]._id, // Meena Warhekar
        requestedByRole: 'patient',
        requestedByUserId: userMap['admin@sumanhospital.com'],
        wardType: 'Maternity/Gynae',
        expectedDate: futureDate2,
        reason: 'Admission requested for antenatal observation',
        status: 'Cancelled',
        decisionReason: 'Patient symptom improved at home, cancelled request',
      },
      // 6. Expired
      {
        bookingNumber: 'SMH-BB-000006',
        patientId: insertedPatients[3]._id,
        requestedByRole: 'receptionist',
        requestedByUserId: userMap['receptionist@sumanhospital.com'],
        wardType: 'General',
        expectedDate: '2026-10-01',
        status: 'Expired',
        decisionReason: 'Hold reservation time expired',
      },
    ];
    const insertedBookings = await BedBooking.insertMany(bookingsData);
    console.log(`[Seed]: Created ${insertedBookings.length} bed bookings covering all 6 statuses.`);

    // Link bed G-103 to booking 2 hold
    await Bed.findByIdAndUpdate(bedCodeMap['G-103']._id, {
      heldForBookingId: insertedBookings[1]._id,
      holdUntil: sixHoursLater,
    });

    // 8.4 Admissions:
    // (a) One active admission for Priyanka Shinde in bed G-101
    const activeAdmittedAt = new Date(Date.now() - 2 * 86400000); // 2 days ago
    const activeAdmission = await Admission.create({
      admissionNumber: 'SMH-ADM-000001',
      bookingId: insertedBookings[2]._id,
      patientId: insertedPatients[1]._id, // Priyanka Shinde
      admittingDoctorId: docMap['Dr. Rajesh Sharma']._id,
      departmentId: deptMap['general-checkup'],
      bedId: bedCodeMap['G-101']._id,
      admittedAt: activeAdmittedAt,
      reasonForAdmission: 'Acute febrile illness with severe dehydration and hypotension',
      provisionalDiagnosis: 'Dengue Fever with thrombocytopenia',
      status: 'Admitted',
      admittedBy: userMap['receptionist@sumanhospital.com'],
    });

    // Back-link G-101 bed and booking 3 to active admission
    await Bed.findByIdAndUpdate(bedCodeMap['G-101']._id, {
      currentAdmissionId: activeAdmission._id,
    });
    await BedBooking.findByIdAndUpdate(insertedBookings[2]._id, {
      admissionId: activeAdmission._id,
    });

    // (b) Doctor Round Note on active admission
    await RoundNote.create({
      admissionId: activeAdmission._id,
      type: 'DoctorRound',
      note: 'Morning rounds: Patient is conscious and alert. Hydration improving with IV Ringer Lactate. Platelet count 115,000/mcL. Continue IV antibiotics and close vitals monitoring.',
      vitals: { bpSystolic: 120, bpDiastolic: 78, pulse: 82, temperatureC: 37.1, spo2: 98 },
      by: userMap['dr.rajesh.sharma@sumanhospital.com'],
      at: new Date(Date.now() - 24 * 3600 * 1000),
    });

    // (c) Nursing Records on active admission:
    // Record 1: Normal Vitals
    const normalVitals = await NursingRecord.create({
      patientId: insertedPatients[1]._id,
      admissionId: activeAdmission._id,
      type: 'Vitals',
      data: {
        systolic: 120,
        diastolic: 78,
        pulse: 80,
        temperature: 37.0,
        spO2: 98,
        respiratoryRate: 16,
        painScore: 2,
        weight: 58,
      },
      note: 'Routine morning vitals. Patient comfortable.',
      observedAt: new Date(Date.now() - 8 * 3600 * 1000),
      recordedBy: userMap['nurse@sumanhospital.com'],
      recordedAt: new Date(Date.now() - 8 * 3600 * 1000),
      abnormal: false,
    });

    // Record 2: Abnormal Vitals (spikes fever, tachycardic, high BP, desaturation)
    const abnormalVitals = await NursingRecord.create({
      patientId: insertedPatients[1]._id,
      admissionId: activeAdmission._id,
      type: 'Vitals',
      data: {
        systolic: 148,
        diastolic: 94,
        pulse: 114,
        temperature: 39.4,
        spO2: 92,
        respiratoryRate: 24,
        painScore: 6,
      },
      note: 'Patient shivering, high fever spike with mild dyspnea.',
      observedAt: new Date(Date.now() - 4 * 3600 * 1000),
      recordedBy: userMap['nurse@sumanhospital.com'],
      recordedAt: new Date(Date.now() - 4 * 3600 * 1000),
      abnormal: true,
      abnormalFlags: [
        'Temperature High / Fever (39.4°C)',
        'Pulse High (114 bpm)',
        'Systolic BP High (148 mmHg)',
        'Diastolic BP High (94 mmHg)',
        'SpO2 Low (92%)',
        'Respiratory Rate High (24/min)',
      ],
    });

    // Record 3: Addendum to Abnormal Vitals (correction/supplement)
    await NursingRecord.create({
      patientId: insertedPatients[1]._id,
      admissionId: activeAdmission._id,
      type: 'Observation',
      data: { followUpAction: 'O2 administered' },
      note: 'Addendum: Placed on oxygen cannula at 2 L/min. SpO2 re-evaluated after 15 mins improved to 97%. Cold compresses applied to forehead.',
      observedAt: new Date(Date.now() - 3.5 * 3600 * 1000),
      recordedBy: userMap['nurse@sumanhospital.com'],
      recordedAt: new Date(Date.now() - 3.5 * 3600 * 1000),
      addendumOf: abnormalVitals._id,
      abnormal: false,
    });

    // Record 4: Medication Given
    await NursingRecord.create({
      patientId: insertedPatients[1]._id,
      admissionId: activeAdmission._id,
      type: 'Medication',
      data: {
        medicineName: 'Paracetamol IV Infusion 1g',
        dose: '100ml / 15 mins',
        route: 'Intravenous',
        timeGiven: '11:15 AM',
        orderedBy: 'Dr. Rajesh Sharma',
      },
      note: 'Administered for fever spike > 39°C per physician telephonic instruction.',
      observedAt: new Date(Date.now() - 3 * 3600 * 1000),
      recordedBy: userMap['nurse@sumanhospital.com'],
      recordedAt: new Date(Date.now() - 3 * 3600 * 1000),
      abnormal: false,
    });

    // (d) One discharged admission (Suresh B. Kulkarni previously in bed G-104)
    const dischargedAt = new Date();
    const admittedAtPast = new Date(Date.now() - 3 * 86400000);
    await Admission.create({
      admissionNumber: 'SMH-ADM-000002',
      patientId: insertedPatients[3]._id, // Suresh B. Kulkarni
      admittingDoctorId: docMap['Dr. Rajesh Sharma']._id,
      departmentId: deptMap['general-checkup'],
      bedId: bedCodeMap['G-104']._id,
      admittedAt: admittedAtPast,
      dischargedAt,
      reasonForAdmission: 'Uncontrolled Type-2 Diabetes with moderate ketosis',
      provisionalDiagnosis: 'Diabetes Mellitus with hyperosmolar state',
      status: 'Discharged',
      dischargeSummary: {
        finalDiagnosis: 'Type-2 Diabetes Mellitus with acute metabolic stabilization',
        treatmentGiven: 'Subcutaneous insulin sliding scale, oral hypoglycemics, IV hydration',
        conditionAtDischarge: 'Stable',
        adviceOnDischarge: 'Adhere strictly to diabetic meal plan, monitor capillary blood glucose TDS',
        followUp: 'Review in OPD in 7 days with fasting and PP blood sugar reports',
      },
      finalChargeSummary: {
        days: 4,
        dailyCharge: 80000,
        total: 320000,
      },
      admittedBy: userMap['receptionist@sumanhospital.com'],
      dischargedBy: userMap['dr.rajesh.sharma@sumanhospital.com'],
    });

    // 8.5 BedEvents Ledger Entries
    await BedEvent.insertMany([
      {
        bedId: bedCodeMap['G-101']._id,
        from: 'Available',
        to: 'Occupied',
        action: 'admit',
        by: {
          userId: userMap['receptionist@sumanhospital.com'],
          role: 'receptionist',
          name: 'Reception Desk',
        },
        at: activeAdmittedAt,
        reason: 'Admitted: SMH-ADM-000001',
        refs: { admissionId: activeAdmission._id, bookingId: insertedBookings[2]._id },
      },
      {
        bedId: bedCodeMap['G-103']._id,
        from: 'Available',
        to: 'Reserved',
        action: 'hold',
        by: {
          userId: userMap['receptionist@sumanhospital.com'],
          role: 'receptionist',
          name: 'Reception Desk',
        },
        at: new Date(),
        reason: 'Bed reserved for booking SMH-BB-000002',
        refs: { bookingId: insertedBookings[1]._id },
      },
      {
        bedId: bedCodeMap['G-104']._id,
        from: 'Occupied',
        to: 'Cleaning',
        action: 'discharge',
        by: {
          userId: userMap['dr.rajesh.sharma@sumanhospital.com'],
          role: 'doctor',
          name: 'Dr. Rajesh Sharma',
        },
        at: dischargedAt,
        reason: 'Patient discharged: SMH-ADM-000002',
      },
      {
        bedId: bedCodeMap['G-105']._id,
        from: 'Available',
        to: 'Maintenance',
        action: 'maintenance_report',
        by: {
          userId: userMap['nurse@sumanhospital.com'],
          role: 'nurse',
          name: 'Nurse Staff',
        },
        at: new Date(),
        reason: 'Wall panel & electrical socket repair',
      },
      {
        bedId: bedCodeMap['M-303']._id,
        from: 'Available',
        to: 'Maintenance',
        action: 'maintenance_report',
        by: {
          userId: userMap['nurse@sumanhospital.com'],
          role: 'nurse',
          name: 'Nurse Staff',
        },
        at: new Date(),
        reason: 'Sanitization and AC maintenance',
      },
    ]);
    console.log('[Seed]: Created initial BedEvent ledger entries.');

    // 8.6 Sync Counters
    await Counter.findByIdAndUpdate('bookingNumber', { seq: 6 }, { upsert: true });
    await Counter.findByIdAndUpdate('admissionNumber', { seq: 2 }, { upsert: true });
    console.log('[Seed]: Synchronized booking and admission counters.');

    console.log('\n======================================================');
    console.log(' SEEDING COMPLETE SUCCESSFULLY! Database: hospital_db ');
    console.log(' 4 Departments: General Checkup, Pediatrics, Orthopedics, Gynaecology & Panchakarma');
    console.log(' Demo Accounts:');
    console.log('   Admin:        admin@sumanhospital.com / password123');
    console.log('   Receptionist: receptionist@sumanhospital.com / password123');
    console.log('   Doctor (HOD): dr.gauri.warhekar@sumanhospital.com / password123');
    console.log('   Pharmacist:   pharmacist@sumanhospital.com / password123');
    console.log('   Nurse:        nurse@sumanhospital.com / password123');
    console.log('   Patient:      patient@sumanhospital.com / password123');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedData();
