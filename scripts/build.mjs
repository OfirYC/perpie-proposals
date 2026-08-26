import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { buildProtocol, allSlugs } from "./build-lib.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const requested = process.argv[2];
if (!requested) throw new Error("Usage: npm run build -- <protocol-slug|--all>");
const slugs = requested === "--all" ? await allSlugs(root) : [requested];

for (const slug of slugs) {
  const manifest = await buildProtocol(root, slug);
  console.log(`${slug}: ${manifest.templates.length} images → dist/${slug}`);
}
