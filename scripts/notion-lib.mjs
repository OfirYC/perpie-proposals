import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { PIVOT_SECTIONS } from "../src/pivot.mjs";
import { SLIDER_FILES, sliderUrl } from "../src/sliders.mjs";

const text = (content, link) => ({ type: "text", text: { content, link: link ? { url: link } : null } });
const paragraph = rich_text => ({ object: "block", type: "paragraph", paragraph: { rich_text } });
const heading = content => ({ object: "block", type: "heading_2", heading_2: { rich_text: [text(content)] } });
const image = (url, caption) => ({
  object: "block",
  type: "image",
  image: { type: "external", external: { url }, caption: caption ? [text(caption)] : [] }
});
const embed = url => ({ object: "block", type: "embed", embed: { url } });
const nativeBlock = block => {
  const allowed = ["heading_2", "heading_3", "paragraph", "bulleted_list_item"];
  if (!allowed.includes(block?.type) || typeof block.text !== "string" || !block.text.trim()) {
    throw new Error("Invalid protocol Notion block");
  }
  return { object: "block", type: block.type, [block.type]: { rich_text: [text(block.text)] } };
};

const copyRichText = (richText, context) => richText.map(item => {
  const copy = { type: item.type, annotations: item.annotations };
  copy[item.type] = item[item.type];
  if (item.type === "text") {
    copy.text = {
      ...item.text,
      content: item.text.content
        .replaceAll(context.sourceName, context.protocolName)
        .replaceAll(context.sourceSlug, context.protocolSlug)
    };
  }
  return copy;
});

async function listChildren(id, headers) {
  const blocks = [];
  let cursor;
  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${encodeURIComponent(id)}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);
    const response = await fetch(url, { headers });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message ?? `Notion returned ${response.status}`);
    blocks.push(...result.results);
    cursor = result.has_more ? result.next_cursor : undefined;
  } while (cursor);
  return blocks;
}


// A freshly added protocol has no GitHub Pages deploy yet, so a hosted URL would
// 404 and the page would render blank. Upload the built PNG straight to Notion
// when it exists on disk, and only fall back to the public URL when it does not.

// The sliders live on GitHub Pages, which only updates when master is pushed and
// the deploy workflow runs. Embedding an undeployed URL puts a visible 404 in a
// client-facing proposal, so probe it first and drop the block if it is not live.
async function reachable(url, cache) {
  if (cache.has(url)) return cache.get(url);
  let ok = false;
  try {
    const response = await fetch(url, { method: "GET", redirect: "follow" });
    ok = response.ok;
  } catch { ok = false; }
  cache.set(url, ok);
  return ok;
}


async function boardBlock(id, context) {
  return await assetBlock(id, context);
}

async function assetBlock(id, context) {
  const local = context.assetDir ? `${context.assetDir}/${id}.png` : null;
  if (local && existsSync(local)) {
    return {
      object: "block",
      type: "image",
      image: { type: "file_upload", file_upload: { id: await uploadAsset(local, context.headers, context.uploads) }, caption: [] }
    };
  }
  context.warnings?.push(`no local build for ${id}.png, falling back to ${context.root}`);
  return image(`${context.root}/images/${id}.png?v=${context.version}`, "");
}

async function cloneChildren(id, headers, context) {
  const result = [];
  for (const block of await listChildren(id, headers)) {
    if (block.type === "synced_block") {
      result.push(...await cloneChildren(block.id, headers, context));
      continue;
    }
    const cloned = await cloneBlock(block, headers, context);
    if (cloned) result.push(cloned);
  }
  return result;
}

