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
  assert.equal(payload.cover.external.url, "https://example.github.io/perpie/vertex/images/notion-cover.png");
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
