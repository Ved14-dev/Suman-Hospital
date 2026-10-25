/**
 * Centralized Role-Based Access Control (RBAC) Permission Matrix
 * Suman Multispecialty Hospital ERP
 * Source of truth for backend authorizations.
 */

export const ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
  PHARMACIST: 'pharmacist',
  NURSE: 'nurse',
  PATIENT: 'patient',
};

export const PERMISSION_MATRIX = {
  // --- Patient Registry ---
  'patient:create': ['admin', 'receptionist'],
  'patient:edit': ['admin', 'receptionist'],
  'patient:search': ['admin', 'receptionist', 'doctor', 'nurse', 'pharmacist'],
  'patient:read': ['admin', 'doctor', 'receptionist', 'nurse', 'pharmacist', 'patient'],
  'patient:deactivate': ['admin'],

  // --- Appointments & OPD Queue ---
  'appointment:view_all': ['admin', 'receptionist', 'nurse'],
  'appointment:view_own': ['doctor', 'patient'],
  'appointment:book': ['admin', 'receptionist', 'patient'],
  'appointment:walkin': ['admin', 'receptionist'],
  'appointment:checkin': ['admin', 'receptionist'],
  'appointment:reschedule': ['admin', 'receptionist', 'patient'],
  'appointment:cancel': ['admin', 'receptionist', 'doctor', 'patient'],
  'appointment:noshow': ['admin', 'receptionist', 'doctor'],
  'opd:queue_view': ['admin', 'doctor', 'receptionist', 'nurse'],
  'opd:call_next': ['doctor'],
  'opd:start_consultation': ['doctor'],
  'opd:complete_consultation': ['doctor'],

  // --- EMR (visits, vitals, Rx, certificates) ---
  'emr:view': ['admin', 'doctor', 'receptionist', 'pharmacist', 'nurse', 'patient'],
  'emr:create_edit': ['doctor'],
  'emr:add_vitals': ['doctor', 'nurse'],
  'emr:read_rx': ['admin', 'doctor', 'pharmacist', 'patient'],

  // --- Billing ---
  'billing:full': ['admin'],
  'billing:create': ['admin', 'receptionist'],
  'billing:payment': ['admin', 'receptionist'],
  'billing:refund_report': ['admin'],
  'billing:view_own': ['doctor', 'patient'],
  'billing:view_all': ['admin', 'receptionist'],

  // --- Pharmacy / Inventory ---
  'pharmacy:full': ['admin', 'pharmacist'],
  'pharmacy:read_medicine': ['admin', 'doctor', 'pharmacist'],

  // --- IPD / Beds ---
  'ipd:full': ['admin'],
  'ipd:availability': ['admin', 'doctor', 'receptionist', 'nurse', 'patient'],
  'ipd:view_beds': ['admin', 'doctor', 'receptionist', 'nurse'],
  'ipd:booking_create': ['admin', 'doctor', 'receptionist', 'patient'],
  'ipd:booking_approve': ['admin', 'receptionist'],
  'ipd:booking_cancel': ['admin', 'doctor', 'receptionist', 'patient'],
  'ipd:hold_bed': ['admin', 'receptionist'],
  'ipd:admit': ['admin', 'doctor', 'receptionist'],
  'ipd:transfer': ['admin', 'doctor', 'receptionist', 'nurse'],
  'ipd:clean_bed': ['admin', 'nurse'],
  'ipd:maintenance_report': ['admin', 'nurse'],
  'ipd:maintenance_clear': ['admin'],
  'ipd:round_notes_create': ['doctor'],
  'ipd:round_notes_read': ['admin', 'doctor'],
  'ipd:nursing_create': ['nurse'],
  'ipd:nursing_read': ['admin', 'doctor', 'nurse'],
  'ipd:nursing_ack': ['doctor', 'admin'],
  'ipd:discharge': ['admin', 'doctor'],
  'ipd:manage_wards': ['admin'],
  'ipd:bed_events': ['admin'],
  // Legacy backward-compatibility mappings
  'ipd:round_notes': ['admin', 'doctor'],
  'ipd:nursing_notes': ['admin', 'nurse'],
  'ipd:vitals': ['admin', 'nurse', 'doctor'],

  // --- Staff / HR ---
  'staff:full': ['admin'],
  'staff:view_own': ['admin', 'doctor', 'receptionist', 'pharmacist', 'nurse'],

  // --- Audit / System ---
  'audit:full': ['admin'],
  'backup:full': ['admin'],
};

/**
 * Returns true if the user's role has the requested permission
 */
export const hasPermission = (role, permission) => {
  const allowedRoles = PERMISSION_MATRIX[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
};

/**
 * Express middleware to check permission
 */
export const requirePermission = (permission) => (req, res, next) => {
  if (!req.user || !hasPermission(req.user.role, permission)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Role '${req.user?.role || 'anonymous'}' is not authorized for '${permission}'.`,
    });
  }
  next();
};
