/**
 * Centralized Date and Time utility for Suman Multispecialty Hospital
 * Enforces IST (Asia/Kolkata) timezone and standard YYYY-MM-DD date format.
 * No scattered new Date() calls across controllers.
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current date in IST as 'YYYY-MM-DD'
 */
export const getTodayIST = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
};

/**
 * Returns current time in IST as 'HH:MM' (24-hour)
 */
export const getCurrentTimeStringIST = () => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(new Date());
};

/**
 * Formats a Date object or timestamp into IST 'YYYY-MM-DD'
 */
export const toISTDateString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
};

/**
 * Formats a Date object or timestamp into IST 'HH:MM'
 */
export const toISTTimeString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(d);
};

/**
 * Validates 'YYYY-MM-DD' format using single-backslash regex
 */
export const isValidDateString = (dateStr) => {
  return typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
};

/**
 * Returns day of week index (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * and day name in IST for a 'YYYY-MM-DD' date string.
 */
export const getISTDayOfWeek = (dateStr) => {
  if (!isValidDateString(dateStr)) return { dayIndex: -1, dayName: '' };
  const [year, month, day] = dateStr.split('-').map(Number);
  // 06:30 UTC = 12:00 IST (noon), ensuring no daylight saving or midnight boundary drift
  const noonIST = new Date(Date.UTC(year, month - 1, day, 6, 30, 0));
  const dayIndex = noonIST.getUTCDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return {
    dayIndex,
    dayName: dayNames[dayIndex],
  };
};

/**
 * Checks if a dateStr is in the past compared to today in IST
 */
export const isPastDate = (dateStr) => {
  if (!isValidDateString(dateStr)) return true;
  return dateStr < getTodayIST();
};

/**
 * Checks if a slot time has passed for a given dateStr.
 * For future dates: false
 * For past dates: true
 * For today: true if slot time <= current IST time
 */
export const isSlotTimePassed = (dateStr, timeSlot) => {
  if (!isValidDateString(dateStr)) return true;
  const today = getTodayIST();
  if (dateStr < today) return true;
  if (dateStr > today) return false;
  if (!timeSlot || !timeSlot.includes(':')) return false;
  
  const currentTime = getCurrentTimeStringIST();
  return timeSlot <= currentTime;
};

/**
 * Convert HH:MM to total minutes from midnight
 */
export const toMinutes = (timeStr) => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

/**
 * Convert minutes from midnight to HH:MM format
 */
export const toTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
