// Renders a Pencil canvas board as a self-contained, brand-tokenised HTML page.
//
// The boards were designed once on the canvas and exported as HTML fragments
// (canvas/fragments). Brand-specific literals are swapped for CSS custom
// properties here, so one fragment serves every protocol. The output inlines its
// own images, which is what lets it run inside Notion's sandboxed HTML embed
// where relative paths cannot resolve.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Values taken from the "Safe" palette the boards were drawn in.
const COLOR_TOKENS = {
  "#121312ff": "var(--wl-primary)",
  "#15433cff": "var(--wl-blur)",
  "#118263ff": "var(--wl-accent)",
  "#7fe3c0ff": "var(--wl-accent-soft)",
  "#5fddffff": "var(--wl-ring-a)",
  "#28f5a4ff": "var(--wl-ring-b)",
  "#15fe85ff": "var(--wl-ring-c)",
  // Text and icons that sit ON an accent surface (sent bubbles, primary buttons,
  // badges). Not plain white: a bright accent like Safe's #12FF80 needs near-black
  // here or the label is unreadable. See onAccent() for the flip.
  "#f4fff9ff": "var(--wl-on-accent)"
  // #966dd5 is deliberately absent: that is Perpie's own purple on the
  // partnership banner, which must not follow the client's brand.
};

const SAFE_LOGO = "./images/3c6bafb9de31f4ff.png";
const PLATFORM = "./images/platform-nado.png";

// asset id in the proposal  ->  canvas board id
export const BOARD_IDS = {
  "agent-everywhere": "OOX4z", "embedded-agent": "yt1By",
  "agent-telegram": "xRsC0", "alert-to-action": "Ef8WO",
  groups: "FRN6Y", selfcustody: "gewms", charts: "DWe1c",
  "transactional-miniapp": "FBIGP", "traders-tracker": "rr9b7",
  "ai-feature": "R6Bij9", notifications: "cDVcR", pnlcards: "JjJoA",
  "batch-transactions": "u1FJb", "referral-system": "irVaR",
  "users-love-tg": "JyK2S", "notion-cover": "Khdhh",
  "partnership-banner": "r09PdP", logo: "W8XBCF"
};

