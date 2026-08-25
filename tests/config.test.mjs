import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadProtocol } from "../src/config.mjs";

const base = {
  slug: "vertex",
  name: "Vertex",
  logo: "vertex/logo.jpg",
  colors: {
    primary: "#CDADEF",
    blur: "#EFADEC",
    telegramAccent: "#956DC1",
    theme: "#FFFFFF",
    telegramBotAccent: "#956DC1"
  },
  links: {
    bot: "https://t.me/vertex_bot",
    github: "https://github.com/ofirYC/perpie-proposals/tree/master/vertex"
  },
  templates: {}
};

async function fixture(catalog = [base], override) {
  const root = await mkdtemp(join(tmpdir(), "perpie-config-"));
  await mkdir(join(root, "protocols"));
  await writeFile(join(root, "protocols/catalog.json"), JSON.stringify(catalog));
  if (override) {
    await writeFile(join(root, "protocols/vertex.json"), JSON.stringify(override));
  }
  return root;
}

test("protocol override changes only the requested inherited fields", async () => {
  const root = await fixture([base], {
    colors: { primary: "#111111" },
    templates: {
      groups: {
        headline: "Trade together on Vertex",
        assets: { hero: "vertex/custom-groups.png" }
      }
    }
  });

  const protocol = await loadProtocol(root, "vertex");

  assert.equal(protocol.colors.primary, "#111111");
  assert.equal(protocol.colors.blur, "#EFADEC");
  assert.equal(protocol.templates.groups.headline, "Trade together on Vertex");
  assert.equal(protocol.templates.groups.assets.hero, "vertex/custom-groups.png");
  assert.equal(protocol.notion.sourcePageId, "733fb90b253a42c3bad7eeb8e002f9bb");
  assert.deepEqual(protocol.notion.sourceImages, ["users-love-tg", "partnership-banner", "transactional-miniapp", "selfcustody", "400k-grants"]);
  assert.equal(protocol.extraAssets["400k-grants.png"], "vertex/400k-grants.png");
});

test("unsafe protocol slug is rejected before reading files", async () => {
  const root = await fixture();
  await assert.rejects(() => loadProtocol(root, "../vertex"), /safe lowercase slug/);
});

test("missing required brand color names the invalid field", async () => {
  const invalid = structuredClone(base);
  delete invalid.colors.blur;
  const root = await fixture([invalid]);

  await assert.rejects(() => loadProtocol(root, "vertex"), /colors\.blur/);
});

test("legacy directory expands into default logo, asset, and public links", async () => {
  const compact = {
    slug: "vertex",
    name: "Vertex",
    legacyDir: "vertex",
    logoFile: "Logo.png",
    colors: base.colors
  };
  const root = await fixture([compact]);

  const protocol = await loadProtocol(root, "vertex");

  assert.equal(protocol.logo, "vertex/Logo.png");
  assert.equal(protocol.assets.groups, "vertex/groups.jpg");
  assert.equal(protocol.assets["partnership-banner"], "vertex/Partnership Baner.jpg");
  assert.equal(protocol.links.github, "https://github.com/ofirYC/perpie-proposals/tree/master/vertex");
});
