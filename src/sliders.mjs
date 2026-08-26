// One carousel page for every protocol.
//
// Deployed once to the site root as /slider.html and pointed at a protocol via
// the query string:  /slider.html?protocol=safe&set=features
//
// It reads <protocol>/manifest.json at runtime, so a board that is disabled for
// a protocol is skipped instead of 404ing, and adding a protocol needs no new
// slider file — the CI build (`npm run build -- --all`) already publishes its
// images.

export const SLIDER_SETS = {
  features: ["agent-everywhere", "agent-telegram", "embedded-agent", "alert-to-action",
             "ai-feature", "charts", "notifications", "traders-tracker", "batch-transactions"],
  social: ["groups", "pnlcards", "referral-system"]
};

// Which set an embed in the original proposal maps to.
export const SLIDER_FILES = {
  "features.html": "features",
  "social-features.html": "social"
};

export const sliderUrl = (site, slug, set) =>
  `${site.replace(/\/$/, "")}/slider.html?protocol=${encodeURIComponent(slug)}&set=${set}`;

export function sliderPage() {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Perpie proposal carousel</title>
<style>
*{box-sizing:border-box}
html,body{margin:0;width:100%;height:100%;background:#0b0d0c;overflow:hidden;
  font:14px Inter,system-ui,-apple-system,sans-serif;color:#fff}
.stage{position:relative;width:100%;height:100%;display:grid;place-items:center}
/* contain, not cover: the boards are 2.34:1 and must never be cropped to fit
   whatever box the host iframe happens to be */
.slide{position:absolute;max-width:100%;max-height:100%;width:auto;height:auto;
  object-fit:contain;opacity:0;transition:opacity .35s;border-radius:6px}
.slide.current{opacity:1}
.nav{position:absolute;z-index:2;top:50%;translate:0 -50%;display:grid;place-items:center;
  width:42px;height:42px;border:1px solid #ffffff40;border-radius:50%;background:#000000a6;
  color:#fff;font-size:24px;line-height:1;cursor:pointer;padding:0;transition:background .2s}
.nav:hover{background:#000000d9}
.prev{left:14px}.next{right:14px}
.nav:focus-visible{outline:2px solid #fff;outline-offset:3px}
.dots{position:absolute;z-index:2;bottom:12px;left:50%;translate:-50% 0;display:flex;gap:7px}
.dot{width:7px;height:7px;border-radius:50%;border:0;padding:0;background:#ffffff40;cursor:pointer}
.dot.current{background:#fff}
.msg{opacity:.6}
@media (prefers-reduced-motion:reduce){.slide{transition:none}}
</style></head><body>
<div class="stage" id="stage"><p class="msg" id="msg">Loading…</p></div>
<script>
const params = new URLSearchParams(location.search);
const protocol = (params.get("protocol") || "").replace(/[^a-z0-9.-]/gi, "");
const set = params.get("set") === "social" ? "social" : "features";
const SETS = ${JSON.stringify(SLIDER_SETS)};
const stage = document.getElementById("stage");
const msg = document.getElementById("msg");

const fail = why => { msg.textContent = why; };

(async () => {
  if (!protocol) return fail("No protocol specified.");
  // The manifest is the source of truth for what was actually built. Requiring
  // it means an unknown or not-yet-deployed protocol shows a message instead of
  // a carousel of broken images.
  let built;
  try {
    const res = await fetch(protocol + "/manifest.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(String(res.status));
    built = new Set((await res.json()).templates.map(t => t.id));
  } catch {
    return fail("No build published for " + protocol + " yet.");
  }
  const ids = SETS[set].filter(id => built.has(id));
  if (!ids.length) return fail("Nothing to show for " + protocol + ".");

  msg.remove();
  const slides = ids.map((id, i) => {
    const img = document.createElement("img");
    img.className = "slide" + (i ? "" : " current");
    img.src = protocol + "/images/" + id + ".png";
    img.alt = protocol + " " + id.replace(/-/g, " ");
    img.loading = i ? "lazy" : "eager";
    stage.append(img);
    return img;
  });

  const dots = document.createElement("div");
  dots.className = "dots";
  const buttons = ids.map((id, i) => {
    const b = document.createElement("button");
    b.className = "dot" + (i ? "" : " current");
    b.type = "button";
    b.setAttribute("aria-label", "Show " + id.replace(/-/g, " "));
    b.onclick = () => go(i);
    dots.append(b);
    return b;
  });

  const nav = (cls, label, step) => {
    const b = document.createElement("button");
    b.className = "nav " + cls;
    b.type = "button";
    b.setAttribute("aria-label", label);
    b.textContent = cls === "prev" ? "\\u2039" : "\\u203A";
    b.onclick = () => go(current + step);
    stage.append(b);
  };

  let current = 0, timer;
  const go = next => {
    slides[current].classList.remove("current");
    buttons[current].classList.remove("current");
    current = (next + slides.length) % slides.length;
    slides[current].classList.add("current");
    buttons[current].classList.add("current");
    restart();
  };
  const restart = () => {
    clearInterval(timer);
    if (slides.length > 1) timer = setInterval(() => go(current + 1), 5000);
  };

  if (slides.length > 1) { nav("prev", "Previous", -1); nav("next", "Next", 1); stage.append(dots); }
  addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") go(current - 1);
    if (e.key === "ArrowRight") go(current + 1);
  });
  restart();
})();
</script></body></html>`;
}
