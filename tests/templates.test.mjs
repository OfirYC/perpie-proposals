import assert from "node:assert/strict";
import test from "node:test";

import { TEMPLATES, enabledTemplates, renderTemplate } from "../src/templates.mjs";

const protocol = {
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
  assets: { groups: "vertex/groups.jpg" },
  templates: {
    groups: { headline: "Trade together on Vertex" },
    charts: { enabled: false }
  }
};

test("registry exposes every Figma export at its output dimensions", () => {
  assert.deepEqual(
    TEMPLATES.map(({ id, width, height }) => [id, width, height]),
    [
      ["notion-cover", 2170, 381],
      ["users-love-tg", 1500, 640],
      ["partnership-banner", 1500, 640],
      ["logo", 347, 347],
      ["groups", 1500, 640],
      ["selfcustody", 1500, 640],
      ["charts", 1500, 640],
      ["transactional-miniapp", 1500, 640],
      ["traders-tracker", 1500, 640],
      ["ai-feature", 1500, 640],
      ["notifications", 1500, 640],
      ["pnlcards", 1500, 640],
      ["batch-transactions", 1500, 640],
      ["referral-system", 1500, 640],
      ["agent-everywhere", 1500, 640],
      ["agent-telegram", 1500, 640],
      ["embedded-agent", 1500, 640],
      ["alert-to-action", 1500, 640]
    ]
  );
});

test("pivot frames are opt-in and compose the existing product assets", () => {
  const pivotProtocol = structuredClone(protocol);
  pivotProtocol.exactAssets = true;
  pivotProtocol.templates["agent-everywhere"] = { enabled: true };

  const html = renderTemplate("agent-everywhere", pivotProtocol);

  assert.equal(enabledTemplates(protocol).some(template => template.id === "agent-everywhere"), false);
  assert.equal(enabledTemplates(pivotProtocol).some(template => template.id === "agent-everywhere"), true);
  assert.match(html, /class="proposal pivot pivot-agent-everywhere"/);
  assert.match(html, /shared\/pivot\/telegram-phone\.png/);
  assert.match(html, /shared\/pivot\/transaction-card\.png/);
  assert.doesNotMatch(html, /class="proposal exact-asset"/);
});

test("template rendering applies brand, copy, and asset overrides", () => {
  const html = renderTemplate("groups", protocol);

  assert.match(html, /data-protocol="vertex"/);
  assert.match(html, /--protocol-primary:#CDADEF/);
  assert.match(html, /Trade together on Vertex/);
  assert.match(html, /class="generated-art"/);
  assert.doesNotMatch(html, /class="source-cleaner"/);
  assert.doesNotMatch(html, /src="\/vertex\/groups\.jpg"/);
  assert.doesNotMatch(html, /class="artwork"/);
});

test("disabled protocol template is omitted without changing shared registry", () => {
  assert.equal(enabledTemplates(protocol).some(template => template.id === "charts"), false);
  assert.equal(TEMPLATES.some(template => template.id === "charts"), true);
});

test("copy overrides are escaped before entering generated HTML", () => {
  const hostile = structuredClone(protocol);
  hostile.templates.groups.headline = '<script>alert("x")</script>';

  const html = renderTemplate("groups", hostile);

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("stale exact-asset flags cannot bypass dynamic template rendering", () => {
  const exact = { ...protocol, exactAssets: true };
  const html = renderTemplate("groups", exact);

  assert.match(html, /class="proposal feature left"/);
  assert.match(html, /class="generated-art"/);
  assert.match(html, /<h1>Trade together on Vertex<\/h1>/);
  assert.doesNotMatch(html, /class="proposal exact-asset"/);
});

test("a protocol with only brand variables receives shared generated artwork", () => {
  const brandOnly = { ...protocol, assets: {}, templates: {} };
  const html = renderTemplate("groups", brandOnly);

  assert.match(html, /shared\/pivot\/group-phone\.png/);
  assert.match(html, /class="generated-art"/);
  assert.match(html, /Vertex/);
});

test("template supporting copy stays editable instead of remaining baked into artwork", () => {
  const editable = structuredClone(protocol);
  editable.templates["ai-feature"] = { subheadline: "Execute from plain English" };

  const html = renderTemplate("ai-feature", editable);

  assert.match(html, /<p class="feature-subtitle">Execute from plain English<\/p>/);
});

test("a protocol-specific visual uses the inherited editable layout", () => {
  const custom = structuredClone(protocol);
  custom.templates.groups = { assets: { visual: "vertex/custom-product.png" } };

  const html = renderTemplate("groups", custom);

  assert.match(html, /class="generated-art"/);
  assert.match(html, /src="\/vertex\/custom-product\.png"/);
  assert.match(html, /<h1>Social Group Trading<\/h1>/);
});

test("partnership banner uses the real Perpie lockup with a dynamic partner", () => {
  const html = renderTemplate("partnership-banner", protocol);

  assert.match(html, /shared\/pivot\/perpie-lockup\.png/);
  assert.match(html, /src="\/vertex\/logo\.jpg"/);
  assert.match(html, />Vertex<\/strong>/);
});
