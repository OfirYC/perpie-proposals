import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { loadProtocol } from "../src/config.mjs";
import { createNotionDraft } from "./notion-lib.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const [command, slug] = process.argv.slice(2);
if (command !== "create" || !slug) throw new Error("Usage: npm run notion:create -- <protocol-slug>");

const protocol = await loadProtocol(root, slug);
const warnings = [];
const page = await createNotionDraft(protocol, {
  token: process.env.NOTION_TOKEN,
  parentId: process.env.NOTION_PARENT_PAGE_ID,
  publicBaseUrl: process.env.PUBLIC_BASE_URL,
  // pivot images are uploaded straight to Notion when built locally, so the
  // new assets do not have to be live on PUBLIC_BASE_URL first
  assetDir: `${root}/dist/${protocol.slug}/images`,
  repoRoot: root,
  warnings
});
for (const warning of warnings) console.warn(`warning: ${warning}`);
console.log(page.url);
