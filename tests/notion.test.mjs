import assert from "node:assert/strict";
import test from "node:test";

import { buildNotionPayload, createNotionDraft } from "../scripts/notion-lib.mjs";

const protocol = {
  slug: "vertex",
  name: "Vertex",
  logo: "vertex/Logo.png",
  links: {
    bot: "https://t.me/vertex_protocol_bot",
    github: "https://github.com/ofirYC/perpie-proposals/tree/master/vertex"
  },
  notion: {
    blocks: [
      { "type": "heading_2", "text": "Our Proposal" },
      { "type": "heading_3", "text": "Integration Notes" },
      { "type": "paragraph", "text": "Vertex has multiple SDKs." },
      { "type": "bulleted_list_item", "text": "Cross-margin support" }
    ]
  }
};

test("Notion draft payload uses native blocks and hosted generated assets", () => {
  const payload = buildNotionPayload(protocol, "parent-id", "https://example.github.io/perpie", new Date("2026-08-24T12:00:00Z"));
  const types = payload.children.map(block => block.type);
  const serialized = JSON.stringify(payload);

  assert.equal(payload.parent.page_id, "parent-id");
  assert.equal(payload.properties.title.title[0].text.content, "Vertex Proposal — Draft 2026-08-24");
  assert.equal(payload.cover.external.url, "https://example.github.io/perpie/vertex/images/notion-cover.png?v=1787572800000");
  assert.ok(types.includes("heading_2"));
  assert.ok(types.includes("image"));
  assert.ok(types.includes("embed"));
  assert.ok(types.includes("heading_3"));
  assert.ok(types.includes("bulleted_list_item"));
  assert.match(serialized, /vertex\/features\.html/);
  assert.match(serialized, /Vertex has multiple SDKs/);
  assert.match(serialized, /https:\/\/t\.me\/vertex_protocol_bot/);
});

test("large protocol proposals are appended after the first Notion block chunk", async t => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return { ok: true, json: async () => calls.length === 1 ? { id: "page-id", url: "https://notion.so/page-id" } : {} };
  };
  const largeProtocol = {
    ...protocol,
    notion: {
      blocks: Array.from({ length: 101 }, (_, index) => ({ type: "paragraph", text: `Detail ${index + 1}` }))
    }
  };

  await createNotionDraft(largeProtocol, {
    token: "token",
    parentId: "parent-id",
    publicBaseUrl: "https://example.github.io/perpie"
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.children.length, 100);
  assert.match(calls[1].url, /blocks\/page-id\/children$/);
  assert.equal(calls[1].body.children.length, 20);
});

test("source proposal layout is cloned while its visual URLs become generated assets", async t => {
  const requests = [];
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url, options = {}) => {
    const method = options.method ?? "GET";
    requests.push({ url: String(url), method, body: options.body ? JSON.parse(options.body) : null });
    if (method === "POST") return { ok: true, json: async () => ({ id: "new-page", url: "https://notion.so/new-page" }) };
    const id = String(url).match(/blocks\/([^/]+)\/children/)?.[1];
    const results = id === "source-page"
      ? [
          { id: "synced", type: "synced_block", has_children: true, synced_block: {} },
          { id: "source-image", type: "image", has_children: false, image: {} },
          { id: "source-embed", type: "embed", has_children: false, embed: { url: "https://ofiryc.github.io/perpie-proposals/features.html?protocolName=vertex" } }
        ]
      : [{ id: "heading", type: "heading_2", has_children: false, heading_2: { rich_text: [{ type: "text", text: { content: "Vertex integration uses vertex APIs", link: null }, annotations: {} }], color: "default" } }];
    return { ok: true, json: async () => ({ results, has_more: false, next_cursor: null }) };
  };
  const sourceProtocol = {
    ...protocol,
    slug: "avantis-demo",
    name: "Avantis",
    notion: {
      title: "Perpie <> Vertex: Whitelabel Telegram Bot — Generated Draft",
      sourcePageId: "source-page",
      sourceImages: ["users-love-tg"]
    }
  };

  await createNotionDraft(sourceProtocol, {
    token: "token",
    parentId: "parent-id",
    publicBaseUrl: "https://example.github.io/perpie"
  });

  const created = requests.find(request => request.method === "POST").body;
  assert.equal(created.properties.title.title[0].text.content, sourceProtocol.notion.title);
  assert.deepEqual(created.children.map(block => block.type), ["heading_2", "image", "embed"]);
  assert.equal(created.children[0].heading_2.rich_text[0].text.content, "Avantis integration uses avantis-demo APIs");
  assert.match(created.children[1].image.external.url, /^https:\/\/example\.github\.io\/perpie\/avantis-demo\/images\/users-love-tg\.png\?v=\d+$/);
  // one shared carousel page, parameterised by protocol
  assert.equal(created.children[2].embed.url, "https://example.github.io/perpie/slider.html?protocol=avantis-demo&set=features");
});

test("pivot sections are spliced into the cloned proposal without disturbing it", async () => {
  const { applyPivot } = await import("../scripts/notion-lib.mjs");
  const heading = (type, content) => ({ object: "block", type, [type]: { rich_text: [{ type: "text", plain_text: content, text: { content } }] } });
  const cloned = [
    heading("heading_2", "Why users LOVE Telegram bots?"),
    heading("heading_2", "Why Partner With Us"),
    heading("heading_2", "Feature Suite"),
    heading("heading_3", "Trading Experience"),
    heading("heading_2", "Fees")
  ];
  const warnings = [];
  const out = await applyPivot(cloned, {
    protocolName: "Vertex", root: "https://example.github.io/perpie/vertex",
    version: 1, assetDir: null, uploads: new Map(), headers: {}, warnings
  });
  const text = block => (block[block.type]?.rich_text ?? []).map(item => item.plain_text ?? item.text?.content ?? "").join("");
  const outline = out.map(text);

  // no anchor was missed (asset warnings are expected: this fixture has no local build)
  assert.equal(warnings.filter(w => w.includes("pivot anchor")).length, 0);
  // every original block survives, in its original order
  for (const original of cloned.map(text)) assert.ok(outline.includes(original));
  assert.ok(outline.indexOf("Why Partner With Us") > outline.indexOf("Why users LOVE Telegram bots?"));

  // the intent narrative lands before the partnership pitch
  const intent = outline.indexOf("The Internet Is Moving From Clicking To Asking");
  assert.ok(intent > -1 && intent < outline.indexOf("Why Partner With Us"));

  // the agent leads the feature suite
  const agent = outline.indexOf("The AI Agent (Your New Front Door)");
  assert.ok(agent > outline.indexOf("Feature Suite") && agent < outline.indexOf("Trading Experience"));

  // protocol name is interpolated, never left as a placeholder
  assert.ok(!out.some(block => text(block).includes("{{PROTOCOL}}")));
  assert.ok(out.some(block => text(block).includes("Vertex")));

  // pivot artwork falls back to the hosted asset when nothing is built locally
  const images = out.filter(block => block.type === "image");
  assert.equal(images.length, 4);
  assert.ok(images.every(block => block.image.external.url.startsWith("https://example.github.io/perpie/vertex/images/")));
});

test("a missing pivot anchor warns instead of silently dropping the section", async () => {
  const { applyPivot } = await import("../scripts/notion-lib.mjs");
  const warnings = [];
  const out = await applyPivot([], { protocolName: "Vertex", root: "https://x", version: 1, assetDir: null, uploads: new Map(), headers: {}, warnings });
  assert.equal(out.length, 0);
  const anchors = warnings.filter(w => w.includes("pivot anchor not found"));
  assert.equal(anchors.length, 2);
});
