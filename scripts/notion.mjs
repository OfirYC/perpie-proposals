import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { loadProtocol } from "../src/config.mjs";
import { createNotionDraft } from "./notion-lib.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const [command, slug] = process.argv.slice(2);
if (command !== "create" || !slug) throw new Error("Usage: npm run notion:create -- <protocol-slug>");

const protocol = await loadProtocol(root, slug);
const page = await createNotionDraft(protocol, {
  token: process.env.NOTION_TOKEN,
  parentId: process.env.NOTION_PARENT_PAGE_ID,
  publicBaseUrl: process.env.PUBLIC_BASE_URL
});
console.log(page.url);
