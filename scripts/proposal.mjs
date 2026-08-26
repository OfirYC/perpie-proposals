// One command: protocol JSON -> rendered images -> Notion page.
//
//   npm run proposal -- nado
//   npm run proposal -- --all
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadProtocol } from "../src/config.mjs";
import { buildProtocol, allSlugs } from "./build-lib.mjs";
import { createNotionDraft } from "./notion-lib.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const requested = process.argv[2];
if (!requested) throw new Error("Usage: npm run proposal -- <protocol-slug|--all>");
const slugs = requested === "--all" ? await allSlugs(root) : [requested];

for (const slug of slugs) {
  const manifest = await buildProtocol(root, slug);
  console.log(`${slug}: ${manifest.templates.length} images → dist/${slug}`);
  const protocol = await loadProtocol(root, slug);
  const warnings = [];
  const page = await createNotionDraft(protocol, {
    token: process.env.NOTION_TOKEN,
    parentId: process.env.NOTION_PARENT_PAGE_ID,
    publicBaseUrl: process.env.PUBLIC_BASE_URL,
    assetDir: join(root, "dist", slug, "images"),
    repoRoot: root,
    warnings
  });
  for (const warning of warnings) console.warn(`  warning: ${warning}`);
  console.log(`${slug}: ${page.url}`);
}
