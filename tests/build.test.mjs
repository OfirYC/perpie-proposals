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

test("source-backed copy masks continue the full-canvas protocol gradient", async () => {
  const server = await startServer(root, 0);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 640 } });
    await page.goto(`http://127.0.0.1:${server.address().port}/render/vertex/groups`);
    const mask = await page.locator(".copy-mask").evaluate(element => {
      const style = getComputedStyle(element, "::after");
      return { background: style.backgroundImage, width: style.width, blurredCopies: element.querySelectorAll(".source-blur").length };
    });

    assert.match(mask.background, /rgb\(205, 173, 239\).*rgb\(239, 173, 236\).*rgb\(205, 173, 239\)/);
    assert.equal(mask.width, "1500px");
    assert.equal(mask.blurredCopies, 0);
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
});
