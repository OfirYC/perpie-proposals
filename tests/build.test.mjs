import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildProtocol } from "../scripts/build-lib.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("building Vertex writes exact-size PNGs, sliders, and manifest", { timeout: 120000 }, async () => {
  const outputRoot = await mkdtemp(join(tmpdir(), "perpie-build-"));

  const manifest = await buildProtocol(root, "vertex", outputRoot);
  const groups = await readFile(join(outputRoot, "vertex/images/groups.png"));
  const features = await readFile(join(outputRoot, "vertex/features.html"), "utf8");

  assert.equal(manifest.protocol, "vertex");
  assert.equal(manifest.templates.length, 14);
  assert.equal(groups.readUInt32BE(16), 1500);
  assert.equal(groups.readUInt32BE(20), 640);
  assert.match(features, /images\/ai-feature\.png/);
  assert.match(features, /aria-label="Next slide"/);
});
