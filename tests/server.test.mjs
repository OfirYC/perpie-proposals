import assert from "node:assert/strict";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { startServer } from "../scripts/server-lib.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("render route serves inherited protocol HTML without exposing repository files", async t => {
  const server = await startServer(root, 0);
  t.after(() => server.close());
  const { port } = server.address();

  const rendered = await fetch(`http://127.0.0.1:${port}/render/vertex/groups`);
  const privateFile = await fetch(`http://127.0.0.1:${port}/.git/config`);

  assert.equal(rendered.status, 200);
  assert.match(await rendered.text(), /data-protocol="vertex"/);
  assert.equal(privateFile.status, 404);
});
