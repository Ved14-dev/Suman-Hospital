import Appointment from '../models/Appointment.js';
import {
  isValidDateString,
  isPastDate,
  getISTDayOfWeek,
  isSlotTimePassed,
  toMinutes,
  toTime,
} from './dateUtils.js';

export const getOpenSlots = async (doctor, date) => {
  if (!isValidDateString(date) || isPastDate(date)) {
    return [];
  }

  const { dayIndex, dayName } = getISTDayOfWeek(date);
  if (dayIndex < 0) return [];

  // Find doctor's schedule for this day of week
  const schedule = (doctor.availability || []).find((item) => {
    return Number(item.dayOfWeek) === dayIndex || item.dayOfWeek === dayName;
  });

  if (!schedule || !schedule.startTime || !schedule.endTime) {
    return [];
  }

  // Find existing active online bookings for this doctor and date
  // Cancelled, Rescheduled, or No-show slots become available again if time has not passed
  const booked = await Appointment.find({
    doctorId: doctor._id,
    date,
    status: { $in: ['Pending', 'Confirmed'] },
  }).select('timeSlot');

  const bookedSlots = new Set(booked.map((item) => item.timeSlot));
  const slots = [];
  const duration = schedule.slotDurationMinutes || 30;
  const startMin = toMinutes(schedule.startTime);
  const endMin = toMinutes(schedule.endTime);

  for (let minute = startMin; minute + duration <= endMin; minute += duration) {
    const slot = toTime(minute);

    // If today, skip slots whose time has already elapsed
    if (isSlotTimePassed(date, slot)) {
      continue;
    }

    if (!bookedSlots.has(slot)) {
      slots.push(slot);
    }
  }

  return slots;
};
