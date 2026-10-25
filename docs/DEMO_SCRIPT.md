# Suman Hospital Demo Script

This script covers the modules currently enabled in
`client/src/config/modules.js`. Credentials are development-only.

## Demo credentials

All demo accounts use `password123`:

| Role | Email |
| --- | --- |
| Admin | `admin@sumanhospital.com` |
| Receptionist | `receptionist@sumanhospital.com` |
| Doctor | `dr.gauri.warhekar@sumanhospital.com` |
| Pharmacist | `pharmacist@sumanhospital.com` |
| Nurse | `nurse@sumanhospital.com` |
| Patient | `patient@sumanhospital.com` |

## Click path

1. Tour Home, Departments, Doctors, Health Insights, and Contact.
2. Register or log in as a patient, select a doctor/date/slot, and submit an appointment.
3. Log in as receptionist, open Patient Registry, register a walk-in, and open the live queue.
4. Check in an online appointment and confirm the queue shows the token and status.
5. Log in as the seeded doctor, open Clinical EMR, search the patient, create a visit, enter vitals/diagnosis, add a prescription, and finalize the visit.
6. Confirm the doctor sees only the doctor-owned clinical records and the patient sees only finalized records.
7. Log in as each remaining role and confirm the sidebar contains only its permitted enabled modules.
8. Attempt an unfinished URL such as `/portal/billing`, `/portal/pharmacy`, `/portal/ipd`, or `/portal/staff`; it should not resolve to a working module while the corresponding feature flag is false.

## Reset and start

```powershell
Set-Location 'D:\WT CP\server'
npm install
npm run seed
npm run dev
```

In a second PowerShell window:

```powershell
Set-Location 'D:\WT CP\client'
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification status

The client production build and changed-file diagnostics are verified. Full
browser and MongoDB Compass verification still needs to be run with MongoDB
available.
