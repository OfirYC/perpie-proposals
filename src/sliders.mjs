// One carousel page for every protocol.
//
// Deployed once to the site root as /slider.html and pointed at a protocol via
// the query string:  /slider.html?protocol=safe&set=features
//
// It reads <protocol>/manifest.json at runtime, so a board that is disabled for
// a protocol is skipped instead of 404ing, and adding a protocol needs no new
// slider file — the CI build (`npm run build -- --all`) already publishes its
// images.
//
// Sizing note: Notion's API cannot set an embed block's dimensions (block-level
// `format`, `embed.format`, `embed.aspect_ratio` and `embed.width/height` are
// all rejected by validation), and Notion paints a white surface behind the
// iframe, so a transparent page shows white bars. The page therefore fills its
// own box: a blurred, darkened copy of the current board covers the frame and
// the sharp board sits on top. Whatever height Notion picks, the block reads as
// one deliberate surface instead of a banner stranded in a white rectangle.

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
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0c0e0d;
  font:14px Inter,system-ui,-apple-system,sans-serif;color:#fff}
.stage{position:relative;width:100%;height:100%;display:grid;place-items:center;
  background:#0c0e0d;overflow:hidden}
/* blurred fill: same board, scaled to cover, so no host colour ever shows */
.bg{position:absolute;inset:0;background-size:cover;background-position:center;
  transform:scale(1.15);filter:blur(26px) brightness(.5) saturate(1.15);
  opacity:0;transition:opacity .35s}
.bg.current{opacity:1}
/* the board keeps its own 2.34:1 ratio and never crops */
.frame{position:relative;width:100%;aspect-ratio:1500/640;max-height:100%;margin:auto;
  border-radius:8px;overflow:hidden;box-shadow:0 10px 40px #00000059}
.slide{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;
  opacity:0;transition:opacity .35s}
.slide.current{opacity:1}
.nav{position:absolute;z-index:3;top:50%;translate:0 -50%;display:grid;place-items:center;
  /* scales with the box: Notion's default embed is small, and a fixed 38px
     control swallows the board at that size */
  width:clamp(24px,5.2vw,38px);height:clamp(24px,5.2vw,38px);
  font-size:clamp(14px,3vw,22px);
  border:1px solid #ffffff3d;border-radius:50%;background:#000000a6;
  color:#fff;line-height:1;cursor:pointer;padding:0;
  transition:background .2s,border-color .2s;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.nav:hover{background:#000000d9;border-color:#ffffff8a}
.prev{left:clamp(6px,1.6vw,12px)}.next{right:clamp(6px,1.6vw,12px)}
.nav:focus-visible{outline:2px solid #fff;outline-offset:3px}
.dots{position:absolute;z-index:3;bottom:clamp(6px,2vw,14px);left:50%;translate:-50% 0;
  display:flex;gap:6px;padding:5px 9px;border-radius:100px;background:#00000059;
  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.dot{width:6px;height:6px;border-radius:50%;border:0;padding:0;background:#ffffff4d;cursor:pointer;
  transition:background .2s}
.dot.current{background:#fff}
.msg{position:relative;z-index:3;opacity:.65}
@media (prefers-reduced-motion:reduce){.slide,.bg{transition:none}}
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
  // the manifest is the source of truth for what was actually built, so an
  // unknown protocol shows a message instead of a carousel of broken images
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
  const frame = document.createElement("div");
  frame.className = "frame";

  const backdrops = ids.map((id, i) => {
    const src = protocol + "/images/" + id + ".png";
    const bg = document.createElement("div");
    bg.className = "bg" + (i ? "" : " current");
    bg.style.backgroundImage = "url('" + src + "')";
    stage.append(bg);
    return bg;
  });
  stage.append(frame);

  const slides = ids.map((id, i) => {
    const img = document.createElement("img");
    img.className = "slide" + (i ? "" : " current");
    img.src = protocol + "/images/" + id + ".png";
    img.alt = protocol + " " + id.replace(/-/g, " ");
    img.loading = i ? "lazy" : "eager";
    frame.append(img);
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
    frame.append(b);
  };

  let current = 0, timer;
  const go = next => {
    for (const list of [slides, backdrops, buttons]) list[current].classList.remove("current");
    current = (next + slides.length) % slides.length;
    for (const list of [slides, backdrops, buttons]) list[current].classList.add("current");
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
