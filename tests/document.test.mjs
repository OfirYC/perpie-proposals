import assert from "node:assert/strict";
import test from "node:test";

import { renderDocument } from "../src/document.mjs";

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
  links: { bot: "https://t.me/vertex_bot", github: "https://github.com/example/repo" },
  assets: { groups: "vertex/groups.jpg" },
  templates: {}
};

test("render document fixes viewport size and includes scoped protocol CSS", () => {
  const html = renderDocument("groups", protocol, ".feature h1{font-size:70px}");

  assert.match(html, /width:1500px;height:640px/);
  assert.match(html, /href="\/src\/proposal\.css"/);
  assert.match(html, /data-template="groups"/);
  assert.match(html, /data-protocol="vertex"/);
  assert.match(html, /\[data-protocol="vertex"\] \{\.feature h1\{font-size:70px\}\}/);
});

test("protocol CSS cannot escape its scoped wrapper", () => {
  assert.throws(
    () => renderDocument("groups", protocol, "}</style><script>alert(1)</script>"),
    /Unsafe protocol CSS/
  );
});
