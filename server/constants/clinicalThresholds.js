/**
 * Clinical Thresholds & Plausible Ranges
 * Suman Multispecialty Hospital
 *
 * NOTE: These are demo defaults to be configured by hospital clinical leadership.
 * Plausible ranges reject impossible clinical values (HTTP 400).
 * Thresholds flag entries as abnormal for doctor review.
 */

export const CLINICAL_THRESHOLDS = {
  systolic: { min: 90, max: 140, unit: 'mmHg' },
  diastolic: { min: 60, max: 90, unit: 'mmHg' },
  pulse: { min: 60, max: 100, unit: 'bpm' },
  temperature: { min: 36.0, max: 37.8, unit: '°C' }, // ~96.8°F to 100.0°F
  spO2: { min: 95, max: 100, unit: '%' },
  respiratoryRate: { min: 12, max: 20, unit: 'breaths/min' },
  bloodSugar: { min: 70, max: 140, unit: 'mg/dL' },
};

export const PLAUSIBLE_RANGES = {
  systolic: { min: 50, max: 260, label: 'Systolic BP' },
  diastolic: { min: 30, max: 160, label: 'Diastolic BP' },
  pulse: { min: 30, max: 240, label: 'Pulse rate' },
  temperature: { min: 30.0, max: 45.0, label: 'Body temperature' }, // Celsius
  spO2: { min: 50, max: 100, label: 'SpO2 oxygen saturation' },
  respiratoryRate: { min: 4, max: 60, label: 'Respiratory rate' },
  weight: { min: 0.5, max: 350.0, label: 'Weight' },
  painScore: { min: 0, max: 10, label: 'Pain score' },
  bloodSugar: { min: 20, max: 1000, label: 'Blood sugar' },
};

/**
 * Validates whether entered vitals fall within physiologically plausible bounds.
 * Returns array of error messages.
 */
export const validateVitalsPlausibility = (vitals = {}) => {
  const errors = [];
  for (const [key, range] of Object.entries(PLAUSIBLE_RANGES)) {
    if (vitals[key] !== undefined && vitals[key] !== null && vitals[key] !== '') {
      const val = Number(vitals[key]);
      if (Number.isNaN(val) || val < range.min || val > range.max) {
        errors.push(`${range.label} must be between ${range.min} and ${range.max}. Received: ${vitals[key]}`);
      }
    }
  }
  return errors;
};

/**
 * Evaluates whether vitals are clinically abnormal according to thresholds.
 * Returns { abnormal: boolean, abnormalFlags: string[] }
 */
export const evaluateAbnormalVitals = (vitals = {}) => {
  const flags = [];

  if (vitals.systolic !== undefined && vitals.systolic !== null && vitals.systolic !== '') {
    const s = Number(vitals.systolic);
    if (s < CLINICAL_THRESHOLDS.systolic.min) flags.push(`Systolic BP Low (${s} < ${CLINICAL_THRESHOLDS.systolic.min} mmHg)`);
    if (s > CLINICAL_THRESHOLDS.systolic.max) flags.push(`Systolic BP High (${s} > ${CLINICAL_THRESHOLDS.systolic.max} mmHg)`);
  }

  if (vitals.diastolic !== undefined && vitals.diastolic !== null && vitals.diastolic !== '') {
    const d = Number(vitals.diastolic);
    if (d < CLINICAL_THRESHOLDS.diastolic.min) flags.push(`Diastolic BP Low (${d} < ${CLINICAL_THRESHOLDS.diastolic.min} mmHg)`);
    if (d > CLINICAL_THRESHOLDS.diastolic.max) flags.push(`Diastolic BP High (${d} > ${CLINICAL_THRESHOLDS.diastolic.max} mmHg)`);
  }

  if (vitals.pulse !== undefined && vitals.pulse !== null && vitals.pulse !== '') {
    const p = Number(vitals.pulse);
    if (p < CLINICAL_THRESHOLDS.pulse.min) flags.push(`Pulse Low (${p} < ${CLINICAL_THRESHOLDS.pulse.min} bpm)`);
    if (p > CLINICAL_THRESHOLDS.pulse.max) flags.push(`Pulse High (${p} > ${CLINICAL_THRESHOLDS.pulse.max} bpm)`);
  }

  if (vitals.temperature !== undefined && vitals.temperature !== null && vitals.temperature !== '') {
    const t = Number(vitals.temperature);
    if (t < CLINICAL_THRESHOLDS.temperature.min) flags.push(`Temperature Low (${t}°C)`);
    if (t > CLINICAL_THRESHOLDS.temperature.max) flags.push(`Temperature High / Fever (${t}°C)`);
  }

  if (vitals.spO2 !== undefined && vitals.spO2 !== null && vitals.spO2 !== '') {
    const o2 = Number(vitals.spO2);
    if (o2 < CLINICAL_THRESHOLDS.spO2.min) flags.push(`SpO2 Low (${o2}% < ${CLINICAL_THRESHOLDS.spO2.min}%)`);
  }

  if (vitals.respiratoryRate !== undefined && vitals.respiratoryRate !== null && vitals.respiratoryRate !== '') {
    const rr = Number(vitals.respiratoryRate);
    if (rr < CLINICAL_THRESHOLDS.respiratoryRate.min) flags.push(`Respiratory Rate Low (${rr}/min)`);
    if (rr > CLINICAL_THRESHOLDS.respiratoryRate.max) flags.push(`Respiratory Rate High (${rr}/min)`);
  }

  if (vitals.bloodSugar !== undefined && vitals.bloodSugar !== null && vitals.bloodSugar !== '') {
    const bs = Number(vitals.bloodSugar);
    if (bs < CLINICAL_THRESHOLDS.bloodSugar.min) flags.push(`Blood Sugar Low (${bs} mg/dL)`);
    if (bs > CLINICAL_THRESHOLDS.bloodSugar.max) flags.push(`Blood Sugar High (${bs} mg/dL)`);
  }

  return {
    abnormal: flags.length > 0,
    abnormalFlags: flags,
  };
};
