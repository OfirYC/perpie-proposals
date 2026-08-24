import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { startServer } from "./server-lib.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.PORT ?? 4173);
await startServer(root, port);
console.log(`Proposal renderer: http://127.0.0.1:${port}/render/vertex/groups`);
