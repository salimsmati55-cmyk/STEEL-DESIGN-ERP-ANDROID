/**
 * STEEL DESIGN ERP V8 storage foundation.
 *
 * Additive only: this module never deletes or rewrites legacy localStorage.
 * V7.11 UI is synchronous; integrate this adapter in a later migration step
 * before making IndexedDB the live source of truth.
 */
const DB_NAME = 'steel-design-erp-v8';
const DB_VERSION = 1;
const STORE_RECORDS = 'records';
const STORE_META = 'meta';

export const LEGACY_KEYS = Object.freeze([
  'steel_design_orders_v1', 'steel_design_customers_v1',
  'steel_design_workers_v1', 'steel_design_seq_v1',
  'steel_design_draft_v1', 'steel_design_attendance_v1',
  'steel_design_bio_v1', 'steel_design_face_profiles_v1',
  'steel_design_suppliers_v1', 'steel_design_supplier_debts_v1',
  'steel_design_payroll_v1', 'steel_design_catalogue_v1',
  'steel_design_columns_v1', 'steel_design_press_brake_settings_v1'
]);

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}
function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
  });
}

export function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(new Error('IndexedDB is not supported'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_RECORDS)) db.createObjectStore(STORE_RECORDS);
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error || new Error('Unable to open database'));
    request.onblocked = () => reject(new Error('Database upgrade is blocked by another open tab'));
  });
}

export async function getRecord(key) {
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE_RECORDS, 'readonly');
    const done = transactionDone(tx);
    const value = await requestResult(tx.objectStore(STORE_RECORDS).get(key));
    await done;
    return value;
  } finally { db.close(); }
}
export async function setRecord(key, value) {
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE_RECORDS, 'readwrite');
    const done = transactionDone(tx);
    tx.objectStore(STORE_RECORDS).put(value, key);
    await done;
    return true;
  } finally { db.close(); }
}
export async function removeRecord(key) {
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE_RECORDS, 'readwrite');
    const done = transactionDone(tx);
    tx.objectStore(STORE_RECORDS).delete(key);
    await done;
  } finally { db.close(); }
}

/** Idempotently copy known V7.11 keys; original localStorage is retained. */
export async function migrateLegacyLocalStorage(storage = globalThis.localStorage) {
  if (!storage) throw new Error('Legacy localStorage is unavailable');
  const db = await openDatabase();
  try {
    const tx = db.transaction([STORE_RECORDS, STORE_META], 'readwrite');
    const done = transactionDone(tx);
    const records = tx.objectStore(STORE_RECORDS);
    const meta = tx.objectStore(STORE_META);
    const marker = await requestResult(meta.get('legacy-v7-migration-v1'));
    let migrated = 0;
    for (const key of LEGACY_KEYS) {
      const raw = storage.getItem(key);
      if (raw === null) continue;
      const existing = await requestResult(records.get(key));
      if (existing !== undefined) continue;
      records.put({ raw, format: 'legacy-localStorage-json-or-text', migratedAt: new Date().toISOString() }, key);
      migrated += 1;
    }
    const completedAt = new Date().toISOString();
    if (migrated > 0 || marker?.complete) {
      meta.put({ complete: true, migrated: (marker?.migrated || 0) + migrated, completedAt, source: 'V7.11 localStorage' }, 'legacy-v7-migration-v1');
    }
    await done;
    return { migrated, skipped: migrated === 0, completedAt };
  } finally { db.close(); }
}

export async function exportDatabaseSnapshot() {
  const db = await openDatabase();
  try {
    const tx = db.transaction([STORE_RECORDS, STORE_META], 'readonly');
    const done = transactionDone(tx);
    const store = tx.objectStore(STORE_RECORDS);
    const [values, keys, metadata] = await Promise.all([
      requestResult(store.getAll()), requestResult(store.getAllKeys()),
      requestResult(tx.objectStore(STORE_META).getAll())
    ]);
    await done;
    const entries = Object.create(null);
    keys.forEach((key, i) => { entries[String(key)] = values[i]; });
    return {
      app: 'STEEL DESIGN ERP', format: 'steel-design-indexeddb-backup',
      schemaVersion: DB_VERSION, exportedAt: new Date().toISOString(),
      entries, metadata
    };
  } finally { db.close(); }
}

/** Atomically replace V8 records after validating the backup envelope. */
export async function importDatabaseSnapshot(snapshot) {
  if (!snapshot || snapshot.format !== 'steel-design-indexeddb-backup' ||
      snapshot.schemaVersion !== DB_VERSION || !snapshot.entries ||
      typeof snapshot.entries !== 'object' || Array.isArray(snapshot.entries)) {
    throw new Error('Invalid or incompatible V8 backup file');
  }
  const db = await openDatabase();
  try {
    const tx = db.transaction([STORE_RECORDS, STORE_META], 'readwrite');
    const done = transactionDone(tx);
    const records = tx.objectStore(STORE_RECORDS);
    records.clear();
    for (const [key, value] of Object.entries(snapshot.entries)) records.put(value, key);
    tx.objectStore(STORE_META).put({
      importedAt: new Date().toISOString(), sourceExportedAt: snapshot.exportedAt || null
    }, 'last-import');
    await done;
    return { imported: Object.keys(snapshot.entries).length };
  } finally { db.close(); }
}
