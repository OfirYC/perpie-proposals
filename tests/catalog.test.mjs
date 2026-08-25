import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { loadProtocol } from "../src/config.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("every catalog protocol loads and points to a real logo", async () => {
  const catalog = JSON.parse(await readFile(join(root, "protocols/catalog.json"), "utf8"));
  for (const { slug } of catalog) {
    const protocol = await loadProtocol(root, slug);
    await access(join(root, protocol.logo));
  }
});
