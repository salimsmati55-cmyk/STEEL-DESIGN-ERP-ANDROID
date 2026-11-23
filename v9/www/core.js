// STEEL DESIGN ERP V9 domain core — dependency-free business rules.
export const SCHEMA_VERSION = 1;
export const OPERATION_STATES = Object.freeze(["queued", "in_progress", "completed", "blocked"]);
export const STOCK_ZONES = Object.freeze(["A", "B", "C"]);
export const DEFAULT_OPERATIONS = Object.freeze(["laser", "shear", "bending", "assembly", "finishing"]);

const nowISO = () => new Date().toISOString();
const id = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
const required = (value, label) => {
  if (value === undefined || value === null || String(value).trim() === "") throw new Error(`${label} is required`);
  return value;
};
const nonNegative = (value, label) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be a non-negative number`);
  return n;
};
const clone = (value) => structuredClone(value);

export function createEvent(type, aggregateId, payload = {}, actorId = "system", at = nowISO()) {
  required(type, "Event type"); required(aggregateId, "Aggregate ID");
  return { id: id("EVT"), type, aggregateId, payload: clone(payload), actorId, at, schemaVersion: SCHEMA_VERSION };
}


export function createCustomer(input, at = nowISO()) {
  const name = String(required(input.name, "Customer name")).trim();
  const customer = { id: input.id ?? id("CUS"), name, phone: String(input.phone ?? "").trim(), address: String(input.address ?? "").trim(), notes: String(input.notes ?? "").trim(), createdAt: at, updatedAt: at, active: true, schemaVersion: SCHEMA_VERSION };
  return { customer, event: createEvent("CustomerCreated", customer.id, { name }, input.actorId, at) };
}

export function createSupplier(input, at = nowISO()) {
  const name = String(required(input.name, "Supplier name")).trim();
  const supplier = { id: input.id ?? id("SUP"), name, phone: String(input.phone ?? "").trim(), address: String(input.address ?? "").trim(), taxId: String(input.taxId ?? "").trim(), notes: String(input.notes ?? "").trim(), openBalance: 0, createdAt: at, updatedAt: at, active: true, schemaVersion: SCHEMA_VERSION };
  return { supplier, event: createEvent("SupplierCreated", supplier.id, { name }, input.actorId, at) };
}

export function updateParty(existing, input, kind, at = nowISO()) {
  if (!existing?.id) throw new Error("Existing contact is required");
  const name = String(required(input.name, "Name")).trim();
  if (!["customer", "supplier"].includes(kind)) throw new Error("Unknown contact type");
  const record = { ...clone(existing), name, phone: String(input.phone ?? "").trim(), address: String(input.address ?? "").trim(), notes: String(input.notes ?? "").trim(), updatedAt: at, version: (existing.version ?? 1) + 1 };
  if (kind === "supplier") record.taxId = String(input.taxId ?? "").trim();
  return { record, event: createEvent(kind === "supplier" ? "SupplierUpdated" : "CustomerUpdated", existing.id, { name }, input.actorId, at) };
}

export function createPurchase(supplier, input, at = nowISO()) {
  if (!supplier?.id) throw new Error("Supplier is required");
  const material = String(required(input.material, "Material")).trim();
  const quantity = nonNegative(input.quantity, "Quantity");
  if (quantity <= 0) throw new Error("Quantity must be greater than zero");
  const total = nonNegative(input.total, "Purchase total");
  if (total <= 0) throw new Error("Purchase total must be greater than zero");
  const paid = nonNegative(input.paid ?? 0, "Paid amount");
  if (paid > total) throw new Error("Paid amount cannot exceed purchase total");
  const purchase = { id: id("PUR"), supplierId: supplier.id, supplierName: supplier.name, invoiceNumber: String(input.invoiceNumber ?? "").trim(), material, thicknessMm: input.thicknessMm == null || input.thicknessMm === "" ? null : nonNegative(input.thicknessMm, "Thickness"), dimensionsMm: String(input.dimensionsMm ?? ""), quantity, unit: input.unit ?? "sheet", total, paid, balance: total - paid, purchasedAt: at, status: paid === total ? "paid" : paid > 0 ? "partial" : "unpaid", schemaVersion: SCHEMA_VERSION };
  const updatedSupplier = { ...supplier, openBalance: nonNegative(supplier.openBalance ?? 0, "Supplier balance") + purchase.balance, updatedAt: at, version: (supplier.version ?? 1) + 1 };
  return { purchase, supplier: updatedSupplier, event: createEvent("PurchaseRecorded", supplier.id, { purchaseId: purchase.id, total, paid, balance: purchase.balance, material, quantity }, input.actorId, at) };
}

export function recordSupplierPayment(supplier, input, at = nowISO()) {
  const amount = nonNegative(input.amount, "Payment amount");
  const outstanding = nonNegative(supplier?.openBalance ?? 0, "Supplier balance");
  if (amount <= 0) throw new Error("Payment must be greater than zero");
  if (amount > outstanding) throw new Error("Payment exceeds supplier balance");
  const payment = { id: id("SUPPAY"), kind: "supplier_payment", supplierId: supplier.id, supplierName: supplier.name, amount, method: input.method ?? "cash", reference: String(input.reference ?? ""), paidAt: at, schemaVersion: SCHEMA_VERSION };
  const updatedSupplier = { ...supplier, openBalance: outstanding - amount, updatedAt: at, version: (supplier.version ?? 1) + 1 };
  return { payment, supplier: updatedSupplier, event: createEvent("SupplierPaymentRecorded", supplier.id, { paymentId: payment.id, amount }, input.actorId, at) };
}

export function createJob(input, at = nowISO()) {
  required(input.customerName, "Customer");
  const items = (input.items?.length ? input.items : [input]).map((item, index) => ({
    id: item.id ?? id("ITEM"),
    description: String(item.description ?? item.service ?? "Manufactured item"),
    service: String(item.service ?? "custom"),
    material: String(item.material ?? ""),
    thicknessMm: item.thicknessMm === "" || item.thicknessMm == null ? null : nonNegative(item.thicknessMm, "Thickness"),
    dimensionsMm: String(item.dimensionsMm ?? item.dimensions ?? ""),
    quantity: Math.max(1, Math.floor(nonNegative(item.quantity ?? item.qty ?? 1, "Quantity"))),
    sketchAttachmentIds: [...(item.sketchAttachmentIds ?? [])],
    operations: (item.operations ?? input.operations ?? []).map((op, sequence) => ({
      id: op.id ?? id("OP"),
      code: typeof op === "string" ? op : op.code,
      sequence: sequence + 1,
      state: "queued",
      assignedWorkerId: null,
      assignedWorkerName: null,
      priority: op.priority ?? "normal",
      plannedStartAt: op.plannedStartAt ?? null,
      dueAt: op.dueAt ?? null,
      startedAt: null,
      startedBy: null,
      completedAt: null,
      completedBy: null,
      history: [],
      note: ""
    }))
  }));
  const job = {
    id: input.id ?? id("JOB"),
    jobNumber: input.jobNumber ?? null,
    customerId: input.customerId ?? null,
    customerName: String(input.customerName).trim(),
    customerPhone: String(input.customerPhone ?? ""),
    priority: input.priority ?? "normal",
    requestedAt: at,
    dueAt: input.dueAt ?? null,
    status: "open",
    items,
    estimateId: null,
    manufacturingOrderId: null,
    attachmentIds: [...(input.attachmentIds ?? [])],
    notes: String(input.notes ?? ""),
    version: 1,
    schemaVersion: SCHEMA_VERSION
  };
  return { job, event: createEvent("JobCreated", job.id, { itemCount: items.length }, input.actorId, at) };
}

export function scheduleOperation(job, itemId, operationId, input = {}, actorId = "manager", at = nowISO()) {
  if (!job?.id) throw new Error("Job is required");
  const next = clone(job);
  const item = next.items.find(x => x.id === itemId);
  if (!item) throw new Error("Item not found");
  const op = item.operations.find(x => x.id === operationId);
  if (!op) throw new Error("Operation not found");
  const priority = input.priority ?? op.priority ?? "normal";
  if (!["low", "normal", "high", "urgent"].includes(priority)) throw new Error("Invalid operation priority");
  const plannedStartAt = input.plannedStartAt === "" ? null : (input.plannedStartAt ?? op.plannedStartAt ?? null);
  const dueAt = input.dueAt === "" ? null : (input.dueAt ?? op.dueAt ?? null);
  if (plannedStartAt && dueAt && new Date(dueAt) < new Date(plannedStartAt)) throw new Error("Operation due date cannot be before planned start");
  op.assignedWorkerId = input.assignedWorkerId || null;
  op.assignedWorkerName = input.assignedWorkerName || null;
  op.priority = priority;
  op.plannedStartAt = plannedStartAt;
  op.dueAt = dueAt;
  op.updatedAt = at;
  next.version = (next.version ?? 1) + 1;
  return { job: next, event: createEvent("OperationScheduled", job.id, { itemId, operationId, assignedWorkerId: op.assignedWorkerId, priority, plannedStartAt, dueAt }, actorId, at) };
}

export function transitionOperation(job, itemId, operationId, nextState, actorId = "system", at = nowISO()) {
  if (!OPERATION_STATES.includes(nextState)) throw new Error("Unknown operation state");
  const next = clone(job);
  const item = next.items.find(x => x.id === itemId);
  if (!item) throw new Error("Item not found");
  const op = item.operations.find(x => x.id === operationId);
  if (!op) throw new Error("Operation not found");
  const allowed = { queued: ["in_progress", "blocked"], in_progress: ["completed", "blocked", "queued"], blocked: ["queued", "in_progress"], completed: [] };
  if (!allowed[op.state].includes(nextState)) throw new Error(`Invalid transition: ${op.state} → ${nextState}`);
  op.state = nextState;
  op.history = [...(op.history ?? []), { state: nextState, actorId, at }];
  if (nextState === "in_progress") { op.startedAt = at; op.startedBy = actorId; }
  if (nextState === "completed") { op.completedAt = at; op.completedBy = actorId; }
  next.version += 1;
  const all = next.items.flatMap(x => x.operations);
  next.status = all.length && all.every(x => x.state === "completed") ? "ready_for_delivery" :
    all.some(x => x.state === "in_progress") ? "in_production" : "open";
  return { job: next, event: createEvent("OperationStateChanged", job.id, { itemId, operationId, from: job.items.find(x => x.id === itemId).operations.find(x => x.id === operationId).state, to: nextState }, actorId, at) };
}

export function createManufacturingOrder(job, issuedBy = "system", at = nowISO()) {
  const operations = job.items.flatMap(item => item.operations.map(op => ({
    itemDescription: item.description, itemId: item.id, operationId: op.id,
    sequence: op.sequence, operation: op.code, state: op.state
  })));
  const of = {
    id: id("OF"), jobId: job.id, customerName: job.customerName,
    issuedAt: at, dueAt: job.dueAt,
    items: job.items.map(item => ({
      description: item.description, service: item.service, material: item.material,
      thicknessMm: item.thicknessMm, dimensionsMm: item.dimensionsMm, quantity: item.quantity,
      sketchAttachmentIds: [...item.sketchAttachmentIds]
    })),
    operations, notes: job.notes, issuedBy, schemaVersion: SCHEMA_VERSION
  };
  // Guardrail: commercial fields must never leak into a manufacturing order.
  for (const forbidden of ["price", "total", "paid", "balance", "cost", "currency"]) {
    if (Object.keys(of).some(key => key.toLowerCase().includes(forbidden))) throw new Error("Commercial field leaked into OF");
  }
  return of;
}

export function createCustomerReceipt(job, commercial, at = nowISO()) {
  const total = nonNegative(commercial.total, "Total");
  const paid = nonNegative(commercial.paid ?? 0, "Paid");
  if (paid > total) throw new Error("Paid amount cannot exceed total");
  return {
    id: id("BON"), jobId: job.id, customerName: job.customerName, issuedAt: at,
    lines: clone(commercial.lines ?? []),
    rawMaterialCost: nonNegative(commercial.rawMaterialCost ?? 0, "Raw material cost"),
    transport: nonNegative(commercial.transport ?? 0, "Transport"),
    total, paid, balance: total - paid,
    schemaVersion: SCHEMA_VERSION
  };
}

export function recordPayment(account, input, at = nowISO()) {
  const amount = nonNegative(input.amount, "Payment amount");
  if (amount <= 0) throw new Error("Payment must be greater than zero");
  const outstanding = nonNegative(account.total, "Account total") - nonNegative(account.paid ?? 0, "Paid");
  if (amount > outstanding) throw new Error("Payment exceeds outstanding balance");
  const payment = { id: id("PAY"), jobId: required(input.jobId, "Job ID"), amount, method: input.method ?? "cash", reference: input.reference ?? "", at, actorId: input.actorId ?? "system" };
  return { payment, account: { ...account, paid: Number(account.paid ?? 0) + amount, balance: outstanding - amount }, event: createEvent("PaymentRecorded", payment.jobId, { paymentId: payment.id, amount }, payment.actorId, at) };
}

export function receiveStock(input, at = nowISO()) {
  required(input.material, "Material");
  const quantity = nonNegative(input.quantity, "Quantity");
  if (quantity <= 0) throw new Error("Quantity must be greater than zero");
  if (!STOCK_ZONES.includes(input.zone ?? "A")) throw new Error("Invalid stock zone");
  const lot = { id: id("LOT"), receiptNumber: input.receiptNumber ?? id("REC"), supplierId: input.supplierId ?? null, supplierName: input.supplierName ?? "", material: input.material, thicknessMm: input.thicknessMm == null ? null : nonNegative(input.thicknessMm, "Thickness"), dimensionsMm: String(input.dimensionsMm ?? ""), quantity, remainingQuantity: quantity, unit: input.unit ?? "sheet", zone: input.zone ?? "A", receivedAt: at, schemaVersion: SCHEMA_VERSION };
  return { lot, event: createEvent("MaterialReceived", lot.id, { quantity, zone: lot.zone, material: lot.material }, input.actorId, at) };
}

export function moveStock(lot, input, at = nowISO()) {
  if (!STOCK_ZONES.includes(input.toZone)) throw new Error("Invalid destination zone");
  if (!STOCK_ZONES.includes(lot.zone)) throw new Error("Invalid source zone");
  const quantity = nonNegative(input.quantity ?? lot.remainingQuantity, "Move quantity");
  if (quantity <= 0 || quantity > lot.remainingQuantity) throw new Error("Move quantity exceeds available stock");
  const updatedLot = { ...lot, remainingQuantity: lot.remainingQuantity - quantity, version: (lot.version ?? 0) + 1 };
  const destinationLot = { ...clone(lot), id: id("LOT"), receiptNumber: lot.receiptNumber, quantity, remainingQuantity: quantity, zone: input.toZone, receivedAt: at, parentLotId: lot.id, version: 1 };
  return { sourceLot: updatedLot, destinationLot, event: createEvent("StockMoved", lot.id, { destinationLotId: destinationLot.id, from: lot.zone, to: input.toZone, quantity }, input.actorId, at) };
}


export function issueStockToJob(job, itemId, lot, input, at = nowISO()) {
  if (!job?.id || !lot?.id) throw new Error("Job and stock lot are required");
  if (lot.zone !== "B") throw new Error("Only approved stock in zone B can be issued to production");
  const quantity = nonNegative(input.quantity, "Issue quantity");
  if (quantity <= 0) throw new Error("Issue quantity must be greater than zero");
  const available = nonNegative(lot.remainingQuantity, "Available stock");
  if (quantity > available) throw new Error("Issue quantity exceeds available stock");
  const next = clone(job);
  const item = next.items.find(x => x.id === itemId);
  if (!item) throw new Error("Job item not found");
  if (String(item.material).trim().toLowerCase() !== String(lot.material).trim().toLowerCase()) throw new Error("Stock material does not match job item");
  if (item.thicknessMm != null && Number(item.thicknessMm) !== Number(lot.thicknessMm)) throw new Error("Stock thickness does not match job item");
  const issue = { id: id("ISS"), lotId: lot.id, material: lot.material, thicknessMm: lot.thicknessMm, quantity, unit: lot.unit, issuedAt: at, operationCode: input.operationCode ?? null, note: String(input.note ?? "") };
  item.materialIssues = [...(item.materialIssues ?? []), issue];
  next.version = (next.version ?? 1) + 1;
  const updatedLot = { ...lot, remainingQuantity: available - quantity, version: (lot.version ?? 0) + 1 };
  const movement = { id: id("MOV"), kind: "material_issue", lotId: lot.id, jobId: job.id, itemId, issueId: issue.id, fromZone: "B", toZone: null, quantity, unit: lot.unit, material: lot.material, at, schemaVersion: SCHEMA_VERSION };
  return { job: next, lot: updatedLot, movement, event: createEvent("MaterialIssuedToJob", job.id, { itemId, issueId: issue.id, lotId: lot.id, quantity, material: lot.material }, input.actorId, at) };
}


export function issueRemnantToJob(job, itemId, remnant, input, at = nowISO()) {
  if (!job?.id || !remnant?.id) throw new Error("Job and remnant are required");
  if (remnant.status !== "available" || Number(remnant.quantity) <= 0) throw new Error("Remnant is not available");
  const quantity = nonNegative(input.quantity ?? 1, "Remnant quantity");
  if (quantity <= 0 || quantity > remnant.quantity) throw new Error("Remnant quantity exceeds available pieces");
  const next = clone(job), item = next.items.find(x => x.id === itemId);
  if (!item) throw new Error("Job item not found");
  if (String(item.material).trim().toLowerCase() !== String(remnant.material).trim().toLowerCase()) throw new Error("Remnant material does not match job item");
  if (item.thicknessMm != null && Number(item.thicknessMm) !== Number(remnant.thicknessMm)) throw new Error("Remnant thickness does not match job item");
  const issue = { id: id("ISS"), remnantId: remnant.id, material: remnant.material, thicknessMm: remnant.thicknessMm, quantity, unit: "piece", issuedAt: at, source: "remnant", operationCode: input.operationCode ?? null };
  item.materialIssues = [...(item.materialIssues ?? []), issue];
  next.version = (next.version ?? 1) + 1;
  const updatedRemnant = { ...remnant, quantity: remnant.quantity - quantity, status: remnant.quantity - quantity === 0 ? "used" : "available", updatedAt: at, version: (remnant.version ?? 0) + 1 };
  const movement = { id: id("MOV"), kind: "remnant_issue", remnantId: remnant.id, jobId: job.id, itemId, issueId: issue.id, quantity, unit: "piece", material: remnant.material, at, schemaVersion: SCHEMA_VERSION };
  return { job: next, remnant: updatedRemnant, movement, event: createEvent("RemnantIssuedToJob", job.id, { itemId, remnantId: remnant.id, quantity }, input.actorId, at) };
}

export function recordRemnant(input, at = nowISO()) {
  required(input.material, "Material");
  const width = nonNegative(input.widthMm, "Remnant width");
  const length = nonNegative(input.lengthMm, "Remnant length");
  if (!width || !length) throw new Error("Remnant dimensions must be greater than zero");
  return { id: id("REM"), sourceJobId: input.sourceJobId ?? null, sourceLotId: input.sourceLotId ?? null, material: input.material, thicknessMm: nonNegative(input.thicknessMm, "Thickness"), widthMm: width, lengthMm: length, quantity: Math.max(1, Math.floor(nonNegative(input.quantity ?? 1, "Quantity"))), zone: input.zone ?? "B", status: "available", createdAt: at, schemaVersion: SCHEMA_VERSION };
}

export function summarizeWorkshop({ jobs = [], lots = [], payments = [] } = {}) {
  const operations = jobs.flatMap(j => j.items.flatMap(i => i.operations));
  return {
    openJobs: jobs.filter(j => !["ready_for_delivery", "delivered", "cancelled"].includes(j.status)).length,
    inProgressOperations: operations.filter(o => o.state === "in_progress").length,
    queuedOperations: operations.filter(o => o.state === "queued").length,
    readyForDelivery: jobs.filter(j => j.status === "ready_for_delivery").length,
    stockLots: lots.length,
    availableStockQuantity: lots.reduce((n, lot) => n + Number(lot.remainingQuantity ?? 0), 0),
    paymentCount: payments.length,
    collected: payments.reduce((n, p) => n + Number(p.amount), 0)
  };
}

export function validateMigrationSnapshot(snapshot) {
  const issues = [];
  if (!snapshot || typeof snapshot !== "object") return { valid: false, issues: ["Snapshot is not an object"] };
  for (const key of ["customers", "jobs", "stock", "payments"]) {
    if (snapshot[key] != null && !Array.isArray(snapshot[key])) issues.push(`${key} must be an array`);
  }
  const ids = new Set();
  for (const job of snapshot.jobs ?? []) {
    if (!job.id) issues.push("A legacy job has no ID");
    else if (ids.has(job.id)) issues.push(`Duplicate job ID: ${job.id}`);
    else ids.add(job.id);
  }
  return { valid: issues.length === 0, issues, counts: Object.fromEntries(["customers", "jobs", "stock", "payments"].map(k => [k, snapshot[k]?.length ?? 0])) };
}