function hexToHsl(hex) {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > .5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

const hsl = (h, s, l) =>
  `hsl(${h.toFixed(1)} ${Math.min(100, Math.max(0, s)).toFixed(1)}% ${Math.min(100, Math.max(0, l)).toFixed(1)}%)`;

// WCAG relative luminance, used to decide whether labels on an accent surface
// should be dark or light.
function luminance(hex) {
  const value = hex.replace("#", "");
  const channel = c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [0, 2, 4].map(i => channel(parseInt(value.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const onAccent = accent => (luminance(accent) > 0.45 ? "#0B1410" : "#FFFFFF");

function brandVars(protocol) {
  const { colors } = protocol;
  const [h, s, l] = hexToHsl(colors.telegramAccent);
  return [
    `--wl-primary:${colors.primary}`,
    `--wl-blur:${colors.blur}`,
    `--wl-accent:${colors.telegramAccent}`,
    `--wl-on-accent:${onAccent(colors.telegramAccent)}`,
    `--wl-theme:${colors.theme}`,
    `--wl-accent-soft:${hsl(h, Math.max(s, 55), Math.min(88, l + 34))}`,
    `--wl-ring-a:${hsl(h + 18, Math.max(s, 70), Math.max(l + 38, 62))}`,
    `--wl-ring-b:${hsl(h, Math.max(s, 72), Math.max(l + 28, 55))}`,
    `--wl-ring-c:${hsl(h - 6, Math.max(s, 78), Math.max(l + 22, 50))}`
  ].join(";");
}

export function tokenize(fragment, protocolName) {
  let out = fragment;

  // SVG presentation attributes: var() is unreliable as an attribute value but
  // always resolves inside a style declaration
  out = out.replace(/\b(fill|stroke|stop-color)="(#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?)"/g,
    (whole, attr, hex) => {
      const key = hex.length === 7 ? `${hex.toLowerCase()}ff` : hex.toLowerCase();
      return COLOR_TOKENS[key] ? `style="${attr}:${COLOR_TOKENS[key]}"` : whole;
    });

  // Alpha variants: #118263 at 28% must become a translucent accent, not
  // `var(--wl-accent)47`, which is what a naive 6-digit replace produces.
  // Tailwind arbitrary values cannot contain spaces — inside `[...]` the value
  // must use underscores, or the class is invalid and the style silently
  // vanishes. Hexes appear nested there too, e.g. [box-shadow:0_5px_14px_#1182634d].
  const substitute = (text, spaced) => {
    for (const [hex, token] of Object.entries(COLOR_TOKENS)) {
      const base = hex.slice(0, -2);
      text = text.replace(new RegExp(`${base}([0-9a-fA-F]{2})`, "gi"), (whole, alpha) => {
        const value = parseInt(alpha, 16);
        if (value >= 255) return token;
        const percent = Math.round(value / 255 * 100);
        return spaced
          ? `color-mix(in srgb, ${token} ${percent}%, transparent)`
          : `color-mix(in_srgb,${token}_${percent}%,transparent)`;
      });
      text = text.replace(new RegExp(`${base}(?![0-9a-fA-F])`, "gi"), token);
    }
    return text;
  };
  // Tailwind arbitrary values first (no spaces allowed), then everything else
  out = out.replace(/\[[^\]\s]*\]/g, span => substitute(span, false));
  out = substitute(out, true);

  out = out.replaceAll(`bg-[url('${SAFE_LOGO}')]`, "wl-logo");
  out = out.replaceAll(`bg-[url('${PLATFORM}')]`, "wl-platform");

  // the canvas uses U+2028 inside text runs; HTML does not break on it
  out = out.replace(/>([^<]*)</g, (whole, text) => `>${text.replace(/[\u2028\u2029]/g, "<br/>")}<`);

  // brand name text nodes
  out = out.replace(/>(\s*)(Safe|Perpie)(\s*)</g, (whole, a, name, b) => `>${a}${protocolName}${b}<`);

  // the board carries its own absolute canvas position; drop it
  return out.replace(/class="([^"]*)"/, (whole, cls) =>
    `class="${cls.replace(/\s*\babsolute\b|\s*\bleft-\[[-\d.]+px\]|\s*\btop-\[[-\d.]+px\]/g, "").trim()}"`);
}

// Inline every referenced image, but as its own CSS rule rather than inside a
// Tailwind arbitrary-value class. Tailwind emits a rule per class name, so a
// data URI baked into the class would end up duplicated in the stylesheet and
// double the payload.
async function inlineImages(root, html) {
  const names = [...new Set([...html.matchAll(/\.\/images\/([\w./-]+)/g)].map(m => m[1]))];
  const rules = [];
  let index = 0;
  for (const name of names) {
    const path = join(root, "canvas/images", name);
    if (!existsSync(path)) continue;
    const mime = name.endsWith(".jpg") || name.endsWith(".jpeg") ? "image/jpeg" : "image/png";
    const data = (await readFile(path)).toString("base64");
    const utility = `bg-[url('./images/${name}')]`;
    if (html.includes(utility)) {
      // used as a Tailwind background utility -> its own rule, referenced by class
      const token = `wlimg-${index++}`;
      rules.push(`.${token}{background-image:url("data:${mime};base64,${data}")}`);
      html = html.replaceAll(utility, token);
    }
    // anything still pointing at the file (and nothing if tokenize already
    // rewrote it to --wl-logo / --wl-platform) gets the data URI inline
    if (html.includes(`./images/${name}`)) {
      html = html.replaceAll(`./images/${name}`, `data:${mime};base64,${data}`);
    }
  }
  return { html, css: rules.join("\n") };
}

export async function renderBoard(root, protocol, assetId, { tailwind } = {}) {
  const boardId = BOARD_IDS[assetId];
  if (!boardId) throw new Error(`No canvas board for asset: ${assetId}`);
  const boards = JSON.parse(await readFile(join(root, "canvas/boards.json"), "utf8"));
  const board = boards.find(item => item.id === boardId);
  if (!board) throw new Error(`Board not exported: ${boardId}`);

  let body = tokenize(await readFile(join(root, `canvas/fragments/${boardId}.html`), "utf8"), protocol.name);

  const logo = protocol.logo ? join(root, protocol.logo) : null;
  const platform = protocol.platform ? join(root, protocol.platform) : null;
  const dataUri = async path => {
    if (!path || !existsSync(path)) return null;
    const mime = /\.jpe?g$/i.test(path) ? "image/jpeg" : "image/png";
    return `data:${mime};base64,${(await readFile(path)).toString("base64")}`;
  };

  const inlined = await inlineImages(root, body);
  body = inlined.html;
  const runtime = tailwind ?? await readFile(join(root, "canvas/tailwind.js"), "utf8");

  return `<!doctype html><html><head><meta charset="utf-8">
<script>tailwind={config:{corePlugins:{preflight:false}}}</script>
<script>${runtime}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Roboto+Mono:wght@400..700&display=swap">
<style>
:root{${brandVars(protocol)};
 --wl-logo:url('${await dataUri(logo) ?? ""}');
 --wl-platform:url('${await dataUri(platform) ?? ""}')}
*,::before,::after{box-sizing:border-box}
html,body{margin:0;padding:0;background:transparent;overflow:hidden}
#stage{transform-origin:top left}
.wl-logo{background-image:var(--wl-logo)!important}
.wl-platform{background-image:var(--wl-platform)!important}
${inlined.css}
</style></head><body><div id="stage">${body}</div>
<script>
// scale the fixed-size board to whatever width the embed is given
const W=${board.w},H=${board.h},stage=document.getElementById('stage');
const fit=()=>{const k=innerWidth/W;stage.style.transform='scale('+k+')';document.body.style.height=(H*k)+'px'};
addEventListener('resize',fit);fit();
</script></body></html>`;
}

// Shipping the Tailwind JIT runtime inside every board means ~444 KB of inlined
// JavaScript, which Cloudflare's WAF rejects on upload (403). Run the board once
// in a real browser, harvest the CSS Tailwind generated, and emit a static page
// with no scripts at all — smaller, faster, and it uploads cleanly.
export async function freeze(html) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelectorAll("style").length > 1, { timeout: 15000 }).catch(() => {});
    const { css, body } = await page.evaluate(() => ({
      css: [...document.querySelectorAll("style")].map(node => node.textContent).join("\n"),
      body: document.getElementById("stage")?.outerHTML ?? document.body.innerHTML
    }));
    const height = await page.evaluate(() => {
      const el = document.getElementById("stage")?.firstElementChild;
      return el ? el.getBoundingClientRect().height : 640;
    });
    const width = await page.evaluate(() => {
      const el = document.getElementById("stage")?.firstElementChild;
      return el ? el.getBoundingClientRect().width : 1500;
    });
    return `<!doctype html><html><head><meta charset="utf-8"><style>${css}
html,body{margin:0;padding:0;background:transparent;overflow:hidden}
#stage{transform-origin:top left}
</style></head><body>${body}
<script>const W=${Math.round(width)},H=${Math.round(height)},s=document.getElementById('stage');
const f=()=>{const k=innerWidth/W;s.style.transform='scale('+k+')';document.body.style.height=(H*k)+'px'};
addEventListener('resize',f);f();</script></body></html>`;
  } finally {
    await browser.close();
  }
}
