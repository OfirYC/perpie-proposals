import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

import { loadProtocol } from "../src/config.mjs";
import { enabledTemplates } from "../src/templates.mjs";
import { renderBoard, BOARD_IDS } from "../src/canvas.mjs";
import { SLIDER_SETS, sliderPage } from "../src/sliders.mjs";
import { startServer } from "./server-lib.mjs";

const html = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function slider(title, images) {
  const slides = images.map((image, index) => `<img class="slide${index ? "" : " current"}" src="images/${image}.png" alt="${html(title)} ${index + 1}">`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${html(title)}</title><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#0b0d0c}.slider{position:relative;width:100%;height:100%}.slide{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .35s}.slide.current{opacity:1}.nav{position:absolute;z-index:2;top:50%;translate:0 -50%;display:grid;place-items:center;width:48px;height:48px;border:1px solid #fff8;border-radius:50%;background:#0008;color:#fff;font-size:28px;cursor:pointer}.prev{left:18px}.next{right:18px}.nav:focus-visible{outline:3px solid #fff;outline-offset:3px}
</style></head><body><div class="slider">${slides}<button class="nav prev" aria-label="Previous slide">‹</button><button class="nav next" aria-label="Next slide">›</button></div><script>
const slides=[...document.querySelectorAll('.slide')];let current=0;const show=next=>{slides[current].classList.remove('current');current=(next+slides.length)%slides.length;slides[current].classList.add('current')};let timer=setInterval(()=>show(current+1),4000);const move=step=>{clearInterval(timer);show(current+step);timer=setInterval(()=>show(current+1),4000)};document.querySelector('.prev').onclick=()=>move(-1);document.querySelector('.next').onclick=()=>move(1);document.addEventListener('keydown',event=>{if(event.key==='ArrowLeft')move(-1);if(event.key==='ArrowRight')move(1)});
</script></body></html>`;
}

function gallery(protocol, templates) {
  const cards = templates.map(template => `<figure><img src="images/${template.id}.png" alt="${html(protocol.name)} ${template.id}"><figcaption>${html(template.id)}</figcaption></figure>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${html(protocol.name)} proposal assets</title><style>
body{margin:0;padding:32px;background:#111;color:#fff;font:16px system-ui}header{display:flex;align-items:center;gap:16px;margin-bottom:28px}header img{width:56px;height:56px;object-fit:contain;border-radius:12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}figure{margin:0}figure img{display:block;width:100%;height:auto;border-radius:12px;background:#222}figcaption{padding:8px 2px;color:#aaa}
</style></head><body><header><img src="images/logo.png" alt=""><h1>${html(protocol.name)} proposal assets</h1></header><main class="grid">${cards}</main></body></html>`;
}

// a protocol is either a catalog row or a standalone protocols/<slug>.json
export async function allSlugs(dir) {
  const catalog = JSON.parse(await readFile(join(dir, "protocols/catalog.json"), "utf8")).map(p => p.slug);
  const files = (await readdir(join(dir, "protocols")))
    .filter(name => name.endsWith(".json") && name !== "catalog.json")
    .map(name => name.replace(/\.json$/, ""));
  return [...new Set([...catalog, ...files])];
}


export async function buildProtocol(root, slug, outputRoot = join(root, "dist")) {
  const protocol = await loadProtocol(root, slug);
  const templates = enabledTemplates(protocol);
  const target = join(outputRoot, slug);
  const images = join(target, "images");
  await rm(target, { recursive: true, force: true });
  await mkdir(images, { recursive: true });
  const server = await startServer(root, 0);
  const { port } = server.address();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const template of templates) {
      const page = await browser.newPage({ viewport: { width: template.width, height: template.height } });
      const failures = [];
      page.on("pageerror", error => failures.push(error.message));
      page.on("response", response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
      // Boards designed on the canvas render straight from their exported
      // fragment, brand-tokenised from the protocol JSON. Everything else comes
      // from the HTML templates over the dev server.
      if (BOARD_IDS[template.id] && !protocol.assets?.[template.id]) {
        const html = await renderBoard(root, protocol, template.id);
        await page.setContent(html, { waitUntil: "networkidle" });
      } else {
        await page.goto(`http://127.0.0.1:${port}/render/${slug}/${template.id}`, { waitUntil: "networkidle" });
      }
      await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map(image => image.complete ? true : new Promise(resolve => image.addEventListener("load", resolve, { once: true })))]));
      if (failures.length) throw new Error(`${template.id}: ${failures.join(", ")}`);
      await page.screenshot({ path: join(images, `${template.id}.png`), type: "png" });
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  for (const [name, source] of Object.entries(protocol.extraAssets ?? {})) {
    if (!/^[a-z0-9][a-z0-9.-]*$/.test(name)) throw new Error(`Unsafe extra asset name: ${name}`);
    await copyFile(join(root, source), join(images, name));
  }
  const manifest = {
    protocol: slug,
    generatedAt: new Date().toISOString(),
    templates: templates.map(({ id, width, height }) => ({ id, width, height, file: `images/${id}.png` }))
  };
  await writeFile(join(target, "index.html"), gallery(protocol, templates));
  await writeFile(join(target, "manifest.json"), JSON.stringify(manifest, null, 2));
  // per-protocol carousels are superseded by the shared /slider.html?protocol=…,
  // but keep them so proposals generated before the switch keep resolving
  for (const [file, ids] of Object.entries(SLIDER_SETS)) {
    const slides = ids.filter(id => templates.some(template => template.id === id));
    const name = file === "features" ? "features.html" : "social-features.html";
    await writeFile(join(target, name), slider(`${protocol.name} ${file}`, slides));
  }
  await writeSliderPage(outputRoot);
  return manifest;
}


// the shared carousel lives at the site root, next to the per-protocol folders
export async function writeSliderPage(outputRoot) {
  await mkdir(outputRoot, { recursive: true });
  await writeFile(join(outputRoot, "slider.html"), sliderPage());
}
