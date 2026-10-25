import express from 'express';
import { getDoctors, getDoctorById } from '../controllers/doctorController.js';
import Doctor from '../models/Doctor.js';
import { getOpenSlots } from '../utils/availability.js';
import { getISTDayOfWeek } from '../utils/dateUtils.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getDoctors);
router.get('/:id/availability', async (req, res) => {
	const doctor = await Doctor.findById(req.params.id);
	if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
	if (!doctor.availability?.length) return res.json({ success: true, date: req.query.date, slots: [], availabilityConfigured: false, message: 'No availability has been set for this doctor yet.' });
	const slots = await getOpenSlots(doctor, req.query.date);
	const { dayIndex, dayName } = getISTDayOfWeek(req.query.date);
	const hasSchedule = doctor.availability.some((item) => Number(item.dayOfWeek) === dayIndex || item.dayOfWeek === dayName);
	res.json({ success: true, date: req.query.date, slots, availabilityConfigured: true, message: hasSchedule ? (slots.length ? '' : 'All slots are booked for this date.') : 'This doctor is not available on the selected date.' });
});
router.get('/:id', getDoctorById);
router.put('/me/availability', requireAuth, requireRole('doctor'), async (req, res) => {
	const doctor = await Doctor.findOneAndUpdate({ userId: req.user._id }, { availability: req.body.availability }, { new: true, runValidators: true });
	res.json({ success: true, data: doctor?.availability || [] });
});

export default router;
