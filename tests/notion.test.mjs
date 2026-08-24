import assert from "node:assert/strict";
import test from "node:test";

import { buildNotionPayload } from "../scripts/notion-lib.mjs";

const protocol = {
  slug: "vertex",
  name: "Vertex",
  logo: "vertex/Logo.png",
  links: {
    bot: "https://t.me/vertex_protocol_bot",
    github: "https://github.com/ofirYC/perpie-proposals/tree/master/vertex"
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
  assert.match(serialized, /vertex\/features\.html/);
  assert.match(serialized, /https:\/\/t\.me\/vertex_protocol_bot/);
});
