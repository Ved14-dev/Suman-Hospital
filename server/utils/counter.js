import Counter from '../models/Counter.js';

/**
 * Atomically increments and returns the next integer sequence for a given counter key.
 * Never uses max + 1 in application code.
 * Two simultaneous requests will never receive the same number.
 */
export const getNextSequence = async (name) => {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

/**
 * Returns the next unique, human-readable UHID formatted as SMH-XXXXXX
 */
export const getNextUHID = async () => {
  const seq = await getNextSequence('uhid');
  return `SMH-${String(seq).padStart(6, '0')}`;
};

/**
 * Returns the next daily token number for a given doctor on a specific IST date.
 * Resets each day automatically because the key is doctorId + date.
 */
export const getNextDailyToken = async (doctorId, dateStr) => {
  const key = `token_${doctorId.toString()}_${dateStr}`;
  const seq = await getNextSequence(key);
  return seq;
};

/**
 * Returns next invoice number formatted as SMH-INV-XXXXXX
 */
export const getNextInvoiceNumber = async () => {
  const seq = await getNextSequence('invoice');
  return `SMH-INV-${String(seq).padStart(6, '0')}`;
};

/**
 * Returns next receipt number formatted as SMH-REC-XXXXXX
 */
export const getNextReceiptNumber = async () => {
  const seq = await getNextSequence('receipt');
  return `SMH-REC-${String(seq).padStart(6, '0')}`;
};

/**
 * Returns next prescription number formatted as SMH-RX-XXXXXX
 */
export const getNextRxNumber = async () => {
  const seq = await getNextSequence('rxNumber');
  return `SMH-RX-${String(seq).padStart(6, '0')}`;
};

/**
 * Returns next medical certificate number formatted as SMH-CERT-XXXXXX
 */
export const getNextCertificateNumber = async () => {
  const seq = await getNextSequence('certificateNumber');
  return `SMH-CERT-${String(seq).padStart(6, '0')}`;
};

/**
 * Returns next refund number formatted as SMH-REF-XXXXXX
 */
export const getNextRefundNumber = async () => {
  const seq = await getNextSequence('refundNumber');
  return `SMH-REF-${String(seq).padStart(6, '0')}`;
};

/**
 * Returns next admission number formatted as SMH-ADM-XXXXXX
 */
export const getNextAdmissionNumber = async () => {
  const seq = await getNextSequence('admissionNumber');
  return `SMH-ADM-${String(seq).padStart(6, '0')}`;
};

/**
 * Returns next bed booking number formatted as SMH-BB-XXXXXX
 */
export const getNextBookingNumber = async () => {
  const seq = await getNextSequence('bookingNumber');
  return `SMH-BB-${String(seq).padStart(6, '0')}`;
};

/**
 * Returns next employee ID formatted as SMH-EMP-XXXXXX
 */
export const getNextEmployeeId = async () => {
  const seq = await getNextSequence('employeeId');
  return `SMH-EMP-${String(seq).padStart(6, '0')}`;
};
