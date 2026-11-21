# STEEL DESIGN ERP V8.0 — Real Application Baseline

**Status:** V7.11 editable source archive recovered and audited; V8 implementation and APK build are not yet verified.  
**Branch:** `v8-real-app`  
**Rule:** Never label a build as V8 or distribute it as installable until the source project builds successfully and the resulting APK is tested on a real Android device.

## 1. Product goal

Build a working workshop ERP for Android tablet and Windows office use. It must be touch-friendly, offline-first, preserve data across app updates, and support a local-network workflow. This is a functional application, not a static mockup.

## 2. Core workshop workflow

- Customer record: customer name required; phone optional; quick lookup by phone/name.
- Services: laser cutting, shear cutting, bending, assembly, elevator cabins, and other services.
- Job/order record: service, material, thickness, dimensions, quantity, sketch/photo, notes, duration, and production status.
- Duration selection (for example one or two days) calculates the expected completion date automatically.
- Keep data entry fast; do not force workshop operators to enter calculations that are normally done by the worker.

## 3. Documents and financial separation

- **REC:** raw-material receipt/intake record.
- **OF:** one-page manufacturing order. It contains the work details, sketch and notes, but **never prices**.
- **BON CLIENT:** customer financial receipt showing item/service prices, raw-material amount where applicable, total, transport, amount paid, and remaining balance.
- Product labels: item type, quantity, material/thickness and barcode or QR code.
- OF and BON CLIENT print separately. Thermal receipt and label printers are supported targets.

## 4. Production management

- Track each order through its required operations: laser, shear, bending, assembly, and delivery/other steps.
- Show priority, responsible worker, status, and expected completion date.
- Preserve the principle that one order can contain multiple operations.
- Provide a clear workshop queue and a simple status update flow.

## 5. Sketch / KROKI

- Tablet pen drawing with a millimetre-grid background.
- Accurate dimension annotations and measurement tools.
- Manual photo attachment from the camera or gallery.
- Reusable library of common shapes and drawing templates.
- Do not reintroduce the removed 3D preview unless explicitly requested.

## 6. Inventory and material movement

- Material and thickness catalogue, standard sheet sizes plus custom dimensions.
- Track sheet remnants/offcuts.
- Stock locations:
  - **A:** received / waiting inspection.
  - **B:** approved and ready for production.
  - **C:** finished goods ready for delivery.
- Record movements and keep an audit trail.

## 7. Elevator and steel-shaft design scope

- Electric traction elevators with ropes.
- Begin with top-view/layout planning.
- Design the steel shaft structure manufactured in-house by sheet bending.
- Main column may use the workshop's special formed profile; uniform sheet thickness and a single-sheet construction are the current design constraints.
- Inputs must relate to shaft dimensions, counterweight position (rear or side), and door arrangement.
- CNC press-brake setup/calibration data may be saved; do not build a Punch & Die library.

## 8. Other management modules

- Employees, attendance, monthly wages.
- Supplier accounts and debts.
- Attendance camera/face recognition is a later feature requiring explicit privacy/security design and device testing; do not claim it is implemented by default.
- Internal catalogue for workshop products and customer presentations.
- Share an OF and its attached sketch with an assigned worker (for example via WhatsApp) where supported.

## 9. Data, deployment and reliability requirements

- Offline-first operation.
- Automatic saving and durable local database; closing/reopening the app must not erase orders or customer records.
- Backup and restore must be implemented and tested before production use.
- Android tablet app plus Windows office access.
- Local network synchronization is the intended workshop setup; define conflict handling and backup ownership before enabling multi-device writes.
- App updates must preserve existing user data and database schema migrations must be tested.
- Printing, search, calculations, document generation and export controls must perform real actions; no decorative/inert buttons.

## 10. Acceptance gates before calling it V8.0

1. Preserve the recovered V7.11 editable source archive as the baseline (the uploaded V1.1 APK is a compiled artifact, not the source project).
2. Identify the exact current web/app framework, database and Android wrapper.
3. Create a clean V8 source tree and document reproducible build steps.
4. Implement persistent storage and tested backup/restore.
5. Implement the order, REC, OF, BON CLIENT and production workflow.
6. Test calculations, date calculation, search, editing and deletion safeguards.
7. Test printing/export and sketch/photo attachments.
8. Build a signed or debug APK as appropriate, install it on the target tablet, and verify upgrade/data-retention behavior.
9. Publish source and build artifacts with version number and test report.

## 11. Current repository finding (2026-11-21)

The current repository contains a README, two ZIP build packages and a GitHub Actions workflow. The workflow extracts `STEEL_DESIGN_ERP_ANDROID_V7_11_BUILD_PACKAGE.zip`, runs npm/Capacitor setup, then builds an APK labelled V1.1. The uploaded `STEEL-DESIGN-ERP-APK-V1.1.zip` previously inspected in this project contained only `app-debug.apk`, not editable source files.

The uploaded V7.11 ZIP was opened and inspected: nine entries, including an editable single-file web application (`www/index.html`), Capacitor configuration, package manifest, Arabic README and build workflow. The inline JavaScript syntax check passed. It contains no native Android project. The source recovery audit is recorded in `docs/V7_11_SOURCE_RECOVERY_AUDIT.md`. The app relies on localStorage, its face-recognition assets load remotely, Android printing uses `window.print()` without a native bridge, and no LAN synchronization layer was found. These are audit findings, not completed V8 fixes. Do not assume that the existing workflow produces V8.

## 12. Next technical action

Preserve the recovered V7.11 archive unchanged as a baseline, then migrate it into a maintainable V8 structure. First priority is durable storage with migration and backup/restore tests; next are offline packaging and Android printing verification. Define LAN synchronization before implementing multi-device writes. Do not overwrite the `main` branch or legacy packages.
