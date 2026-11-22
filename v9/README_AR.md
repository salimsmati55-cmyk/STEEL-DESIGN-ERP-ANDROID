# STEEL DESIGN ERP V9 — Next Generation Prototype

This is a separate, job-centric prototype developed on `v9-nextgen`, based on the approved product direction:
- Light interface
- Fully integrated workflow
- Complete workshop scope

## Open the prototype

Open `v9/www/index.html` from this branch through GitHub Pages or a local HTTP server. IndexedDB requires a browser origin; opening the file directly may not permit persistent storage in every browser.

## Implemented in this first vertical slice

- Independent V9 IndexedDB database (`steel-design-erp-v9-prototype`).
- Job-centric record with customer, item details, due-date calculation and multiple production operations.
- Operation status changes and a workshop dispatch board.
- REC material intake with A/B/C stock locations and location movement.
- Commercial totals, payment recording and remaining balance.
- Separate OF print (no prices) and BON CLIENT print (commercial values).
- Event history and V9-only JSON backup/restore.

## Explicitly not yet included

- No automatic import from V7.11 or V8.
- No V8 database writes, localStorage clearing or legacy data deletion.
- No multi-device LAN server/sync yet.
- No native Android APK build or device validation yet.
- No complete HR, supplier, payroll, CAD/bending or elevator design modules yet.
- No claim of production readiness.

## Safety

This is a development prototype. Do not use it as the sole record system for real customer jobs. Continue to preserve V7.11 and V8 backups. The migration path will be designed and tested separately before any legacy data is imported.
