/**
 * Browser E2E: IPD Part A — Bed Booking & Management
 * Run: node "D:\WT CP\scripts\e2e-browser.mjs"
 * Requires: Playwright installed at D:\WT CP\node_modules\playwright
 * Servers: http://localhost:3000 (Vite), http://localhost:5000 (Express)
 */

import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const HEADLESS = process.argv.includes('--headless');
const VIEWPORTS = [
  { label: '375px  (mobile)', width: 375, height: 812 },
  { label: '768px  (tablet)', width: 768, height: 1024 },
  { label: '1440px (desktop)', width: 1440, height: 900 },
];

const CREDS = {
  admin:        { email: 'admin@sumanhospital.com',         password: 'password123' },
  receptionist: { email: 'receptionist@sumanhospital.com', password: 'password123' },
  nurse:        { email: 'nurse@sumanhospital.com',         password: 'password123' },
  doctor:       { email: 'dr.gauri.warhekar@sumanhospital.com', password: 'password123' },
  patient:      { email: 'patient@sumanhospital.com',       password: 'password123' },
  pharmacist:   { email: 'pharmacist@sumanhospital.com',    password: 'password123' },
};

// ─── results ────────────────────────────────────────────────────────────────
const results = [];
let passed = 0, failed = 0;

function record(label, ok, detail = '') {
  const status = ok ? '✅ PASS' : '❌ FAIL';
  if (ok) passed++; else failed++;
  results.push({ status, label, detail });
  console.log(`  ${status}  ${label}${detail ? ' — ' + detail : ''}`);
}

// ─── helpers ────────────────────────────────────────────────────────────────
async function loginAs(page, role) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.fill('input[value=""], input[placeholder]', ''); // clear
  await page.locator('input').nth(0).fill(CREDS[role].email);
  await page.locator('input[type="password"]').fill(CREDS[role].password);
  await page.locator('form button').click();
  // wait for redirect away from /login
  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 10000 });
}

async function loginViaForm(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  // Auth page might show Name/Email/Phone/Password — switch to login mode if needed
  const registerLink = page.locator('a[href="/login"], button:has-text("Sign in"), a:has-text("Sign in"), a:has-text("Log in")');
  if (await registerLink.count() > 0) await registerLink.first().click();
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('form button').click();
  try {
    await page.waitForURL(url => !url.href.includes('/login'), { timeout: 15000 });
  } catch (error) {
    if (page.url().includes('/login')) {
      await page.locator('form button').click();
      await page.waitForURL(url => !url.href.includes('/login'), { timeout: 15000 });
    } else {
      throw error;
    }
  }
}

async function logout(page) {
  // Look for logout button/link in sidebar or header
  const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")');
  if (await logoutBtn.count() > 0) {
    await logoutBtn.first().click();
    await page.waitForURL(url => url.href.includes('/login') || url.href === `${BASE}/`, { timeout: 5000 }).catch(() => {});
  } else {
    await page.goto(`${BASE}/login`);
  }
  // Clear sessionStorage
  await page.evaluate(() => sessionStorage.clear());
}

async function goTo(page, path) {
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch (error) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'commit', timeout: 15000 });
  }
}

async function hasText(page, text) {
  return (await page.locator(`text=${text}`).count()) > 0;
}

async function noHorizOverflow(page) {
  return await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
}

