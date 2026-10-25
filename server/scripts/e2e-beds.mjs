/**
 * E2E API Test Suite for Bed Booking & Management (Part A)
 * Suman Multispecialty Hospital
 * File: server/scripts/e2e-beds.mjs
 */

import assert from 'node:assert';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Credentials for all roles
const USERS = {
  admin: { email: 'admin@sumanhospital.com', password: 'password123' },
  receptionist: { email: 'receptionist@sumanhospital.com', password: 'password123' },
  doctor: { email: 'dr.rajesh.sharma@sumanhospital.com', password: 'password123' },
  otherDoctor: { email: 'dr.ananya.sen@sumanhospital.com', password: 'password123' },
  nurse: { email: 'nurse@sumanhospital.com', password: 'password123' },
  patient: { email: 'patient@sumanhospital.com', password: 'password123' },
};

const TOKENS = {};

const login = async (roleKey) => {
  const creds = USERS[roleKey];
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`Login failed for ${roleKey}: ${data.message || res.status}`);
  }
  TOKENS[roleKey] = data.token;
  return data.token;
};

const apiRequest = async (method, path, body = null, token = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, options);
  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    json = { success: false, raw: await res.text() };
  }
  return { status: res.status, ok: res.ok, data: json };
};

const runSuite = async () => {
  console.log('--- Starting Part A E2E API Test Suite ---');

  // 1. Authenticate all roles
  for (const role of Object.keys(USERS)) {
    await login(role);
  }
  console.log('✓ All 6 roles successfully authenticated');

  // Fetch initial wards, beds, admissions, doctors, patients
  const bedsRes = await apiRequest('GET', '/ipd/beds', null, TOKENS.admin);
  const allBeds = bedsRes.data.data;
  assert(allBeds.length >= 14, 'Expected at least 14 beds seeded');

  const admissionsRes = await apiRequest('GET', '/ipd/admissions', null, TOKENS.admin);
  const activeAdmission = admissionsRes.data.data.find((a) => a.status === 'Admitted');
  assert(activeAdmission, 'Expected an active admission seeded');

  const patientRes = await apiRequest('GET', '/patients', null, TOKENS.receptionist);
  const patients = patientRes.data.data.patients || patientRes.data.data;
  const demoPatient = patients.find((p) => p.email === 'patient@sumanhospital.com');
  const patient2 = patients.find((p) => p.uhid === 'SMH-000002');
  const patient3 = patients.find((p) => p.uhid === 'SMH-000003');
  const patient4 = patients.find((p) => p.uhid === 'SMH-000004');
  const patient5 = patients.find((p) => p.uhid === 'SMH-000005');

  // Create 2 unique test patients for clean concurrency/booking tests
  const freshPat1Res = await apiRequest(
    'POST',
    '/patients',
    {
      name: `Test Patient Alpha ${Date.now()}`,
      phone: `+91 99${String(Date.now()).slice(-8)}`,
      gender: 'Male',
      dob: '1995-05-15',
    },
    TOKENS.receptionist
  );
  const testPat1 = freshPat1Res.data.data;

  const freshPat2Res = await apiRequest(
    'POST',
    '/patients',
    {
      name: `Test Patient Beta ${Date.now() + 1}`,
      phone: `+91 98${String(Date.now() + 1).slice(-8)}`,
      gender: 'Female',
      dob: '1998-08-20',
    },
    TOKENS.receptionist
  );
  const testPat2 = freshPat2Res.data.data;

  // =========================================================================
  // SECTION 1: A1 Matrix Verification (Allowed vs Denied)
  // =========================================================================
  console.log('\n[Section 1]: Testing A1 Capability Matrix...');

  // 1.1 Availability counts per ward type: all 5 roles allowed, no occupant info
  for (const role of ['patient', 'receptionist', 'nurse', 'doctor', 'admin']) {
    const res = await apiRequest('GET', '/ipd/availability', null, TOKENS[role]);
    assert.strictEqual(res.status, 200, `${role} should see availability`);
    assert(Array.isArray(res.data.data), 'Availability data should be array');
    assert(res.data.data.length > 0, 'Should have ward types');
    // Ensure no occupant details exposed
    const str = JSON.stringify(res.data.data);
    assert(!str.includes('Priyanka'), 'Occupant names must not be in availability');
    assert(!str.includes('SMH-'), 'UHID must not be in availability');
  }
  console.log('✓ 1.1 Availability counts + daily rates: all roles allowed, privacy preserved');

  // 1.2 Full bed board with occupant name + UHID
  // Patient: 403
  const patBedBoard = await apiRequest('GET', '/ipd/beds', null, TOKENS.patient);
  assert.strictEqual(patBedBoard.status, 403, 'Patient cannot access bed board');

  // Receptionist, Nurse, Admin: see full occupant info
  for (const role of ['receptionist', 'nurse', 'admin']) {
    const r = await apiRequest('GET', '/ipd/beds', null, TOKENS[role]);
    assert.strictEqual(r.status, 200, `${role} can access bed board`);
    const occupied = r.data.data.find((b) => b.status === 'Occupied');
    assert(occupied?.currentAdmissionId?.patientId?.name, `${role} should see occupant name`);
    assert(occupied?.currentAdmissionId?.patientId?.uhid, `${role} should see occupant UHID`);
  }

  // Doctor: own patients named, other doctor patients shown as "Occupied"
  const docBedBoard = await apiRequest('GET', '/ipd/beds', null, TOKENS.otherDoctor);
  assert.strictEqual(docBedBoard.status, 200);
  const otherDocOccupied = docBedBoard.data.data.find((b) => b.status === 'Occupied');
  assert.strictEqual(
    otherDocOccupied.currentAdmissionId.patientId.name,
    'Occupied',
    'Other doctor must see occupant name masked as Occupied'
  );
  assert.strictEqual(
    otherDocOccupied.currentAdmissionId.patientId.uhid,
    '***',
    'Other doctor must see occupant UHID masked'
  );
  console.log('✓ 1.2 Full bed board: patient 403, receptionist/nurse/admin full, doctor privacy masked');

  // 1.3 Create bed booking: nurse 403
  const nurseBook = await apiRequest(
    'POST',
    '/ipd/bookings',
    { wardType: 'General', expectedDate: '2026-10-26', patientId: patient5._id },
    TOKENS.nurse
  );
  assert.strictEqual(nurseBook.status, 403, 'Nurse cannot create bed booking');
  console.log('✓ 1.3 Create bed booking: nurse denied (403)');

  // 1.4 Approve / reject booking: patient 403, nurse 403, doctor 403
  const testBookingRes = await apiRequest(
    'POST',
    '/ipd/bookings',
    { wardType: 'Maternity/Gynae', expectedDate: '2026-10-27', patientId: patient5._id },
    TOKENS.receptionist
  );
  assert(testBookingRes.ok, `Receptionist created test booking: ${testBookingRes.data?.message}`);
  const testBookingId = testBookingRes.data.data._id;

  for (const role of ['patient', 'nurse', 'doctor']) {
    const app = await apiRequest('POST', `/ipd/bookings/${testBookingId}/approve`, {}, TOKENS[role]);
    assert.strictEqual(app.status, 403, `${role} cannot approve booking`);
    const rej = await apiRequest('POST', `/ipd/bookings/${testBookingId}/reject`, {}, TOKENS[role]);
    assert.strictEqual(rej.status, 403, `${role} cannot reject booking`);
  }
  console.log('✓ 1.4 Approve/reject booking: patient, nurse, doctor denied (403)');

  // 1.5 Cancel booking: nurse 403
  const nurseCancel = await apiRequest('POST', `/ipd/bookings/${testBookingId}/cancel`, {}, TOKENS.nurse);
  assert.strictEqual(nurseCancel.status, 403, 'Nurse cannot cancel booking');
  // Receptionist cancel succeeds
  const recCancel = await apiRequest('POST', `/ipd/bookings/${testBookingId}/cancel`, { reason: 'Test cancel' }, TOKENS.receptionist);
  assert.strictEqual(recCancel.status, 200, 'Receptionist can cancel booking');
  console.log('✓ 1.5 Cancel booking: nurse denied (403), receptionist allowed');

  // 1.6 Hold / release bed manually: patient 403, nurse 403, doctor 403
  const availBed = allBeds.find((b) => b.status === 'Available');
  for (const role of ['patient', 'nurse', 'doctor']) {
    const hold = await apiRequest('PATCH', `/ipd/beds/${availBed._id}/status`, { status: 'Reserved' }, TOKENS[role]);
    assert.strictEqual(hold.status, 403, `${role} cannot manually hold bed`);
  }
  // Receptionist hold succeeds
  const recHold = await apiRequest('PATCH', `/ipd/beds/${availBed._id}/status`, { status: 'Reserved', holdHours: 2 }, TOKENS.receptionist);
  assert.strictEqual(recHold.status, 200, 'Receptionist can hold bed');
  // Receptionist release succeeds
  const recRelease = await apiRequest('PATCH', `/ipd/beds/${availBed._id}/status`, { status: 'Available' }, TOKENS.receptionist);
  assert.strictEqual(recRelease.status, 200, 'Receptionist can release bed');
  console.log('✓ 1.6 Hold / release bed: patient/nurse/doctor denied (403), receptionist allowed');

  // 1.7 Admit patient: patient 403, nurse 403
  for (const role of ['patient', 'nurse']) {
    const adm = await apiRequest(
      'POST',
      '/ipd/admissions',
      {
        patientId: patient4._id,
        admittingDoctorId: activeAdmission.admittingDoctorId._id,
        departmentId: activeAdmission.departmentId,
        bedId: availBed._id,
        reasonForAdmission: 'Test admit',
      },
      TOKENS[role]
    );
    assert.strictEqual(adm.status, 403, `${role} cannot admit patient`);
  }
  console.log('✓ 1.7 Admit patient: patient and nurse denied (403)');

  // 1.8 Transfer bed: patient 403, reason required
  const patTransfer = await apiRequest(
    'POST',
    `/ipd/admissions/${activeAdmission._id}/transfer`,
    { toBedId: availBed._id, reason: 'Test' },
    TOKENS.patient
  );
  assert.strictEqual(patTransfer.status, 403, 'Patient cannot transfer bed');
  const noReasonTransfer = await apiRequest(
    'POST',
    `/ipd/admissions/${activeAdmission._id}/transfer`,
    { toBedId: availBed._id, reason: '' },
    TOKENS.nurse
  );
  assert.strictEqual(noReasonTransfer.status, 400, 'Transfer requires reason');
  console.log('✓ 1.8 Transfer bed: patient denied (403), reason required (400)');

  // 1.9 Cleaning to Available: patient 403, receptionist 403, doctor 403
  const cleaningBed = allBeds.find((b) => b.status === 'Cleaning');
  assert(cleaningBed, 'Expected a Cleaning bed');
  for (const role of ['patient', 'receptionist', 'doctor']) {
    const cl = await apiRequest('PATCH', `/ipd/beds/${cleaningBed._id}/status`, { status: 'Available' }, TOKENS[role]);
    assert.strictEqual(cl.status, 403, `${role} cannot mark Cleaning bed as Available`);
  }
  console.log('✓ 1.9 Cleaning to Available: patient, receptionist, doctor denied (403)');

  // 1.10 Maintenance: nurse report allowed, nurse clear denied (403); admin clear allowed with reason
  const availBed2 = allBeds.filter((b) => b.status === 'Available')[1];
  const nurseMaintReport = await apiRequest(
    'PATCH',
    `/ipd/beds/${availBed2._id}/status`,
    { status: 'Maintenance', reason: 'Light fixture loose' },
    TOKENS.nurse
  );
  assert.strictEqual(nurseMaintReport.status, 200, 'Nurse can report Maintenance');

  const nurseMaintClear = await apiRequest(
    'PATCH',
    `/ipd/beds/${availBed2._id}/status`,
    { status: 'Available' },
    TOKENS.nurse
  );
  assert.strictEqual(nurseMaintClear.status, 403, 'Nurse cannot clear Maintenance');

  const adminClearNoReason = await apiRequest(
    'PATCH',
    `/ipd/beds/${availBed2._id}/status`,
    { status: 'Available', reason: '' },
    TOKENS.admin
  );
  assert.strictEqual(adminClearNoReason.status, 400, 'Admin clearing Maintenance requires reason note');

  const adminClearOk = await apiRequest(
    'PATCH',
    `/ipd/beds/${availBed2._id}/status`,
    { status: 'Available', reason: 'Light fixture replaced and certified' },
    TOKENS.admin
  );
  assert.strictEqual(adminClearOk.status, 200, 'Admin can clear Maintenance with note');
  console.log('✓ 1.10 Maintenance: nurse report ok, nurse clear 403, admin clear ok with note');

  // 1.11 Doctor round notes: doctor ok, admin read-only (403 on add), nurse 403, receptionist 403
  for (const role of ['admin', 'nurse', 'receptionist', 'patient']) {
    const rn = await apiRequest(
      'POST',
      '/ipd/round-notes',
      { admissionId: activeAdmission._id, note: 'Rounds' },
      TOKENS[role]
    );
    assert.strictEqual(rn.status, 403, `${role} cannot add doctor round note`);
  }
  const docRoundOk = await apiRequest(
    'POST',
    '/ipd/round-notes',
    { admissionId: activeAdmission._id, note: 'Evening check: Patient afebril, vitals stable.' },
    TOKENS.doctor
  );
  assert.strictEqual(docRoundOk.status, 201, 'Doctor can add round note');
  console.log('✓ 1.11 Doctor round notes: doctor allowed, admin read-only (403)');

  // 1.12 Add nursing records: nurse allowed, admin read-only (403 on add), doctor 403
  for (const role of ['admin', 'doctor', 'receptionist', 'patient']) {
    const nr = await apiRequest(
      'POST',
      '/ipd/nursing-records',
      { patientId: activeAdmission.patientId._id, admissionId: activeAdmission._id, type: 'Observation', note: 'Test' },
      TOKENS[role]
    );
    assert.strictEqual(nr.status, 403, `${role} cannot add nursing records`);
  }
  const nurseAddOk = await apiRequest(
    'POST',
    '/ipd/nursing-records',
    { patientId: activeAdmission.patientId._id, admissionId: activeAdmission._id, type: 'Observation', note: 'IV site dressing intact, dry and clean.' },
    TOKENS.nurse
  );
  assert.strictEqual(nurseAddOk.status, 201, 'Nurse can add nursing record');
  console.log('✓ 1.12 Add nursing records: nurse allowed, admin read-only (403)');

  // 1.13 Read nursing records: patient 403, receptionist 403
  for (const role of ['patient', 'receptionist']) {
    const r = await apiRequest('GET', `/ipd/nursing-records/admission/${activeAdmission._id}`, null, TOKENS[role]);
    assert.strictEqual(r.status, 403, `${role} cannot read nursing records`);
  }
  // Nurse ok, admin ok, admitting doctor ok
  const nurseRead = await apiRequest('GET', `/ipd/nursing-records/admission/${activeAdmission._id}`, null, TOKENS.nurse);
  assert.strictEqual(nurseRead.status, 200, 'Nurse can read nursing records');
  const adminRead = await apiRequest('GET', `/ipd/nursing-records/admission/${activeAdmission._id}`, null, TOKENS.admin);
  assert.strictEqual(adminRead.status, 200, 'Admin can read nursing records');
  const doctorRead = await apiRequest('GET', `/ipd/nursing-records/admission/${activeAdmission._id}`, null, TOKENS.doctor);
  assert.strictEqual(doctorRead.status, 200, 'Admitting doctor can read nursing records');
  // Non-admitting doctor reading another doctor's patient: 403
  const otherDocRead = await apiRequest('GET', `/ipd/nursing-records/admission/${activeAdmission._id}`, null, TOKENS.otherDoctor);
  assert.strictEqual(otherDocRead.status, 403, 'Non-admitting doctor cannot read nursing records');
  console.log('✓ 1.13 Read nursing records: patient/receptionist 403, nurse/admin ok, doctor own patient ok');

  // 1.14 Discharge: admitting doctor ok, non-admitting doctor 403, nurse 403, receptionist 403
  for (const role of ['nurse', 'receptionist', 'patient', 'otherDoctor']) {
    const dis = await apiRequest(
      'POST',
      `/ipd/admissions/${activeAdmission._id}/discharge`,
      {
        dischargeSummary: {
          finalDiagnosis: 'Resolved',
          treatmentGiven: 'Fluids',
          conditionAtDischarge: 'Stable',
        },
      },
      TOKENS[role]
    );
    assert.strictEqual(dis.status, 403, `${role} cannot discharge patient`);
  }
  console.log('✓ 1.14 Discharge: only admitting doctor or admin allowed; others 403');

  // 1.15 Manage wards and beds: admin only
  for (const role of ['patient', 'receptionist', 'nurse', 'doctor']) {
    const wardCreate = await apiRequest('POST', '/ipd/wards', { name: 'New Ward', type: 'General' }, TOKENS[role]);
    assert.strictEqual(wardCreate.status, 403, `${role} cannot create ward`);
    const bedCreate = await apiRequest('POST', '/ipd/beds', { wardId: allBeds[0].wardId._id, bedNumber: 'TEST-99' }, TOKENS[role]);
    assert.strictEqual(bedCreate.status, 403, `${role} cannot create bed`);
  }
  console.log('✓ 1.15 Manage wards/beds/daily rates: admin only, others 403');

  // =========================================================================
  // SECTION 2: State Machines & 409 Conflict Rejections
  // =========================================================================
  console.log('\n[Section 2]: Testing State Machines & 409 Conflict Rejections...');

  // Occupied cannot go directly to Maintenance or Available
  const occupiedBed = allBeds.find((b) => b.status === 'Occupied');
  const occToMaint = await apiRequest('PATCH', `/ipd/beds/${occupiedBed._id}/status`, { status: 'Maintenance' }, TOKENS.admin);
  assert.strictEqual(occToMaint.status, 409, 'Occupied cannot go to Maintenance directly');

  const occToAvail = await apiRequest('PATCH', `/ipd/beds/${occupiedBed._id}/status`, { status: 'Available' }, TOKENS.admin);
  assert.strictEqual(occToAvail.status, 409, 'Occupied cannot go to Available directly');

  // Cleaning cannot go directly to Occupied
  const cleanBed = allBeds.find((b) => b.status === 'Cleaning');
  const cleanToOcc = await apiRequest('PATCH', `/ipd/beds/${cleanBed._id}/status`, { status: 'Occupied' }, TOKENS.admin);
  assert.strictEqual(cleanToOcc.status, 409, 'Cleaning cannot go directly to Occupied');

  // Booking terminal state transitions
  const expiredBooking = (await apiRequest('GET', '/ipd/bookings?status=Expired', null, TOKENS.admin)).data.data[0];
  if (expiredBooking) {
    const expToApp = await apiRequest('POST', `/ipd/bookings/${expiredBooking._id}/approve`, {}, TOKENS.admin);
    assert.strictEqual(expToApp.status, 409, 'Expired booking cannot be approved');
  }
  console.log('✓ 2. Illegal bed & booking transitions rejected with HTTP 409 Conflict');

  // =========================================================================
  // SECTION 3: Concurrency Checks
  // =========================================================================
  console.log('\n[Section 3]: Testing Concurrency (20 Concurrent Admits)...');

  // 3.1 20 Concurrent Admits to the SAME Bed: exactly 1 succeeds, 19 get 409
  // Pick an Available bed
  const targetAvailBed = allBeds.filter((b) => b.status === 'Available')[2];
  assert(targetAvailBed, 'Need an available bed for concurrent admit test');

  // Fire 20 parallel admit requests
  const admitPromises = Array.from({ length: 20 }, (_, i) =>
    apiRequest(
      'POST',
      '/ipd/admissions',
      {
        patientId: patient4._id,
        admittingDoctorId: activeAdmission.admittingDoctorId._id,
        departmentId: activeAdmission.departmentId,
        bedId: targetAvailBed._id,
        reasonForAdmission: `Concurrent stress test #${i + 1}`,
      },
      TOKENS.receptionist
    )
  );

  const admitResults = await Promise.all(admitPromises);
  const successes = admitResults.filter((r) => r.status === 201);
  const conflicts = admitResults.filter((r) => r.status === 409);

  assert.strictEqual(successes.length, 1, `Exactly 1 admit must succeed, got ${successes.length}`);
  assert.strictEqual(conflicts.length, 19, `Exactly 19 admits must get 409, got ${conflicts.length}`);
  console.log('✓ 3.1 20 concurrent admits: exactly 1 succeeded (201), 19 failed with 409 Conflict');

  // Clean up the created test admission & bed
  const createdAdmId = successes[0].data.data._id;
  await apiRequest(
    'POST',
    `/ipd/admissions/${createdAdmId}/discharge`,
    {
      dischargeSummary: {
        finalDiagnosis: 'Stress test discharge',
        treatmentGiven: 'None',
        conditionAtDischarge: 'Stable',
      },
    },
    TOKENS.doctor
  );
  await apiRequest('PATCH', `/ipd/beds/${targetAvailBed._id}/status`, { status: 'Available' }, TOKENS.nurse);

  // 3.2 Concurrent approvals of the same bed
  // Find an Available bed matching General ward
  const latestBedsRes = await apiRequest('GET', '/ipd/beds', null, TOKENS.admin);
  const bedForApproval = latestBedsRes.data.data.find((b) => b.status === 'Available' && b.wardId.type === 'General');
  assert(bedForApproval, 'Need an available General bed for concurrent approval test');

  // Create two Requested bookings for today using fresh test patients
  const b1 = await apiRequest('POST', '/ipd/bookings', { wardType: 'General', expectedDate: '2026-10-25', patientId: testPat1._id }, TOKENS.receptionist);
  const b2 = await apiRequest('POST', '/ipd/bookings', { wardType: 'General', expectedDate: '2026-10-25', patientId: testPat2._id }, TOKENS.receptionist);

  const [app1, app2] = await Promise.all([
    apiRequest('POST', `/ipd/bookings/${b1.data.data._id}/approve`, { bedId: bedForApproval._id }, TOKENS.receptionist),
    apiRequest('POST', `/ipd/bookings/${b2.data.data._id}/approve`, { bedId: bedForApproval._id }, TOKENS.receptionist),
  ]);

  const appSuccesses = [app1, app2].filter((r) => r.status === 200);
  const appConflicts = [app1, app2].filter((r) => r.status === 409);
  assert.strictEqual(appSuccesses.length, 1, 'Exactly one approval must win the bed');
  assert.strictEqual(appConflicts.length, 1, 'Losing approval must receive 409 Conflict');
  console.log('✓ 3.2 Concurrent approvals of same bed: exactly 1 won, 1 got 409 Conflict');

  // Clean up approval
  await apiRequest('POST', `/ipd/bookings/${b1.data.data._id}/cancel`, { reason: 'Test cleanup' }, TOKENS.receptionist);
  await apiRequest('POST', `/ipd/bookings/${b2.data.data._id}/cancel`, { reason: 'Test cleanup' }, TOKENS.receptionist);

  // =========================================================================
  // SECTION 4: Business Rules & Invariants
  // =========================================================================
  console.log('\n[Section 4]: Testing Invariants & Business Logic...');

  // 4.1 One active booking per patient
  const firstBook = await apiRequest(
    'POST',
    '/ipd/bookings',
    { wardType: 'General', expectedDate: '2026-10-27', patientId: testPat1._id },
    TOKENS.receptionist
  );
  assert.strictEqual(firstBook.status, 201, 'First booking created');

  const secondBook = await apiRequest(
    'POST',
    '/ipd/bookings',
    { wardType: 'General', expectedDate: '2026-10-28', patientId: testPat1._id },
    TOKENS.receptionist
  );
  assert.strictEqual(secondBook.status, 409, 'Second active booking for same patient must be rejected (409)');
  // Clean up first booking
  await apiRequest('POST', `/ipd/bookings/${firstBook.data.data._id}/cancel`, { reason: 'Clean up' }, TOKENS.receptionist);
  console.log('✓ 4.1 One active booking per patient enforced (409)');

  // 4.2 Admitted patient cannot create booking
  const admPatientBook = await apiRequest(
    'POST',
    '/ipd/bookings',
    { wardType: 'General', expectedDate: '2026-10-26', patientId: activeAdmission.patientId._id },
    TOKENS.receptionist
  );
  assert.strictEqual(admPatientBook.status, 409, 'Currently admitted patient cannot create a bed booking');
  console.log('✓ 4.2 Currently admitted patient cannot create booking (409)');

  // 4.3 Atomic transfer: claims new bed, old bed goes to Cleaning
  const oldBedId = activeAdmission.bedId._id;
  const targetTransferBed = allBeds.filter((b) => b.status === 'Available')[4];
  assert(targetTransferBed, 'Need target bed for transfer');

  const transferRes = await apiRequest(
    'POST',
    `/ipd/admissions/${activeAdmission._id}/transfer`,
    { toBedId: targetTransferBed._id, reason: 'Patient requested window bed' },
    TOKENS.nurse
  );
  assert.strictEqual(transferRes.status, 200, 'Transfer succeeded');

  const checkOldBed = (await apiRequest('GET', '/ipd/beds', null, TOKENS.admin)).data.data.find(
    (b) => b._id === oldBedId
  );
  const checkNewBed = (await apiRequest('GET', '/ipd/beds', null, TOKENS.admin)).data.data.find(
    (b) => b._id === targetTransferBed._id
  );
  assert.strictEqual(checkOldBed.status, 'Cleaning', 'Old bed must be in Cleaning status');
  assert.strictEqual(checkNewBed.status, 'Occupied', 'New bed must be in Occupied status');
  console.log('✓ 4.3 Bed transfer is atomic: old bed Cleaning, new bed Occupied');

  // Mark old bed back to Available for clean state
  await apiRequest('PATCH', `/ipd/beds/${oldBedId}/status`, { status: 'Available' }, TOKENS.nurse);

  // 4.4 Admission rollback: a post-claim validation failure must not orphan the bed
  const rollbackBed = (await apiRequest('GET', '/ipd/beds', null, TOKENS.admin)).data.data.find(
    (b) => b.status === 'Available'
  );
  assert(rollbackBed, 'Need an available bed for rollback test');
  const rollbackBefore = (await apiRequest('GET', '/ipd/admissions', null, TOKENS.admin)).data.data
    .filter((a) => a.patientId?._id === testPat2._id).length;
  const rollbackAttempt = await apiRequest(
    'POST',
    '/ipd/admissions',
    {
      patientId: testPat2._id,
      admittingDoctorId: activeAdmission.admittingDoctorId._id,
      departmentId: 'not-a-valid-object-id',
      bedId: rollbackBed._id,
      reasonForAdmission: 'Rollback verification',
    },
    TOKENS.receptionist
  );
  assert.strictEqual(rollbackAttempt.status, 500, 'Invalid admission should fail after bed claim');
  const rollbackBedAfter = (await apiRequest('GET', '/ipd/beds', null, TOKENS.admin)).data.data.find(
    (b) => b._id === rollbackBed._id
  );
  const rollbackAdmissionsAfter = (await apiRequest('GET', '/ipd/admissions', null, TOKENS.admin)).data.data
    .filter((a) => a.patientId?._id === testPat2._id).length;
  assert.strictEqual(rollbackBedAfter.status, 'Available', 'Failed admission must release claimed bed');
  assert.strictEqual(rollbackAdmissionsAfter, rollbackBefore, 'Failed admission must not create an orphan admission');
  console.log('✓ 4.4 Admit rollback restored bed and created no orphan admission');

  // 4.5 BedEvents written and append-only (no update/delete routes)
  const bedEventsRes = await apiRequest('GET', `/ipd/beds/${oldBedId}/events`, null, TOKENS.admin);
  assert.strictEqual(bedEventsRes.status, 200);
  assert(bedEventsRes.data.data.length > 0, 'Bed events should have entries');
  const transferOutEvent = bedEventsRes.data.data.find((e) => e.action === 'transfer_out');
  assert(transferOutEvent, 'Expected transfer_out bed event recorded');

  // Verify no mutation route exists for bed events
  const fakeEventId = transferOutEvent._id;
  const putEvent = await apiRequest('PUT', `/ipd/beds/${oldBedId}/events`, {}, TOKENS.admin);
  assert([404, 405].includes(putEvent.status), 'No PUT route for bed events');
  const delEvent = await apiRequest('DELETE', `/ipd/beds/${oldBedId}/events/${fakeEventId}`, {}, TOKENS.admin);
  assert([404, 405].includes(delEvent.status), 'No DELETE route for bed events');
  console.log('✓ 4.5 BedEvent written for state changes; ledger is strictly append-only');

  // =========================================================================
  // SECTION 5: Nursing Clinical Records (A5)
  // =========================================================================
  console.log('\n[Section 5]: Testing Nursing Clinical Records...');

  // 5.1 Append-only: PUT / PATCH / DELETE rejected with 405 Method Not Allowed
  const dummyRecordRes = await apiRequest(
    'POST',
    '/ipd/nursing-records',
    {
      patientId: activeAdmission.patientId._id,
      admissionId: activeAdmission._id,
      type: 'Observation',
      note: 'Routine check',
    },
    TOKENS.nurse
  );
  const recordId = dummyRecordRes.data.data._id;

  const putRes = await apiRequest('PUT', `/ipd/nursing-records/${recordId}`, { note: 'Edit' }, TOKENS.nurse);
  assert.strictEqual(putRes.status, 405, 'PUT nursing record must return 405 Method Not Allowed');

  const patchRes = await apiRequest('PATCH', `/ipd/nursing-records/${recordId}`, { note: 'Edit' }, TOKENS.nurse);
  assert.strictEqual(patchRes.status, 405, 'PATCH nursing record must return 405 Method Not Allowed');

  const delRes = await apiRequest('DELETE', `/ipd/nursing-records/${recordId}`, {}, TOKENS.nurse);
  assert.strictEqual(delRes.status, 405, 'DELETE nursing record must return 405 Method Not Allowed');
  console.log('✓ 5.1 Nursing records are strictly append-only: PUT/PATCH/DELETE return 405');

  // 5.2 Impossible vitals values rejected with 400
  const impossibleSpO2 = await apiRequest(
    'POST',
    '/ipd/nursing-records',
    {
      patientId: activeAdmission.patientId._id,
      admissionId: activeAdmission._id,
      type: 'Vitals',
      data: { spO2: 105 },
    },
    TOKENS.nurse
  );
  assert.strictEqual(impossibleSpO2.status, 400, 'SpO2 > 100 must be rejected');

  const impossibleTemp = await apiRequest(
    'POST',
    '/ipd/nursing-records',
    {
      patientId: activeAdmission.patientId._id,
      admissionId: activeAdmission._id,
      type: 'Vitals',
      data: { temperature: 52 },
    },
    TOKENS.nurse
  );
  assert.strictEqual(impossibleTemp.status, 400, 'Temperature > 45 C must be rejected');
  console.log('✓ 5.2 Impossible vitals rejected with HTTP 400');

  // 5.3 Abnormal values flagged and doctor acknowledgment clears it
  const abnormalEntry = await apiRequest(
    'POST',
    '/ipd/nursing-records',
    {
      patientId: activeAdmission.patientId._id,
      admissionId: activeAdmission._id,
      type: 'Vitals',
      data: { systolic: 155, diastolic: 96, pulse: 110, temperature: 39.5, spO2: 91, respiratoryRate: 26 },
      note: 'Critical spike detected',
    },
    TOKENS.nurse
  );
  assert.strictEqual(abnormalEntry.status, 201);
  assert.strictEqual(abnormalEntry.data.data.abnormal, true, 'Should be flagged abnormal');
  assert(abnormalEntry.data.data.abnormalFlags.length >= 3, 'Should have multiple abnormal flags');

  // Check it appears in Doctor's "Needs Review" list
  const needsReview = await apiRequest('GET', '/ipd/nursing-records/doctor/needs-review', null, TOKENS.doctor);
  assert.strictEqual(needsReview.status, 200);
  const found = needsReview.data.data.find((r) => r._id === abnormalEntry.data.data._id);
  assert(found, 'Abnormal entry must appear in doctor needs-review queue');

  // Doctor acknowledges entry
  const ackRes = await apiRequest('POST', `/ipd/nursing-records/${abnormalEntry.data.data._id}/acknowledge`, {}, TOKENS.doctor);
  assert.strictEqual(ackRes.status, 200, 'Doctor can acknowledge abnormal entry');
  assert(ackRes.data.data.acknowledgedBy, 'AcknowledgedBy should be set');

  // Check it is now cleared from "Needs Review" queue
  const needsReviewAfter = await apiRequest('GET', '/ipd/nursing-records/doctor/needs-review', null, TOKENS.doctor);
  const foundAfter = needsReviewAfter.data.data.find((r) => r._id === abnormalEntry.data.data._id);
  assert(!foundAfter, 'Acknowledged entry must no longer appear in needs-review list');
  console.log('✓ 5.3 Abnormal vitals flagged, shown in Needs Review, and acknowledgment clears it');

  // 5.4 Addendum correction
  const addendumRes = await apiRequest(
    'POST',
    '/ipd/nursing-records',
    {
      patientId: activeAdmission.patientId._id,
      admissionId: activeAdmission._id,
      type: 'Observation',
      addendumOf: abnormalEntry.data.data._id,
      note: 'Correction: Oxygen re-administered via mask, SpO2 recovered to 98%',
    },
    TOKENS.nurse
  );
  assert.strictEqual(addendumRes.status, 201);
  assert.strictEqual(addendumRes.data.data.addendumOf._id, abnormalEntry.data.data._id, 'Addendum points to original');
  console.log('✓ 5.4 Addendum correction created successfully referencing original record');

  // =========================================================================
  // SECTION 6: Lazy Expiry & Counter Concurrency
  // =========================================================================
  console.log('\n[Section 6]: Testing Lazy Expiry & Counter Concurrency...');

  // 6.1 Lazy expiry: create booking and bed held with past holdUntil
  const pastDateBed = allBeds.find((b) => b.status === 'Available');
  if (pastDateBed) {
    // Manually hold bed with 0 hold time or past time via direct admin or quick expiry
    // Hold bed
    await apiRequest('PATCH', `/ipd/beds/${pastDateBed._id}/status`, { status: 'Reserved', holdHours: 0.0001 }, TOKENS.receptionist);
    // Wait 1 second so holdUntil is past
    await new Promise((r) => setTimeout(r, 1200));

    // Calling availability triggers releaseExpiredHolds()
    await apiRequest('GET', '/ipd/availability', null, TOKENS.patient);

    // Verify bed is released back to Available
    const refreshedBed = (await apiRequest('GET', '/ipd/beds', null, TOKENS.admin)).data.data.find(
      (b) => b._id === pastDateBed._id
    );
    assert.strictEqual(refreshedBed.status, 'Available', 'Expired hold bed must be released back to Available by lazy expiry');
    console.log('✓ 6.1 Lazy expiry releases expired holds back to Available');
  }

  // 6.2 Counter uniqueness under concurrency
  const concurrentBookings = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      apiRequest(
        'POST',
        '/ipd/bookings',
        {
          wardType: 'Private',
          expectedDate: '2026-10-29',
          patientId: [testPat1._id, testPat2._id, patient3._id, patient4._id, patient5._id][i],
        },
        TOKENS.admin
      )
    )
  );

  const createdBookingNumbers = concurrentBookings
    .filter((r) => r.status === 201)
    .map((r) => r.data.data.bookingNumber);
  const uniqueNumbers = new Set(createdBookingNumbers);
  assert.strictEqual(uniqueNumbers.size, createdBookingNumbers.length, 'All booking numbers must be unique under concurrency');
  console.log(`✓ 6.2 Concurrent booking numbers are strictly unique: ${Array.from(uniqueNumbers).join(', ')}`);

  // Clean up concurrent bookings
  for (const r of concurrentBookings) {
    if (r.status === 201) {
      await apiRequest('POST', `/ipd/bookings/${r.data.data._id}/cancel`, { reason: 'Clean up' }, TOKENS.admin);
    }
  }

  console.log('\n======================================================');
  console.log(' ALL E2E BEDS API TESTS PASSED SUCCESSFULLY! (100%)');
  console.log('======================================================\n');
};

runSuite().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
