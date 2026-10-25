import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

import departmentRoutes from './routes/departmentRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import enquiryRoutes from './routes/enquiryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import emrRoutes from './routes/emrRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import pharmacyRoutes from './routes/pharmacyRoutes.js';
import ipdRoutes from './routes/ipdRoutes.js';
import staffRoutes from './routes/staffRoutes.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Secure CORS configuration: Restrict to authorized client origins (no wildcard open CORS)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'https://suman-hospital.org',
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy: Origin not permitted'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hospital: 'Suman  Hospital API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/departments', departmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/admin', adminRoutes);
// Module 3: Clinical / EMR
app.use('/api/emr', emrRoutes);
// Module 4: Billing & Finance
app.use('/api/billing', billingRoutes);
// Module 5: Pharmacy & Inventory
app.use('/api/pharmacy', pharmacyRoutes);
// Module 6: IPD / Admissions
app.use('/api/ipd', ipdRoutes);
// Module 7: Staff & HR
app.use('/api/staff', staffRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Error caught by middleware]:', err.message);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// 404 Route Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[Server Running]: http://localhost:${PORT}`);
});
