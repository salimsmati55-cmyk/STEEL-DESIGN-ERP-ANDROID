// IndexedDB repository for the V9 local-first workshop database.
// Each domain record is stored independently; no shared full-state JSON overwrite.
export const V9_DB_NAME = "steel-design-erp-v9";
export const V9_DB_VERSION = 1;
export const V9_STORES = Object.freeze([
  "meta", "customers", "jobs", "estimates", "manufacturingOrders",
  "stockLots", "stockMovements", "remnants", "payments", "suppliers",
  "purchases", "employees", "attendance", "payroll", "attachments", "events"
]);

const requestResult = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
});
const transactionDone = tx => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  tx.onerror = () => reject(tx.error ?? new Error("Transaction failed"));
});

export class WorkshopRepository {
  constructor(db) { this.db = db; }

  static async open(name = V9_DB_NAME) {
    if (!globalThis.indexedDB) throw new Error("IndexedDB is unavailable in this environment");
    const request = indexedDB.open(name, V9_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of V9_STORES) {
        if (!db.objectStoreNames.contains(store)) {
          const options = store === "meta" ? { keyPath: "key" } : { keyPath: "id" };
          const objectStore = db.createObjectStore(store, options);
          if (store === "jobs") objectStore.createIndex("by-status", "status");
          if (store === "jobs") objectStore.createIndex("by-due-date", "dueAt");
          if (store === "stockLots") objectStore.createIndex("by-zone", "zone");
          if (store === "payments") objectStore.createIndex("by-job", "jobId");
          if (store === "events") objectStore.createIndex("by-aggregate", "aggregateId");
          if (store === "attachments") objectStore.createIndex("by-owner", "ownerId");
        }
      }
      const meta = request.transaction.objectStore("meta");
      meta.put({ key: "schemaVersion", value: V9_DB_VERSION });
      meta.put({ key: "createdBy", value: "STEEL DESIGN ERP V9" });
    };
    return new WorkshopRepository(await requestResult(request));
  }

  close() { this.db.close(); }

  async get(store, id) {
    this.#assertStore(store);
    const tx = this.db.transaction(store, "readonly");
    const result = await requestResult(tx.objectStore(store).get(id));
    await transactionDone(tx);
    return result ?? null;
  }

  async list(store, { index, query, direction = "next", limit = 1000 } = {}) {
    this.#assertStore(store);
    const tx = this.db.transaction(store, "readonly");
    const source = index ? tx.objectStore(store).index(index) : tx.objectStore(store);
    const request = source.openCursor(query ?? null, direction);
    const rows = [];
    await new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || rows.length >= limit) return resolve();
        rows.push(cursor.value);
        cursor.continue();
      };
    });
    await transactionDone(tx);
    return rows;
  }

  async put(store, record) {
    this.#assertStore(store);
    if (!record || typeof record !== "object") throw new Error("A record object is required");
    const tx = this.db.transaction(store, "readwrite");
    const key = await requestResult(tx.objectStore(store).put(structuredClone(record)));
    await transactionDone(tx);
    return key;
  }

  async remove(store, id) {
    this.#assertStore(store);
    const tx = this.db.transaction(store, "readwrite");
    await requestResult(tx.objectStore(store).delete(id));
    await transactionDone(tx);
  }

  // Atomic multi-store command. All writes commit together or none do.
  async commitCommand({ writes = [], deletes = [], event }) {
    const names = [...new Set([...writes.map(x => x.store), ...deletes.map(x => x.store), ...(event ? ["events"] : [])])];
    names.forEach(name => this.#assertStore(name));
    const tx = this.db.transaction(names, "readwrite", { durability: "strict" });
    try {
      for (const item of writes) tx.objectStore(item.store).put(structuredClone(item.record));
      for (const item of deletes) tx.objectStore(item.store).delete(item.id);
      if (event) tx.objectStore("events").put(structuredClone(event));
      await transactionDone(tx);
    } catch (error) {
      try { tx.abort(); } catch {}
      throw error;
    }
  }

  async exportSnapshot() {
    const snapshot = { format: "steel-design-v9-snapshot", schemaVersion: V9_DB_VERSION, exportedAt: new Date().toISOString(), stores: {} };
    for (const store of V9_STORES) snapshot.stores[store] = await this.list(store, { limit: 100000 });
    return snapshot;
  }

  // Imports only into a separate staging database. Never clears or overwrites the active DB.
  async importToStaging(snapshot, stagingName = `${V9_DB_NAME}-staging`) {
    if (snapshot?.format !== "steel-design-v9-snapshot" || snapshot.schemaVersion !== V9_DB_VERSION || !snapshot.stores) {
      throw new Error("Unsupported V9 snapshot format");
    }
    const staging = await WorkshopRepository.open(stagingName);
    try {
      const names = V9_STORES.filter(name => Array.isArray(snapshot.stores[name]));
      const tx = staging.db.transaction(names, "readwrite");
      for (const name of names) {
        const store = tx.objectStore(name);
        for (const record of snapshot.stores[name]) store.put(structuredClone(record));
      }
      await transactionDone(tx);
      return { databaseName: stagingName, importedStores: names, counts: Object.fromEntries(names.map(name => [name, snapshot.stores[name].length])) };
    } finally {
      staging.close();
    }
  }

  #assertStore(name) {
    if (!V9_STORES.includes(name)) throw new Error(`Unknown V9 store: ${name}`);
  }
}
