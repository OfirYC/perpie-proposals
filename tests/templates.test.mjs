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
      ["referral-system", 1500, 640]
    ]
  );
});

test("template rendering applies brand, copy, and asset overrides", () => {
  const html = renderTemplate("groups", protocol);

  assert.match(html, /data-protocol="vertex"/);
  assert.match(html, /--protocol-primary:#CDADEF/);
  assert.match(html, /Trade together on Vertex/);
  assert.match(html, /src="\/vertex\/groups\.jpg"/);
  assert.match(html, /alt="Vertex — Trade together on Vertex"/);
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
