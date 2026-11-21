# V8 Storage Foundation — Stage 1

**Status:** Initial IndexedDB adapter committed; not yet connected to the live V7.11 UI.

## Why this is a separate stage
V7.11 reads and writes synchronously through `localStorage`. IndexedDB is asynchronous. Replacing the browser storage API globally would risk breaking order creation, autosave, attendance, supplier records, and printing. V8 therefore introduces a deliberate data migration layer rather than silently swapping storage underneath the old code.

## Implemented in this stage
- Versioned IndexedDB database: `steel-design-erp-v8`.
- Separate `records` and `meta` object stores.
- Basic get/set/delete operations.
- Idempotent copy of all 14 known V7.11 storage keys into IndexedDB.
- Migration preserves each original serialized value exactly and does not delete legacy localStorage data.
- JSON snapshot export and atomic snapshot import with format/schema validation.

## Not yet implemented or verified
- The V7.11 screen and business logic still use localStorage; the adapter is not wired into the running app.
- No live browser/Android IndexedDB test has been run yet.
- No claim is made that existing records have already been migrated on the user's device.
- Image/sketch storage normalization and quota behavior still require design and device testing.

## Next gate
Build a browser test harness for migration idempotence, export/import round-trip, rollback on invalid backups, and preservation of every legacy key. Only after those tests pass should V8 screens switch to the adapter.