async function cloneBlock(block, headers, context) {
  const { type } = block;
  const source = block[type];
  if (type === "image") {
    const asset = context.images[context.imageIndex++];
    if (!asset) throw new Error("Original proposal has more images than notion.sourceImages");
    return await boardBlock(asset, context);
  }
  if (type === "embed") {
    // The proposal's two carousels become one shared page parameterised by
    // protocol, so a new client needs no new slider file — only a push, which
    // CI turns into that protocol's images.
    const file = Object.keys(SLIDER_FILES).find(name => source.url.includes(`perpie-proposals/${name}`));
    if (file) {
      const set = SLIDER_FILES[file];
      // An animated GIF goes in as an *image* block, which Notion sizes to the
      // file's own aspect ratio — the embed block has no width/height in the API,
      // so an iframe carousel is always letterboxed inside a fixed square.
      const gif = context.assetDir ? join(context.assetDir.replace(/\/images$/, ""), `${set}.gif`) : null;
      if (gif && existsSync(gif)) {
        return {
          object: "block",
          type: "image",
          image: { type: "file_upload", file_upload: { id: await uploadAsset(gif, context.headers, context.uploads, "image/gif") }, caption: [] }
        };
      }
      const url = sliderUrl(context.site, context.protocolSlug, set);
      if (!await reachable(url, context.embeds)) {
        context.warnings?.push(`carousel unavailable (no ${set}.gif built, ${url} not deployed)`);
        return null;
      }
      context.warnings?.push(`no ${set}.gif (is ffmpeg installed?), used the hosted carousel instead`);
      return embed(url);
    }
    if (source.url.startsWith(context.root) && !await reachable(source.url, context.embeds)) {
      context.warnings?.push(`embed not reachable, omitted: ${source.url}`);
      return null;
    }
    return embed(source.url);
  }
  if (type === "divider") return { object: "block", type, divider: {} };
  if (!["paragraph", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item"].includes(type)) return null;
  const content = {
    rich_text: copyRichText(source.rich_text ?? [], context),
    color: source.color ?? "default"
  };
  if (block.has_children) content.children = await cloneChildren(block.id, headers, context);
  return { object: "block", type, [type]: content };
}


// ---------------------------------------------------------------- pivot inserts
const INLINE = /(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;

const richFromMarkdown = value => {
  const out = [];
  let last = 0;
  for (const match of value.matchAll(INLINE)) {
    if (match.index > last) out.push(text(value.slice(last, match.index)));
    const [raw, bold, italic] = match;
    const item = text(bold ? bold.slice(2, -2) : italic.slice(1, -1));
    item.annotations = bold ? { bold: true } : { italic: true };
    out.push(item);
    last = match.index + raw.length;
  }
  if (last < value.length) out.push(text(value.slice(last)));
  return out.length ? out : [text(value)];
};

async function uploadAsset(path, headers, cache, contentType = "image/png") {
  if (cache.has(path)) return cache.get(path);
  const start = await fetch("https://api.notion.com/v1/file_uploads", {
    method: "POST",
    headers,
    body: JSON.stringify({ filename: basename(path), content_type: contentType })
  });
  const created = await start.json();
  if (!start.ok) throw new Error(created.message ?? `Notion returned ${start.status}`);
  const form = new FormData();
  form.append("file", new Blob([await readFile(path)], { type: contentType }), basename(path));
  const sent = await fetch(created.upload_url, {
    method: "POST",
    headers: { authorization: headers.authorization, "notion-version": headers["notion-version"] },
    body: form
  });
  if (!sent.ok) throw new Error(`Notion upload returned ${sent.status}: ${(await sent.text()).slice(0, 300)}`);
  cache.set(path, created.id);
  return created.id;
}

async function pivotImage(id, context) {
  const local = context.assetDir ? `${context.assetDir}/${id}.png` : null;
  if (local && existsSync(local)) {
    return {
      object: "block",
      type: "image",
      image: { type: "file_upload", file_upload: { id: await uploadAsset(local, context.headers, context.uploads) }, caption: [] }
    };
  }
  return image(`${context.root}/images/${id}.png?v=${context.version}`, "");
}

async function compileSpec(spec, context) {
  const fill = value => value.replaceAll("{{PROTOCOL}}", context.protocolName);
  if (spec.divider) return [{ object: "block", type: "divider", divider: {} }];
  if (spec.img) return [await boardBlock(spec.img, context)];
  if (spec.h2) return [{ object: "block", type: "heading_2", heading_2: { rich_text: richFromMarkdown(fill(spec.h2)) } }];
  if (spec.h3) return [{ object: "block", type: "heading_3", heading_3: { rich_text: richFromMarkdown(fill(spec.h3)) } }];
  if (spec.p) return [paragraph(richFromMarkdown(fill(spec.p)))];
  if (spec.quote) return [{ object: "block", type: "quote", quote: { rich_text: richFromMarkdown(fill(spec.quote)) } }];
  if (spec.ul) return spec.ul.map(item => ({
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: { rich_text: richFromMarkdown(fill(item)) }
  }));
  throw new Error(`Unknown pivot spec: ${JSON.stringify(spec)}`);
}

const blockText = block => {
  const source = block[block.type];
  return (source?.rich_text ?? []).map(item => item.plain_text ?? item.text?.content ?? "").join("");
};

export async function applyPivot(children, context, sections = PIVOT_SECTIONS) {
  let result = children;
  for (const section of sections) {
    const compiled = [];
    for (const spec of section.blocks) compiled.push(...await compileSpec(spec, context));
    const index = result.findIndex(block => blockText(block).trim() === section.anchor);
    if (index === -1) {
      context.warnings?.push(`pivot anchor not found: "${section.anchor}"`);
      continue;
    }
    const at = section.position === "before" ? index : index + 1;
    result = [...result.slice(0, at), ...compiled, ...result.slice(at)];
  }
  return result;
}

export function buildNotionPayload(protocol, parentId, publicBaseUrl, now = new Date()) {
  const base = publicBaseUrl.replace(/\/$/, "");
  const root = `${base}/${protocol.slug}`;
  const version = now.getTime();
  const featureIds = ["partnership-banner", "groups", "selfcustody", "charts", "transactional-miniapp", "traders-tracker", "ai-feature", "notifications", "pnlcards", "batch-transactions", "referral-system"];
  return {
    parent: { page_id: parentId },
    icon: { type: "external", external: { url: `${root}/images/logo.png?v=${version}` } },
    cover: { type: "external", external: { url: `${root}/images/notion-cover.png?v=${version}` } },
    properties: {
      title: { type: "title", title: [text(protocol.notion?.title ?? `${protocol.name} Proposal — Draft ${now.toISOString().slice(0, 10)}`)] }
    },
    children: [
      heading(`${protocol.name} × Perpie`),
      paragraph([text(`A native, editable proposal for the ${protocol.name} whitelabel Telegram trading bot.`)]),
      heading("Partnership and product visuals"),
      ...featureIds.map(id => image(`${root}/images/${id}.png`, `${protocol.name}: ${id.replaceAll("-", " ")}`)),
      heading("Interactive galleries"),
      embed(`${root}/features.html`),
      embed(`${root}/social-features.html`),
      ...(protocol.notion?.blocks ?? []).map(nativeBlock),
      heading("Links"),
      paragraph([text("Open Telegram bot", protocol.links.bot), text(" · "), text("View generated assets on GitHub", protocol.links.github)])
    ]
  };
}

export async function createNotionDraft(protocol, options) {
  const { token, parentId, publicBaseUrl } = options;
  if (!token || !parentId || !publicBaseUrl) {
    throw new Error("NOTION_TOKEN, NOTION_PARENT_PAGE_ID, and PUBLIC_BASE_URL are required");
  }
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "notion-version": "2022-06-28"
  };
  const now = new Date();
  const payload = buildNotionPayload(protocol, parentId, publicBaseUrl, now);
  if (protocol.notion?.sourcePageId) {
    const context = {
      root: `${publicBaseUrl.replace(/\/$/, "")}/${protocol.slug}`,
      version: now.getTime(),
      images: protocol.notion.sourceImages ?? [],
      imageIndex: 0,
      sourceName: protocol.notion.sourceName ?? "Vertex",
      sourceSlug: protocol.notion.sourceSlug ?? "vertex",
      protocolName: protocol.name,
      protocolSlug: protocol.slug
    };
    context.site = publicBaseUrl.replace(/\/$/, "");
    context.headers = headers;
    context.uploads = options.uploads ?? new Map();
    context.assetDir = options.assetDir ?? null;
    context.warnings = options.warnings ?? [];
    context.embeds = new Map();
    context.protocol = protocol;
    context.repoRoot = options.repoRoot ?? null;
    payload.children = await cloneChildren(protocol.notion.sourcePageId, headers, context);
    if (context.imageIndex !== context.images.length) {
      throw new Error("notion.sourceImages does not match the original proposal image count");
    }
    if (protocol.notion?.pivot !== false) {
      payload.children = await applyPivot(payload.children, context);
    }
    // The page icon is the brand mark itself, not the rendered `logo` board: that
    // board crops the mark into a circular in-product avatar and flattens away the
    // alpha channel, so Notion — which mattes icons on white — showed a green
    // circle in a white box. The source file keeps the real shape and transparency.
    const brandMark = protocol.logo && context.repoRoot ? join(context.repoRoot, protocol.logo) : null;
    const icon = brandMark && existsSync(brandMark)
      ? brandMark
      : context.assetDir ? `${context.assetDir}/logo.png` : null;
    const cover = context.assetDir ? `${context.assetDir}/notion-cover.png` : null;
    for (const [key, path] of [["cover", cover], ["icon", icon]]) {
      if (!path || !existsSync(path)) continue;
      const mime = /\.jpe?g$/i.test(path) ? "image/jpeg" : "image/png";
      payload[key] = { type: "file_upload", file_upload: { id: await uploadAsset(path, headers, context.uploads, mime) } };
    }
  }
  const remaining = payload.children.splice(100);
  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message ?? `Notion returned ${response.status}`);
  for (let index = 0; index < remaining.length; index += 100) {
    const appended = await fetch(`https://api.notion.com/v1/blocks/${encodeURIComponent(result.id)}/children`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ children: remaining.slice(index, index + 100) })
    });
    const appendResult = await appended.json();
    if (!appended.ok) throw new Error(appendResult.message ?? `Notion returned ${appended.status}`);
  }
  return result;
}
