import { TEMPLATES, renderTemplate } from "./templates.mjs";

export function renderDocument(id, protocol, protocolCss = "") {
  const template = TEMPLATES.find(item => item.id === id);
  if (!template) throw new Error(`Unknown template: ${id}`);
  if (/<\/?(?:style|script)|@import|url\s*\(\s*["']?https?:/i.test(protocolCss)) {
    throw new Error("Unsafe protocol CSS");
  }
  const scopedCss = protocolCss
    ? `[data-protocol="${protocol.slug}"] {${protocolCss}}`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${protocol.name} — ${id}</title>
  <link rel="stylesheet" href="/src/proposal.css">
  <style>html,body{width:${template.width}px;height:${template.height}px}${scopedCss}</style>
</head>
<body>${renderTemplate(id, protocol)}</body>
</html>`;
}
