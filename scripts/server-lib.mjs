import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

import { loadProtocol } from "../src/config.mjs";
import { renderDocument } from "../src/document.mjs";

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2"
};

async function optionalText(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

async function handler(root, request, response) {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const renderMatch = pathname.match(/^\/render\/([a-z0-9.-]+)\/([a-z0-9-]+)$/);
  try {
    if (renderMatch) {
      const [, slug, template] = renderMatch;
      const protocol = await loadProtocol(root, slug);
      const css = await optionalText(join(root, `protocols/${slug}.css`));
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(renderDocument(template, protocol, css));
      return;
    }
    const extension = extname(pathname).toLowerCase();
    if (!MIME[extension] || pathname.includes("/.")) throw Object.assign(new Error(), { code: "ENOENT" });
    const relative = normalize(pathname).replace(/^[/\\]+/, "");
    const bytes = await readFile(join(root, relative));
    response.writeHead(200, { "content-type": MIME[extension], "cache-control": "no-store" });
    response.end(bytes);
  } catch (error) {
    const status = error.code === "ENOENT" ? 404 : 400;
    response.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
    response.end(status === 404 ? "Not found" : error.message);
  }
}

export function startServer(root, port = 4173) {
  const server = createServer((request, response) => handler(root, request, response));
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
