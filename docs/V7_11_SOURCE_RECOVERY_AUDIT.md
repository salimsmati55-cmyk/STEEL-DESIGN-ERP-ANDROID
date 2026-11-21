# V7.11 Source Recovery Audit

**Date:** 2026-11-21  
**Source archive:** STEEL_DESIGN_ERP_ANDROID_V7_11_BUILD_PACKAGE.zip  
**Result:** Archive is readable and contains editable web application source.

## Files verified
- `www/index.html` — 175,215 bytes in the ZIP; contains the application UI, CSS and a large inline JavaScript application.
- `package.json` — Capacitor 8.6.2 dependencies and scripts.
- `capacitor.config.json` — app ID `com.steeldesign.erp`, app name and `www` web directory.
- `.github/workflows/android-apk.yml` — workflow intended to generate the Android project and build a debug APK.
- `README_AR.md` — documents V7.11 unified print preview and known Android printing limitation.

## Functional code observed
- Persistent records use browser `localStorage`: orders, customers, workers, sequence, draft, attendance, biometric/passkey data, face profiles, suppliers, supplier debts, payroll and catalogue.
- Draft form autosave is debounced by 300 ms.
- The source contains order rendering, REC/OF/customer receipt print routines, sketch canvas and photo attachments, supplier/payroll/attendance code, catalogue, and press-brake/column settings.
- A JavaScript syntax check of the inline application script completed without errors.

## Important limitations / risks
1. No native `android/` project is included; Capacitor is configured to generate it during CI.
2. No IndexedDB or separate database layer was found. Main records and image/sketch data use `localStorage`, which has storage quota and data-size risks for a workshop application.
3. Face recognition loads `face-api.js` and model weights from external CDN URLs; that feature is not fully offline.
4. README explicitly warns that the Android WebView print action depends on `window.print()` and that a native print bridge may be needed.
5. The package does not provide a Windows desktop wrapper or LAN synchronization implementation.
6. The source archive is a single-file web application rather than a modular source tree. It is editable, but should be refactored carefully with regression tests.

## Recommended V8 sequence
1. Preserve V7.11 unchanged as the recovery baseline.
2. Bring the recovered source into the V8 branch as a separately identified baseline.
3. Add durable database storage (IndexedDB or SQLite) and migration/backup/restore tests before adding more business features.
4. Implement and test the core order, production, REC, OF and BON CLIENT workflows.
5. Add reliable Android printing and offline asset/model handling.
6. Design LAN synchronization and Windows access only after defining a single source of truth and conflict handling.
7. Build and test APK on the target tablet; do not label a build V8 until acceptance checks pass.
