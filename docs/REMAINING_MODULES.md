# Remaining Modules

## Deployment readiness deviations

- Payment, insurance, lab/radiology, OT, ICU, notifications, mobile, websockets, custom domains, CI/CD, Docker, and paid hosting remain out of scope.
- Render/Vercel/Atlas account creation and dashboard clicks remain owner-operated; exact steps are in [DEPLOY.md](./DEPLOY.md).

Tier 0 keeps unfinished modules disabled through `client/src/config/modules.js`.
They must not be enabled until their complete workflow is implemented and verified
in a real browser at mobile, tablet, and desktop widths.

| Module | Already exists | Missing | Effort |
| --- | --- | --- | --- |
| Billing and finance | Server models, routes, invoice/payment/refund/report APIs, sidebar placeholder | Complete invoice, payment, receipt, refund, package, dues, report, and print UI | L |
| Pharmacy operations | Server stock, FEFO, alert, dispense, and adjustment APIs; inventory overview page | Medicine forms, receive stock, dispense workflow, adjustment UI, alert badge, invoice linking | L |
| IPD workflows | Wards, beds, booking/admission/transfer/discharge lifecycle, nursing records, round notes, and printable summary UI | Final billing integration remains deferred with Billing | S |
| Staff and HR | Server staff and doctor profile APIs; sidebar placeholder | Staff list, create/edit, temporary password, forced password change, deactivate/reactivate, own profile | L |
| Audit log | Permission entry exists | Capture service, sensitive clinical-view events, failed-login events, paginated admin viewer | L |
| Backup and restore | Permission entry exists | Node export/import, safety backup, lock, confirmation flow, download/restore UI and CLI | L |
| Security hardening | JWT expiry and auth rate limit | Login lockout, password policy, idle timeout, session-expiry UX | M |
| Validator coverage | Several routes validate inputs | Consistent express-validator coverage on every write endpoint | M |
| Automated tests | No complete test suite | RBAC, concurrency, billing math, inventory, bed, and password-hash tests on `hospital_db_test` | L |

## Out of scope for this build

Online payments, insurance/TPA, GST/accounting, payroll/attendance, lab/radiology,
OT, blood bank, multi-branch support, SMS/WhatsApp/email integrations, and a
mobile app.
