# V8 Operational MVP — Stage 2

**Branch:** v8-real-app  
**Status:** Initial operational shell and core order workflow committed. This is not a completed ERP release.

## Included
- Arabic RTL responsive application shell for tablet and desktop.
- IndexedDB application state and draft persistence.
- Conservative copy of the known V7.11 localStorage keys into the V8 records store; original localStorage values are not deleted.
- Automatic first-run import of V7.11 orders and customers into the V8 schema. Existing V8 orders/customers are merged by ID/name+phone rather than overwritten.
- Full raw V7.11 records and legacy modules (workers, attendance, suppliers, debts, payroll, catalogue, columns, press-brake settings, sequence, and draft) are retained in a separate IndexedDB archive for later module migration.
- Import is retry-safe when no V7.11 data is present yet; original localStorage is never cleared.
- Customer registration and customer quick suggestions during order entry.
- REC raw-material receipt entry and stock creation.
- Inventory tracking with the agreed A (receiving/waiting), B (approved for production), and C (finished/ready) locations, including location changes.
- Order entry for the workshop's six main service categories.
- Material, thickness, dimensions, quantity, notes, and expected completion date calculated from start date plus selected duration.
- Touch/stylus sketch canvas; sketch data is saved with the draft and order.
- Production status flow: New → In production → Ready → Complete.
- Separate OF document with no price fields and separate customer receipt with line price, raw material, transport, total, paid, and balance.
- JSON export/import for the V8 IndexedDB snapshot.
- Offline shell caching at the V8 root scope so the storage module is cached as well.
- Capacitor points to v8/www; Android workflow now runs on pushes to v8-real-app and supports manual dispatch.

## Data migration caution
The current migration stage preserves V7.11 values as raw serialized records. It does not yet translate the legacy order/customer schemas into V8's new order model. The old values remain in the original localStorage and in the copied V8 legacy records. Do not clear browser/app data during development.

## Validation state
- The IndexedDB module and local working copy of the app passed JavaScript syntax checks in the development container before the last print-flow adjustment.
- The branch has not yet reported a successful Android Actions build in the available status response.
- No Android device/browser end-to-end test has been completed.
- Thermal printer, label printer, LAN sync, inventory/REC, HR/payroll, suppliers, catalogue, and elevator steel-structure designer remain future stages.

## Next engineering steps
1. Run/inspect the Android Actions build and fix any build errors.
2. Browser runtime tests: create/reload order, draft recovery including sketch, status update, OF/BON printing, backup round-trip, and migration idempotence.
3. Test the V7.11 order/customer conversion and inspect the archived legacy modules on a real browser profile.
4. Continue inventory and REC workflows, then the other modules.