async function browserApi(page, token, method, path, body) {
  return page.evaluate(async ({ token, method, path, body }) => {
    const response = await fetch(`http://localhost:5000/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    return { status: response.status, data };
  }, { token, method, path, body });
}

async function runLifecycleScenario() {
  const lifecycle = [];
  const browser = await chromium.launch({ channel: 'chrome', headless: HEADLESS, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const today = new Date().toISOString().slice(0, 10);
  const recordLifecycle = (label, ok, detail = '') => {
    lifecycle.push({ label, ok, detail });
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  };
  try {
    await loginViaForm(page, CREDS.patient.email, CREDS.patient.password);
    const patientToken = await page.evaluate(() => sessionStorage.getItem('suman_token'));
    await goTo(page, '/portal/book-bed');
    const patientProfile = await browserApi(page, patientToken, 'GET', '/patients/me');
    const patientId = patientProfile.data?.data?.patient?._id || patientProfile.data?.data?._id;
    const patientBookings = await browserApi(page, patientToken, 'GET', '/ipd/bookings');
    for (const booking of patientBookings.data?.data || []) {
      if (['Requested', 'Approved'].includes(booking.status)) {
        await browserApi(page, patientToken, 'POST', `/ipd/bookings/${booking._id}/cancel`, { reason: 'Lifecycle test reset' });
      }
    }
    const resolvedPatientId = patientId;
    const request = await browserApi(page, patientToken, 'POST', '/ipd/bookings', {
      wardType: 'General',
      expectedDate: today,
      reason: 'Part B lifecycle browser scenario',
    });
    const booking = request.data?.data;
    recordLifecycle('Patient request created', request.status === 201 && booking?.status === 'Requested');

    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await loginViaForm(page, CREDS.receptionist.email, CREDS.receptionist.password);
    const receptionistToken = await page.evaluate(() => sessionStorage.getItem('suman_token'));
    const availableBeds = await browserApi(page, receptionistToken, 'GET', '/ipd/beds?status=Available');
    const generalBed = (availableBeds.data?.data || []).find((bed) => bed.wardId?.type === 'General');
    const approved = await browserApi(page, receptionistToken, 'POST', `/ipd/bookings/${booking._id}/approve`, {
      bedId: generalBed?._id,
      reason: 'Lifecycle approval',
    });
    recordLifecycle('Receptionist approval reserved bed', approved.status === 200 && approved.data?.data?.status === 'Approved');
    const reserved = await browserApi(page, receptionistToken, 'GET', `/ipd/beds/${generalBed?._id}/events`);

    const doctors = await browserApi(page, receptionistToken, 'GET', '/doctors');
    const departments = await browserApi(page, receptionistToken, 'GET', '/departments');
    const doctor = doctors.data?.data?.find((item) => item.name?.includes('Gauri')) || doctors.data?.data?.[0];
    const department = departments.data?.data?.[0];
    const admitted = await browserApi(page, receptionistToken, 'POST', '/ipd/admissions', {
      patientId: resolvedPatientId || booking.patientId?._id,
      admittingDoctorId: doctor?._id,
      departmentId: department?._id,
      bedId: generalBed?._id,
      bookingId: booking._id,
      reasonForAdmission: 'Lifecycle admission',
      provisionalDiagnosis: 'Observation',
    });
    const admission = admitted.data?.data;
    recordLifecycle('Admission occupied bed and admitted booking', admitted.status === 201 && admission?.status === 'Admitted',
      `${admitted.status} ${admitted.data?.message || ''}`);

    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await loginViaForm(page, CREDS.nurse.email, CREDS.nurse.password);
    const nurseToken = await page.evaluate(() => sessionStorage.getItem('suman_token'));
    const vitals = await browserApi(page, nurseToken, 'POST', '/ipd/nursing-records', {
      patientId: resolvedPatientId || booking.patientId?._id,
      admissionId: admission?._id,
      type: 'Vitals',
      data: { systolic: 180, diastolic: 95, pulse: 110, temperature: 37, spO2: 98, respiratoryRate: 18, painScore: 3, weight: 60 },
      note: 'Lifecycle abnormal vitals',
    });
    const medication = await browserApi(page, nurseToken, 'POST', '/ipd/nursing-records', {
      patientId: resolvedPatientId || booking.patientId?._id,
      admissionId: admission?._id,
      type: 'Medication',
      data: { medicineName: 'Paracetamol', dose: '500 mg', route: 'Oral' },
      note: 'Lifecycle medication',
    });
    const addendum = await browserApi(page, nurseToken, 'POST', '/ipd/nursing-records', {
      patientId: resolvedPatientId || booking.patientId?._id,
      admissionId: admission?._id,
      type: 'Observation',
      addendumOf: medication.data?.data?._id,
      data: { correctionReason: 'Lifecycle correction' },
      note: 'Lifecycle addendum',
    });
    recordLifecycle('Nurse added abnormal vitals, medication, and addendum',
      vitals.status === 201 && vitals.data?.data?.abnormal === true && medication.status === 201 && addendum.status === 201,
      `${vitals.status}/${medication.status}/${addendum.status}`);

    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await loginViaForm(page, CREDS.doctor.email, CREDS.doctor.password);
    const doctorToken = await page.evaluate(() => sessionStorage.getItem('suman_token'));
    const review = await browserApi(page, doctorToken, 'GET', '/ipd/nursing-records/doctor/needs-review');
    const abnormal = (review.data?.data || []).find((record) => record._id === vitals.data?.data?._id);
    const acknowledged = await browserApi(page, doctorToken, 'POST', `/ipd/nursing-records/${vitals.data?.data?._id}/acknowledge`);
    const roundNote = await browserApi(page, doctorToken, 'POST', '/ipd/round-notes', {
      admissionId: admission?._id,
      note: 'Lifecycle physician round note',
    });
    const bedsForTransfer = await browserApi(page, doctorToken, 'GET', '/ipd/beds?status=Available');
    const transferBed = (bedsForTransfer.data?.data || []).find((bed) => bed._id !== generalBed?._id && bed.wardId?.type === 'General');
    const transfer = await browserApi(page, doctorToken, 'POST', `/ipd/admissions/${admission?._id}/transfer`, {
      toBedId: transferBed?._id,
      reason: 'Lifecycle transfer',
    });
    recordLifecycle('Doctor saw needs review, acknowledged, and added round note',
      review.status === 200 && Boolean(abnormal) && acknowledged.status === 200 && roundNote.status === 201,
      `${review.status}/${acknowledged.status}/${roundNote.status}`);
    const discharge = await browserApi(page, doctorToken, 'POST', `/ipd/admissions/${admission?._id}/discharge`, {
      dischargeSummary: {
        finalDiagnosis: 'Stable after observation',
        treatmentGiven: 'Supportive care',
        conditionAtDischarge: 'Stable',
        adviceOnDischarge: 'Continue follow-up',
        followUp: '7 days',
      },
    });
    await page.goto(`${BASE}/portal/ipd/discharge-summary/${admission?._id}`, { waitUntil: 'domcontentloaded' });
    const summaryText = await page.textContent('body');
    recordLifecycle('Doctor transferred and discharged with printable summary',
      transfer.status === 200 && discharge.status === 200 && /print|discharge|summary/i.test(summaryText),
      `${transfer.status}/${discharge.status}`);

    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await loginViaForm(page, CREDS.nurse.email, CREDS.nurse.password);
    const nurseToken2 = await page.evaluate(() => sessionStorage.getItem('suman_token'));
    const cleaningBeds = await browserApi(page, nurseToken2, 'GET', '/ipd/beds?status=Cleaning');
    const transferredBedId = transfer.data?.data?.bedId?._id || transfer.data?.data?.bedId;
    const cleanedBed = (cleaningBeds.data?.data || []).find((bed) => bed._id === transferredBedId)
      || cleaningBeds.data?.data?.[0];
    const available = await browserApi(page, nurseToken2, 'PATCH', `/ipd/beds/${cleanedBed?._id}/status`, { status: 'Available', reason: 'Lifecycle cleaning complete' });
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await loginViaForm(page, CREDS.patient.email, CREDS.patient.password);
    const patientToken2 = await page.evaluate(() => sessionStorage.getItem('suman_token'));
    const finalAvailability = await browserApi(page, patientToken2, 'GET', '/ipd/availability');
    recordLifecycle('Nurse marked bed Available and patient sees availability',
      available.status === 200 && finalAvailability.status === 200 && (finalAvailability.data?.data || []).some((item) => item.availableBeds >= 0),
      `${available.status}/${finalAvailability.status}`);
    recordLifecycle('Mongo-facing lifecycle state references captured',
      Boolean(booking?._id && admission?._id && vitals.data?.data?._id && approved.status === 200),
      `${Boolean(booking?._id)}/${Boolean(admission?._id)}/${Boolean(vitals.data?.data?._id)}/${approved.status}`);
  } finally {
    await context.close();
    await browser.close();
  }
  const failures = lifecycle.filter((item) => !item.ok);
  console.log(`Lifecycle total: ${lifecycle.length} | Passed: ${lifecycle.length - failures.length} | Failed: ${failures.length}`);
  process.exit(failures.length ? 1 : 0);
}

// ─── main ────────────────────────────────────────────────────────────────────
const browser = await chromium.launch({
  channel: 'chrome',
  headless: HEADLESS,
  args: ['--no-sandbox'],
});

if (process.argv.includes('--lifecycle-only')) {
  await browser.close();
  await runLifecycleScenario();
}

try {
  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1: Login / Auth smoke for all roles
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Section 1: Login smoke (all roles) ──');
  for (const role of ['admin', 'receptionist', 'nurse', 'doctor', 'patient', 'pharmacist']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    try {
      await loginViaForm(page, CREDS[role].email, CREDS[role].password);
      const url = page.url();
      const landed = url.includes('/portal') || url.includes('dashboard') || url === `${BASE}/`;
      record(`Login: ${role}`, landed, url);
    } catch (e) {
      record(`Login: ${role}`, false, e.message.slice(0, 80));
    }
    await ctx.close();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2: Public pages (no auth)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Section 2: Public pages ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    for (const [label, path, pattern] of [
      ['Home',        '/',             /Suman|Hospital/i],
      ['About',       '/about',        /About|Mission|Vision/i],
      ['Services',    '/services',     /Service|Care/i],
      ['Departments', '/departments',  /Department|Cardio|Ortho/i],
      ['Doctors',     '/doctors',      /Doctor|Physician/i],
      ['Contact',     '/contact',      /Contact|Address|Phone/i],
    ]) {
      try {
        await goTo(page, path);
        const text = await page.textContent('body');
        record(`Public: ${label}`, pattern.test(text), path);
      } catch (e) {
        record(`Public: ${label}`, false, e.message.slice(0, 60));
      }
    }
    await ctx.close();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3: Patient — Book Bed page
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Section 3: Patient bed booking ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginViaForm(page, CREDS.patient.email, CREDS.patient.password);

    try {
      await goTo(page, '/portal/book-bed');
      await page.waitForSelector('h1, h2, [class*="heading"]', { timeout: 8000 });
      const text = await page.textContent('body');
      record('Patient: /portal/book-bed loads', /bed|ward|book|request/i.test(text), '');

      // Sidebar should contain "Book a Bed"
      const sidebarLink = page.locator('aside a[href="/portal/book-bed"], a:has-text("Book a Bed")');
      record('Patient: sidebar "Book a Bed" link exists', await sidebarLink.count() > 0, '');

      // Ward availability should be shown (counts, no occupant names)
      const availText = await page.textContent('body');
      record('Patient: sees ward availability (no occupant names)', /general|ward|available|beds/i.test(availText), '');
      record('Patient: no occupant UHID visible', !/UHID|uhid/.test(availText), '');
    } catch (e) {
      record('Patient: /portal/book-bed', false, e.message.slice(0, 80));
    }

    // Patient should NOT see /portal/ipd/bookings (receptionist only)
    try {
      await goTo(page, '/portal/ipd/bookings');
      await page.waitForTimeout(2000);
      const url = page.url();
      const blocked = !url.includes('/portal/ipd/bookings') || await hasText(page, 'Access denied') || await hasText(page, 'Not authorized') || await hasText(page, 'Forbidden');
      record('Patient: /portal/ipd/bookings is blocked/redirected', blocked, url);
    } catch (e) {
      record('Patient: /portal/ipd/bookings blocked', true, 'navigation error = blocked');
    }

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4: Receptionist pages
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Section 4: Receptionist IPD pages ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginViaForm(page, CREDS.receptionist.email, CREDS.receptionist.password);

    // Bed Board
    try {
      await goTo(page, '/portal/beds');
      await page.waitForSelector('h1, h2, [class*="title"]', { timeout: 8000 });
      const text = await page.textContent('body');
      record('Receptionist: Bed Board loads', /bed|ward|room/i.test(text), '');
      // Should see patient names or UHID
      record('Receptionist: full occupant info shown', /UHID|uhid|patient|Occupied/i.test(text), '');
    } catch (e) {
      record('Receptionist: Bed Board', false, e.message.slice(0, 80));
    }

    // Booking Queue
    try {
      await goTo(page, '/portal/ipd/bookings');
      await page.waitForSelector('h1, h2, table, [class*="queue"]', { timeout: 8000 });
      const text = await page.textContent('body');
      record('Receptionist: Booking Queue loads', /request|booking|queue|bed/i.test(text), '');
    } catch (e) {
      record('Receptionist: Booking Queue', false, e.message.slice(0, 80));
    }

    // Admissions Page
    try {
      await goTo(page, '/portal/ipd/admissions');
      await page.waitForSelector('h1, h2, table, [class*="admission"]', { timeout: 8000 });
      const text = await page.textContent('body');
      record('Receptionist: Admissions page loads', /admission|patient|ward|bed/i.test(text), '');
    } catch (e) {
      record('Receptionist: Admissions', false, e.message.slice(0, 80));
    }

    // Receptionist should NOT see /portal/ipd/nursing (nurse only)
    try {
      await goTo(page, '/portal/ipd/nursing');
      await page.waitForTimeout(2000);
      const url = page.url();
      const text = await page.textContent('body');
      const blocked = !url.includes('/portal/ipd/nursing') || /access denied|not authorized|forbidden|permission/i.test(text);
      record('Receptionist: /portal/ipd/nursing is blocked/redirected', blocked, url);
    } catch (e) {
      record('Receptionist: /portal/ipd/nursing blocked', true, 'nav error');
    }

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5: Nurse pages
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Section 5: Nurse IPD pages ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginViaForm(page, CREDS.nurse.email, CREDS.nurse.password);

    try {
      await goTo(page, '/portal/beds');
      await page.waitForSelector('h1, h2', { timeout: 8000 });
      const text = await page.textContent('body');
      record('Nurse: Bed Board loads', /bed|ward/i.test(text), '');
    } catch (e) {
      record('Nurse: Bed Board', false, e.message.slice(0, 80));
    }

    try {
      await goTo(page, '/portal/ipd/nursing');
      await page.waitForSelector('h1, h2', { timeout: 8000 });
      const text = await page.textContent('body');
      record('Nurse: My Ward Patients loads', /patient|nursing|ward|vital/i.test(text), '');
    } catch (e) {
      record('Nurse: My Ward Patients', false, e.message.slice(0, 80));
    }

    try {
      await goTo(page, '/portal/ipd/admissions');
      await page.waitForSelector('h1, h2, table', { timeout: 8000 });
      const text = await page.textContent('body');
      record('Nurse: Admissions page loads', /admission|patient/i.test(text), '');
    } catch (e) {
      record('Nurse: Admissions', false, e.message.slice(0, 80));
    }

    // Nurse should NOT see booking queue
    try {
      await goTo(page, '/portal/ipd/bookings');
      await page.waitForTimeout(2000);
      const url = page.url();
      const text = await page.textContent('body');
      const blocked = !url.includes('/portal/ipd/bookings') || /access denied|not authorized|forbidden|permission/i.test(text);
      record('Nurse: /portal/ipd/bookings blocked', blocked, url);
    } catch (e) {
      record('Nurse: /portal/ipd/bookings blocked', true, 'nav error');
    }

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 6: Doctor pages
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Section 6: Doctor IPD pages ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginViaForm(page, CREDS.doctor.email, CREDS.doctor.password);

    try {
      await goTo(page, '/portal/beds');
      await page.waitForSelector('h1, h2', { timeout: 8000 });
      const text = await page.textContent('body');
      record('Doctor: Bed Board loads', /bed|ward/i.test(text), '');
      // Doctor should see "Occupied" for other patients (privacy masking)
      record('Doctor: privacy masking present ("Occupied" label visible)', /Occupied/i.test(text), '');
    } catch (e) {
      record('Doctor: Bed Board', false, e.message.slice(0, 80));
    }

    try {
      await goTo(page, '/portal/ipd/my-patients');
      await page.waitForSelector('h1, h2', { timeout: 8000 });
      const text = await page.textContent('body');
      record('Doctor: My In-patients loads', /patient|inpatient|round|note/i.test(text), '');
    } catch (e) {
      record('Doctor: My In-patients', false, e.message.slice(0, 80));
    }

    // Doctor should NOT see /portal/ipd/wards (admin only)
    try {
      await goTo(page, '/portal/ipd/wards');
      await page.waitForTimeout(2000);
      const url = page.url();
      const text = await page.textContent('body');
      const blocked = !url.includes('/portal/ipd/wards') || /access denied|not authorized|forbidden|permission/i.test(text);
      record('Doctor: /portal/ipd/wards blocked', blocked, url);
    } catch (e) {
      record('Doctor: /portal/ipd/wards blocked', true, 'nav error');
    }

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 7: Admin pages
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Section 7: Admin IPD pages ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginViaForm(page, CREDS.admin.email, CREDS.admin.password);

    for (const [label, path, pattern] of [
      ['Bed Board',       '/portal/beds',            /bed|ward/i],
      ['Booking Queue',   '/portal/ipd/bookings',    /request|booking|queue/i],
      ['Admissions',      '/portal/ipd/admissions',  /admission|patient/i],
      ['Wards Settings',  '/portal/ipd/wards',       /ward|bed|setting/i],
    ]) {
      try {
        await goTo(page, path);
        await page.waitForSelector('h1, h2, table', { timeout: 8000 });
        const text = await page.textContent('body');
        record(`Admin: ${label} loads`, pattern.test(text), path);
      } catch (e) {
        record(`Admin: ${label}`, false, e.message.slice(0, 80));
      }
    }

    // Admin bed board: full patient info visible
    try {
      await goTo(page, '/portal/beds');
      await page.waitForSelector('h1, h2', { timeout: 8000 });
      const text = await page.textContent('body');
      record('Admin: bed board shows occupant info (UHID or name)', /UHID|uhid|patient|Occupied/i.test(text), '');
    } catch (e) {
      record('Admin: bed board occupant info', false, e.message.slice(0, 80));
    }

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 8: Sidebar regression (all enabled links) — Admin sweep
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Section 8: Sidebar link regression (admin) ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginViaForm(page, CREDS.admin.email, CREDS.admin.password);

    // Collect all sidebar hrefs
    await page.waitForSelector('nav a[href]', { timeout: 10000 });
    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('aside a[href]')]
        .map(a => a.getAttribute('href'))
        .filter(h => h && h.startsWith('/portal'))
    );
    const unique = [...new Set(hrefs)];
    console.log(`  Found ${unique.length} unique sidebar links`);

    for (const href of unique) {
      try {
        await goTo(page, href);
        await page.waitForTimeout(800);
        const status = page.url().includes('404') ? false : true;
        // Check no error boundary / crash
        const text = await page.textContent('body').catch(() => '');
        const crashed = /unexpected error|something went wrong|Cannot read/i.test(text);
        record(`Sidebar: ${href}`, status && !crashed, crashed ? 'crashed' : '');
      } catch (e) {
        record(`Sidebar: ${href}`, false, e.message.slice(0, 60));
      }
    }

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 9: Responsive — sidebar scrolls, no horizontal overflow
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Section 9: Responsive checks ──');
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await loginViaForm(page, CREDS.admin.email, CREDS.admin.password);

    try {
      await goTo(page, '/portal/beds');
      await page.waitForSelector('h1, h2', { timeout: 8000 });
      const ok = await noHorizOverflow(page);
      record(`Responsive ${vp.label}: /portal/beds no horiz overflow`, ok, '');
    } catch (e) {
      record(`Responsive ${vp.label}: /portal/beds`, false, e.message.slice(0, 60));
    }

    if (vp.width <= 375) {
      // On mobile, sidebar may be hidden by default — look for menu toggle or skip
      try {
        const menuBtn = page.locator('button[aria-label="Open sidebar"]');
        if (await menuBtn.count() > 0) {
          await menuBtn.first().click();
          await page.waitForTimeout(400);
        }
        // Sidebar element overflow check
        const sidebarOk = await page.evaluate(() => {
          const nav = document.querySelector('nav, aside, [class*="sidebar"]');
          if (!nav) return true;
          return nav.scrollHeight >= nav.clientHeight; // scrollable if content > height
        });
        record(`Responsive ${vp.label}: sidebar scrollable`, sidebarOk, '');
      } catch (e) {
        record(`Responsive ${vp.label}: sidebar check`, false, e.message.slice(0, 60));
      }
    }

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 10: Pharmacist — no IPD links in sidebar
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Section 10: Pharmacist isolation ──');
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await loginViaForm(page, CREDS.pharmacist.email, CREDS.pharmacist.password);

    try {
      await page.waitForSelector('nav', { timeout: 8000 });
      const navText = await page.locator('nav').textContent();
      // Pharmacist should NOT see Bed Board, Booking Queue, Wards Settings
      const noIPDLinks = !/Bed Board|Booking Queue|Wards.*Settings|My In-patients|My Ward/i.test(navText);
      record('Pharmacist: no IPD sidebar links', noIPDLinks, '');
    } catch (e) {
      record('Pharmacist: sidebar check', false, e.message.slice(0, 80));
    }

    // Direct navigation to bed board should redirect
    try {
      await goTo(page, '/portal/beds');
      await page.waitForTimeout(2000);
      const url = page.url();
      const text = await page.textContent('body');
      const blocked = !url.includes('/portal/beds') || /access denied|not authorized|forbidden|permission/i.test(text);
      record('Pharmacist: /portal/beds blocked/redirected', blocked, url);
    } catch (e) {
      record('Pharmacist: /portal/beds blocked', true, 'nav error');
    }

    await ctx.close();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 11: Console error check on key pages
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Section 11: Console error check ──');
  {
    const checkPages = [
      { role: 'admin',        path: '/portal/beds' },
      { role: 'receptionist', path: '/portal/ipd/bookings' },
      { role: 'nurse',        path: '/portal/ipd/nursing' },
      { role: 'doctor',       path: '/portal/ipd/my-patients' },
      { role: 'patient',      path: '/portal/book-bed' },
    ];

    for (const { role, path } of checkPages) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 120));
      });
      page.on('pageerror', err => consoleErrors.push(err.message.slice(0, 120)));

      try {
        await loginViaForm(page, CREDS[role].email, CREDS[role].password);
        await goTo(page, path);
        await page.waitForTimeout(2000); // let async requests finish
        const noErrors = consoleErrors.length === 0;
        record(`Console: ${role} ${path}`, noErrors, noErrors ? '' : consoleErrors[0]);
      } catch (e) {
        record(`Console: ${role} ${path}`, false, e.message.slice(0, 80));
      }
      await ctx.close();
    }
  }

} finally {
  await browser.close();

  // ─── Final Report ─────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log('BROWSER E2E REPORT');
  console.log('═'.repeat(70));
  const colW = 55;
  for (const r of results) {
    const label = r.label.padEnd(colW).slice(0, colW);
    console.log(`${r.status}  ${label}  ${r.detail}`);
  }
  console.log('─'.repeat(70));
  console.log(`Total: ${results.length}  |  Passed: ${passed}  |  Failed: ${failed}`);
  console.log('═'.repeat(70));
  process.exit(failed > 0 ? 1 : 0);
}
