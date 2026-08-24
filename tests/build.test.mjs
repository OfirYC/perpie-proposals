import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";

import { buildProtocol } from "../scripts/build-lib.mjs";
import { startServer } from "../scripts/server-lib.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("unchanged source-backed frames render only the original artwork", async () => {
  const server = await startServer(root, 0);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 640 } });
    for (const id of ["transactional-miniapp", "batch-transactions", "notifications", "traders-tracker"]) {
      await page.goto(`http://127.0.0.1:${server.address().port}/render/vertex/${id}`);
      assert.equal(await page.locator(".source-art").count(), 1);
      assert.equal(await page.locator(".source-cleaner, .copy-mask, .cover-mask").count(), 0);
      assert.equal(await page.locator("main > h1").count(), 0);
      assert.equal(await page.locator("main").evaluate(element => getComputedStyle(element, "::after").display), "none");
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test("building Vertex writes exact-size PNGs, sliders, and manifest", { timeout: 120000 }, async () => {
  const outputRoot = await mkdtemp(join(tmpdir(), "perpie-build-"));

  const manifest = await buildProtocol(root, "vertex", outputRoot);
  const groups = await readFile(join(outputRoot, "vertex/images/groups.png"));
  const grants = await readFile(join(outputRoot, "vertex/images/400k-grants.png"));
  const agentEverywhere = await readFile(join(outputRoot, "vertex/images/agent-everywhere.png"));
  const features = await readFile(join(outputRoot, "vertex/features.html"), "utf8");
  const gallery = await readFile(join(outputRoot, "vertex/index.html"), "utf8");

  assert.equal(manifest.protocol, "vertex");
  assert.equal(manifest.templates.length, 18);
  assert.equal(groups.readUInt32BE(16), 1500);
  assert.equal(groups.readUInt32BE(20), 640);
  assert.equal(agentEverywhere.readUInt32BE(16), 1500);
  assert.equal(agentEverywhere.readUInt32BE(20), 640);
  assert.ok(grants.length > 1000);
  assert.match(features, /images\/agent-everywhere\.png/);
  assert.match(features, /images\/ai-feature\.png/);
  assert.match(features, /aria-label="Next slide"/);
  assert.match(gallery, /<header><img src="images\/logo\.png"/);
});
