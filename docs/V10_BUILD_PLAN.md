# STEEL DESIGN ERP V10 — Web Build

## Purpose
V10 is a new, isolated web application line based on the existing STEEL DESIGN ERP V9 web preview. The V9, V8, V7.11 and main branches are left unchanged.

## Current baseline
- Responsive Arabic RTL web shell for desktop, tablet and mobile.
- Job-centric workflow with customers, production dispatch, stock/REC, suppliers/purchases and accounts.
- IndexedDB repository with atomic multi-store writes, export and staging import.
- Kroki drawing canvas and photo attachments.
- PWA manifest and offline service worker.
- V10 uses its own IndexedDB database name: steel-design-erp-v10, so it does not open the V9 database.

## Important status
This is the V10 starting baseline, not a completed or verified release. The copied V9 workflows still need to be reconciled with the latest agreed STEEL DESIGN ERP rules and tested in a real browser and Android device.

## Next implementation gates
1. Align order creation and customer selection with the latest agreed workflow; remove the piece-description field from the visible new-order form while retaining legacy stored values.
2. Align stock to the approved single B zone and stock acceptance states; preserve old stock records without silently deleting them.
3. Complete supplier, payments, archive/delete protections and direct production completion controls.
4. Validate OF and BON CLIENT printing, labels, backup/restore, attachments and offline recovery.
5. Run browser tests and GitHub Actions Android build; only call APK ready after a successful build and device test.

## Entry point
Open `v10/www/index.html` through a static web host or local development server. Do not open it as a file URL if you want service-worker offline caching.
