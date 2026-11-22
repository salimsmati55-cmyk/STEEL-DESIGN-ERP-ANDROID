import test from "node:test";
import assert from "node:assert/strict";
import {
  createJob, transitionOperation, createManufacturingOrder, createCustomerReceipt,
  recordPayment, receiveStock, moveStock, recordRemnant, summarizeWorkshop,
  validateMigrationSnapshot
} from "../www/core.js";

test("creates a job with stable item and operation identities", () => {
  const { job, event } = createJob({ customerName: "Workshop Customer", items: [{ description: "Panel", quantity: 3, operations: ["laser", "bending"] }] });
  assert.equal(job.items[0].quantity, 3);
  assert.equal(job.items[0].operations.length, 2);
  assert.equal(event.type, "JobCreated");
});

test("operation transitions are validated and update aggregate status", () => {
  const { job } = createJob({ customerName: "Customer", operations: ["laser"] });
  const item = job.items[0], op = item.operations[0];
  const started = transitionOperation(job, item.id, op.id, "in_progress");
  assert.equal(started.job.status, "in_production");
  const completed = transitionOperation(started.job, item.id, op.id, "completed");
  assert.equal(completed.job.status, "ready_for_delivery");
  assert.throws(() => transitionOperation(completed.job, item.id, op.id, "queued"), /Invalid transition/);
});

test("manufacturing order never contains commercial amounts", () => {
  const { job } = createJob({ customerName: "Customer", notes: "Cut and bend" });
  const of = createManufacturingOrder(job);
  const serialized = JSON.stringify(of).toLowerCase();
  for (const forbidden of ['"price"', '"total"', '"paid"', '"balance"', '"cost"']) assert.equal(serialized.includes(forbidden), false);
  assert.equal(of.jobId, job.id);
});

test("customer receipt separates totals and computes balance", () => {
  const { job } = createJob({ customerName: "Customer" });
  const receipt = createCustomerReceipt(job, { total: 12000, paid: 5000, rawMaterialCost: 3000, transport: 500 });
  assert.equal(receipt.balance, 7000);
  assert.throws(() => createCustomerReceipt(job, { total: 100, paid: 101 }), /cannot exceed/);
});

test("payments are append-only and cannot exceed outstanding amount", () => {
  const first = recordPayment({ total: 1000, paid: 0 }, { jobId: "JOB-1", amount: 400 });
  assert.equal(first.account.balance, 600);
  assert.throws(() => recordPayment(first.account, { jobId: "JOB-1", amount: 601 }), /exceeds/);
});

test("stock receipt and zone transfer preserve traceability", () => {
  const { lot } = receiveStock({ material: "Inox 304", quantity: 5, zone: "A" });
  const moved = moveStock(lot, { toZone: "B", quantity: 2 });
  assert.equal(moved.sourceLot.remainingQuantity, 3);
  assert.equal(moved.destinationLot.remainingQuantity, 2);
  assert.equal(moved.destinationLot.parentLotId, lot.id);
  assert.throws(() => moveStock(lot, { toZone: "C", quantity: 6 }), /exceeds/);
});

test("remnants are dimensioned reusable inventory", () => {
  const remnant = recordRemnant({ material: "Inox 304", thicknessMm: 1, widthMm: 420, lengthMm: 800 });
  assert.equal(remnant.status, "available");
  assert.throws(() => recordRemnant({ material: "Steel", thicknessMm: 2, widthMm: 0, lengthMm: 500 }), /greater than zero/);
});

test("dashboard aggregates operational metrics", () => {
  const { job } = createJob({ customerName: "Customer", operations: ["laser", "bending"] });
  const summary = summarizeWorkshop({ jobs: [job], lots: [{ remainingQuantity: 3 }], payments: [{ amount: 250 }] });
  assert.equal(summary.openJobs, 1);
  assert.equal(summary.queuedOperations, 2);
  assert.equal(summary.availableStockQuantity, 3);
  assert.equal(summary.collected, 250);
});

test("migration validator detects duplicate IDs without mutating source", () => {
  const snapshot = { customers: [], jobs: [{ id: "J1" }, { id: "J1" }], stock: [], payments: [] };
  const result = validateMigrationSnapshot(snapshot);
  assert.equal(result.valid, false);
  assert.ok(result.issues.some(x => x.includes("Duplicate")));
  assert.equal(snapshot.jobs.length, 2);
});

test("customer and supplier records validate and preserve identity on update", async () => {
  const { createCustomer, createSupplier, updateParty } = await import("../www/core.js");
  const c = createCustomer({ name: "Client", phone: "0550000000" });
  assert.equal(c.customer.name, "Client");
  assert.equal(c.event.type, "CustomerCreated");
  const s = createSupplier({ name: "Steel Supplier" });
  const updated = updateParty(s.supplier, { name: "Steel Supplier 2", phone: "0660000000", taxId: "T1" }, "supplier");
  assert.equal(updated.record.id, s.supplier.id);
  assert.equal(updated.record.name, "Steel Supplier 2");
  assert.equal(updated.record.taxId, "T1");
  assert.throws(() => createCustomer({ name: " " }), /required/);
});

test("purchases update supplier debt and supplier payments cannot exceed it", async () => {
  const { createSupplier, createPurchase, recordSupplierPayment } = await import("../www/core.js");
  const { supplier } = createSupplier({ name: "Supplier" });
  const purchase = createPurchase(supplier, { material: "Inox 304", quantity: 4, total: 12000, paid: 2000 });
  assert.equal(purchase.purchase.balance, 10000);
  assert.equal(purchase.supplier.openBalance, 10000);
  const paid = recordSupplierPayment(purchase.supplier, { amount: 2500 });
  assert.equal(paid.supplier.openBalance, 7500);
  assert.equal(paid.payment.kind, "supplier_payment");
  assert.throws(() => recordSupplierPayment(paid.supplier, { amount: 7501 }), /exceeds/);
  assert.throws(() => createPurchase(supplier, { material: "Sheet", quantity: 1, total: 100, paid: 101 }), /cannot exceed/);
});
