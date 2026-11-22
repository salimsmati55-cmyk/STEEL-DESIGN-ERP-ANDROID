import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("V9 browser entry is connected to the repository-backed application", async () => {
  const html = await readFile(new URL("../www/index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../www/app-v9.js", import.meta.url), "utf8");
  assert.match(html, /src="\.\/app-v9\.js"/);
  assert.match(app, /from "\.\/core\.js"/);
  assert.match(app, /from "\.\/repository\.js"/);
  assert.match(app, /WorkshopRepository\.open\(/);
});

test("V9 UI provides separate customer receipt and payment workflows", async () => {
  const app = await readFile(new URL("../www/app-v9.js", import.meta.url), "utf8");
  assert.match(app, /Core\.createCustomerReceipt/);
  assert.match(app, /Core\.recordPayment/);
  assert.match(app, /id="bonClient"/);
  assert.match(app, /function paymentForm/);
  assert.match(app, /state\.estimates/);
});

test("customer receipt can be printed independently from manufacturing order", async () => {
  const app = await readFile(new URL("../www/app-v9.js", import.meta.url), "utf8");
  assert.match(app, /function printBon/);
  assert.match(app, /id="printBon"/);
});

test("V9 exposes customer, supplier, purchasing and supplier settlement workflows", async () => {
  const html = await readFile(new URL("../www/index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../www/app-v9.js", import.meta.url), "utf8");
  assert.match(html, /data-view="customers"/);
  assert.match(html, /data-view="suppliers"/);
  assert.match(app, /Core\.createCustomer/);
  assert.match(app, /Core\.createSupplier/);
  assert.match(app, /Core\.createPurchase/);
  assert.match(app, /Core\.recordSupplierPayment/);
  assert.match(app, /store:"stockLots"/);
});

test("production job detail includes controlled material issue and remnant flows", async () => {
 const app = await readFile(new URL("../www/app-v9.js", import.meta.url), "utf8");
 assert.match(app, /Core\.issueStockToJob/);
 assert.match(app, /Core\.recordRemnant/);
 assert.match(app, /store:"stockMovements"/);
 assert.match(app, /store:"remnants"/);
});

test("V9 displays remnant inventory and supports issuing remnants to production", async () => {
 const app = await readFile(new URL("../www/app-v9.js", import.meta.url), "utf8");
 assert.match(app, /Core\.issueRemnantToJob/);
 assert.match(app, /data-issue-remnant/);
 assert.match(app, /بقايا الصفائح القابلة للاستعمال/);
});
