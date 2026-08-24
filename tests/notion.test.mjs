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
      : [{ id: "heading", type: "heading_2", has_children: false, heading_2: { rich_text: [{ type: "text", text: { content: "Overview", link: null }, annotations: {} }], color: "default" } }];
    return { ok: true, json: async () => ({ results, has_more: false, next_cursor: null }) };
  };
  const sourceProtocol = {
    ...protocol,
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
  assert.match(created.children[1].image.external.url, /^https:\/\/example\.github\.io\/perpie\/vertex\/images\/users-love-tg\.png\?v=\d+$/);
  assert.equal(created.children[2].embed.url, "https://example.github.io/perpie/vertex/features.html");
});
