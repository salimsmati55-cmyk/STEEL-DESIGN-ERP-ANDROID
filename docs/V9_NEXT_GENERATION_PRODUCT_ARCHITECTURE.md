# STEEL DESIGN ERP — Next Generation (V9)

**Branch:** `v9-nextgen`  
**Base:** `v8-real-app`  
**Product direction:** Light interface, integrated workflow, complete workshop scope.  
**Status:** New-generation functional prototype; not a production release and not yet data-migrated.

## Product change — not a theme refresh

V9 changes the operating model from disconnected pages to one job-centric workshop system. The customer request is the root business object. Every quote, manufacturing order, operation, stock reservation, document, delivery and payment is linked to that job. Users enter facts once; downstream records are derived from the same source.

## Operating model

1. **Customer request** — customer, requested service/items, material, thickness, dimensions, quantity, sketch/photo, notes and requested duration.
2. **Estimate** — item price, raw-material cost, transport and other costs; calculate selling total, paid amount and balance.
3. **Job packet** — create a unique job number and an OF that contains manufacturing instructions only. Prices must never appear on OF.
4. **Routing** — create ordered operations per item/job: laser, shear, bending, assembly, elevator/steel structure, finishing or custom operation. Each operation has a work centre, priority, assigned worker, planned start/due date and status.
5. **Material flow** — REC creates a receipt lot in A (received/waiting inspection); approval moves it to B (ready for production); finished goods move to C (ready for delivery). Material reservations and offcuts must be traceable to jobs.
6. **Quality and delivery** — record checks, quantities accepted/rejected, delivery note and customer acknowledgement.
7. **Settlement** — BON CLIENT and invoice are generated from the commercial ledger, not the OF. Payments are separate transactions; remaining balance is calculated, never manually overwritten.

## Core entities

- Customer
- Job / JobItem
- Estimate / EstimateLine
- Operation / WorkCenter / Assignment
- Material / StockLot / StockMovement / Remnant
- Receipt (REC)
- ManufacturingOrder (OF)
- Delivery
- Payment / CustomerAccount
- Supplier / Purchase / SupplierPayment
- Employee / Attendance / Payroll
- Attachment / Sketch
- AuditEvent
- CatalogItem / DesignTemplate
- MachineProfile / PressBrakeCalibration

Every entity receives an immutable ID, created/updated timestamps and schema version. Job numbers and document numbers are human-readable sequences but are not database primary keys.

## Event-driven workflow

Record business events such as `JobCreated`, `EstimateApproved`, `OperationStarted`, `OperationCompleted`, `MaterialReceived`, `MaterialMoved`, `QualityAccepted`, `DeliveryCompleted` and `PaymentRecorded`. Events create an audit trail and trigger derived updates (job progress, stock balance, overdue flags and customer balance). A correction is a new reversing/correcting event; never silently erase financial or stock history.

## Screens organized around work

- **Today / Control room:** urgent jobs, late operations, today's due dates, machine queues, stock alerts and unpaid balances.
- **Job workspace:** one timeline containing customer request, items, sketches, estimate, operations, documents, material and payments.
- **Dispatch board:** drag-free, touch-friendly operation cards grouped by work centre; workers see only assigned work and drawings.
- **Stock room:** A/B/C locations, sheet dimensions/thickness, lot traceability, remnant map and reservations.
- **Commercial desk:** estimates, BON CLIENT, invoices, payment history and customer account.
- **People & suppliers:** attendance, wages, supplier purchases and debts.
- **Design library:** workshop catalogue, elevator cabin/steel shaft references and reusable sketches.
- **Engineering tools:** bending calculations and press-brake calibration remain separate bounded modules; do not invent Cybelec model/file formats or a Punch & Die library.

## Data and deployment architecture

- Modular monolith with explicit domain modules and shared application services.
- Local-first persistence; a single authoritative local workshop database on the office PC for multi-device LAN mode.
- Android/tablet clients use an outbox queue and idempotent commands. They must not independently overwrite a shared full-state JSON blob.
- Each command has an ID, device ID, actor ID, timestamp and schema version.
- Conflict policy is domain-specific: stock and payments are append-only transactions; job notes may use field-level last-write with audit; operation transitions are validated server-side.
- Offline standalone mode is supported on a single device. LAN mode requires a reachable office host. Internet is not required for workshop operations.
- Backups are encrypted/exportable, versioned, validated before restore and tested through round-trip recovery.
- Attachments are stored as files/blobs with metadata and checksums, not large base64 strings in the main job record.
- Schema migrations are forward-only, repeatable and backed up first.

## Document rules

- REC: received raw material, supplier/source, dimensions, thickness, quantity, inspection and destination location.
- OF: job/customer reference, item, operation sequence, material, dimensions, quantity, sketch, notes, worker and due date. **No prices, payments or balances.**
- BON CLIENT: priced services/items, raw material when charged, transport, total, paid, balance and payment method.
- Delivery note: delivered items/quantities and customer acknowledgement.
- Label: job/item ID, material, thickness, quantity and QR code.

## Migration and safety

V9 is developed on a new branch from V8. Do not edit or delete `main`, `v8-real-app`, the V7.11 archive ZIP, or existing V8 database keys. Migration is a separate gated project:

1. Export and hash the V8 snapshot and retain the V7.11 raw archive.
2. Read V8 records without mutating them.
3. Map each legacy record to V9 entities, preserving original IDs and source payload references.
4. Produce a migration report with counts, rejected records and unresolved mappings.
5. Import into a staging database, compare totals and verify attachments/documents.
6. Only allow cutover after the user approves the report and restore has been tested.

Never clear browser/app data during development. Never label the V9 prototype as a production APK until automated tests, Android build and real-device upgrade/restore tests pass.

## Delivery milestones

- **V9-A — Job-centric core:** customer, job/items, multi-operation routing, IndexedDB repository, event log, dashboard, job workspace.
- **V9-B — Workshop execution:** work-centre dispatch, worker view, operation status, REC, A/B/C stock and remnants.
- **V9-C — Commercial documents:** estimate, price-separated OF, BON CLIENT, payments, delivery and print templates.
- **V9-D — People and suppliers:** attendance, payroll, supplier ledger and permissions.
- **V9-E — LAN and Android:** office host, tablet outbox, idempotent sync, attachments, printing and APK validation.
- **V9-F — Engineering and catalogue:** bending, elevator/steel-shaft design, product catalogue and reporting.

## Definition of done

A feature is done only when it works after reload, is covered by a test, respects permissions, creates an audit event, behaves offline as specified and does not damage existing V7.11/V8 data.
