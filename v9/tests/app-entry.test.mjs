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
