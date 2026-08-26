#!/usr/bin/env python3
"""Assemble the Pencil canvas export into a single whitelabel-able HTML page."""
import json, re, os, shutil, html as H

SRC   = '/tmp/wl'
DOC   = '/Users/ofirsmolinsky/.pencil/documents/9b458320-11f5-4f92-8d63-0fee60cb3c3f'
OUT   = os.path.join(DOC, 'whitelabel.html')

# ---------------------------------------------------------------- brand config
# Extracted 1:1 from the per-protocol palette frames on the canvas
# (Rectangle 432 = Primary, 433 = Blur, 434 = Telegram Accent, 435 = Theme)
BRANDS = json.load(open(f'{SRC}/brands.json'))

SAFE_LOGO = './images/3c6bafb9de31f4ff.png'
PLATFORM  = './images/platform-nado.png'

# hex -> css var.  Values taken from the "Safe" palette frame.
COLOR_TOKENS = {
    '#121312ff': 'var(--wl-primary)',   # board background      (Safe Primary)
    '#15433cff': 'var(--wl-blur)',      # the big blurred ellipse (Safe Blur)
    # NB: #966dd5 is deliberately NOT tokenised. It is Perpie's own purple on the
    # two Perpie-owned marketing boards ("perpie x Safe" partnership banner and the
    # grants announcement) where Perpie is the platform, not the whitelabel client.
    '#118263ff': 'var(--wl-accent)',    # sent bubbles + links  (Telegram Accent)
    '#7fe3c0ff': 'var(--wl-accent-soft)',  # eyebrow labels on the new pivot boards
    '#5fddffff': 'var(--wl-ring-a)',    # avatar ring gradient stop 1
    '#28f5a4ff': 'var(--wl-ring-b)',    # avatar ring gradient stop 2
    '#15fe85ff': 'var(--wl-ring-c)',    # avatar ring gradient stop 3
    # labels sitting ON an accent surface: near-black when the accent is bright
    '#f4fff9ff': 'var(--wl-on-accent)',
}

BOARD_ORDER = ['OOX4z','yt1By','xRsC0','Ef8WO',
               'FRN6Y','gewms','DWe1c','FBIGP','rr9b7','R6Bij9','cDVcR','JjJoA',
               'u1FJb','irVaR','o7kY1d','JyK2S','Khdhh','r09PdP','LrMs9','W8XBCF']


def fix_linebreaks(frag: str) -> str:
    """The canvas uses U+2028 LINE SEPARATOR inside text runs. The exporter emits it
    raw, but HTML does not break on it, so multi-line headlines collapse onto one
    line and overlap their neighbours. Convert to <br/> in text nodes only (never
    inside attribute values such as data-pencil-name)."""
    def in_text(m):
        return '>' + re.sub(r'[  ]', '<br/>', m.group(1)) + '<'
    return re.sub(r'>([^<]*)<', in_text, frag)


def tokenize(frag: str) -> str:
    """Replace brand-specific literals with CSS custom properties."""
    # 1. SVG presentation attributes -> inline style (var() is unreliable as a
    #    presentation attribute, but always works in a style declaration)
    def svg_attr(m):
        attr, hexv = m.group(1), m.group(2).lower()
        if len(hexv) == 7:
            hexv += 'ff'
        if hexv not in COLOR_TOKENS:
            return m.group(0)
        return f'style="{attr}:{COLOR_TOKENS[hexv]}"'
    frag = re.sub(r'\b(fill|stroke|stop-color)="(#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?)"', svg_attr, frag)

    # 2. every remaining literal (tailwind arbitrary values, gradients, shadows).
    # Alpha variants need color-mix: a naive 6-digit replace turns #11826359 into
    # `var(--wl-accent)59`, which is not a colour and silently drops the fill.
    # Tailwind arbitrary values additionally cannot contain spaces, so inside
    # `[...]` the same value has to be written with underscores.
    def substitute(text: str, spaced: bool) -> str:
        for hexv, var in COLOR_TOKENS.items():
            base = hexv[:-2]

            def alpha(m, var=var):
                value = int(m.group(1), 16)
                if value >= 255:
                    return var
                pct = round(value / 255 * 100)
                if spaced:
                    return f'color-mix(in srgb, {var} {pct}%, transparent)'
                return f'color-mix(in_srgb,{var}_{pct}%,transparent)'

            text = re.sub(base + r'([0-9a-fA-F]{2})', alpha, text, flags=re.I)
            text = re.sub(base + r'(?![0-9a-fA-F])', var, text, flags=re.I)
        return text

    frag = re.sub(r'\[[^\]\s]*\]', lambda m: substitute(m.group(0), False), frag)
    frag = substitute(frag, True)

    # 3. logo image -> token-driven background
    frag = re.sub(
        r"bg-\[url\('" + re.escape(SAFE_LOGO) + r"'\)\]",
        'wl-logo', frag)

    # 3b. platform screenshot -> token, so the embedded board reskins per protocol
    frag = re.sub(
        r"bg-\[url\('" + re.escape(PLATFORM) + r"'\)\]",
        'wl-platform', frag)

    # 4. brand name text nodes -> live span
    frag = re.sub(r'>(\s*)(Safe|Perpie)(\s*)<',
                  lambda m: f'>{m.group(1)}<span class="wl-name">{m.group(2)}</span>{m.group(3)}<',
                  frag)
    return frag


def unpin(frag: str):
    """Strip the board's own absolute canvas position so it can flow in a gallery."""
    m = re.search(r'class="([^"]*)"', frag)
    cls = m.group(1)
    cleaned = re.sub(r'\s*\babsolute\b|\s*\bleft-\[[-\d.]+px\]|\s*\btop-\[[-\d.]+px\]', '', cls)
    return frag[:m.start(1)] + cleaned.strip() + frag[m.end(1):]


def main():
    meta = {b['id']: b for b in json.load(open(f'{SRC}/boards.json'))}
    cards = []
    for bid in BOARD_ORDER:
        # boards.json is the repo's maintained proposal set; scratch exports that
        # are not part of it (one-off charts, component sketches) are skipped
        if bid not in meta:
            print(f'  skip {bid} (not in boards.json)')
            continue
        b = meta[bid]
        frag = open(f'{SRC}/frag/{bid}.html').read()
        frag = tokenize(fix_linebreaks(unpin(frag)))
        cards.append(f'''
    <figure class="board" data-board="{bid}">
      <figcaption><span class="bname">{H.escape(b['name'])}</span>
        <span class="bdim">{b['w']:.0f} &times; {b['h']:.0f}</span></figcaption>
      <div class="stage" style="--bw:{b['w']}px; --bh:{b['h']}px">{frag}</div>
    </figure>''')

    options = '\n'.join(
        f'        <option value="{H.escape(k)}"{" selected" if k=="Safe" else ""}>{H.escape(k)}</option>'
        for k in BRANDS)

    page = PAGE.replace('%%BRANDS%%', json.dumps(BRANDS, indent=0)) \
               .replace('%%OPTIONS%%', options) \
               .replace('%%CARDS%%', '\n'.join(cards))
    open(OUT, 'w').write(page)
    shutil.copy(f'{SRC}/tailwind.js', os.path.join(DOC, 'tailwind.js'))
    print(f'wrote {OUT}  ({len(page):,} chars, {len(cards)} boards)')


PAGE = r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Perpie Whitelabel — Canvas</title>
<script>tailwind = { config: { corePlugins: { preflight: false } } };</script>
<script src="./tailwind.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet"/>
<style>
  :root{
    --wl-primary:#121312;
    --wl-blur:#15433c;
    --wl-accent:#118263;
    --wl-on-accent:#ffffff;
    --wl-theme:#ffffff;
    --wl-accent-soft:#7fe3c0;
    --wl-ring-a:#5fddff;
    --wl-ring-b:#28f5a4;
    --wl-ring-c:#15fe85;
    --wl-logo:url('./images/3c6bafb9de31f4ff.png');
    --wl-platform:url('./images/platform-nado.png');
    --ui-bg:#0d0e0d; --ui-panel:#17191a; --ui-line:#282c2e; --ui-fg:#e8ecea; --ui-dim:#8b9490;
  }
  *,::before,::after{box-sizing:border-box}
  body{margin:0;background:var(--ui-bg);color:var(--ui-fg);
       font-family:Inter,system-ui,-apple-system,sans-serif;}

  /* ---------- control bar ---------- */
  .bar{position:sticky;top:0;z-index:9999;background:rgba(13,14,13,.92);
       backdrop-filter:blur(14px);border-bottom:1px solid var(--ui-line);
       padding:10px 18px;display:flex;gap:22px;align-items:center;flex-wrap:wrap}
  .bar h1{font-size:13px;font-weight:700;margin:0 8px 0 0;letter-spacing:.02em;white-space:nowrap}
  .bar h1 small{display:block;font-weight:400;color:var(--ui-dim);font-size:10px;letter-spacing:0}
  .grp{display:flex;gap:7px;align-items:center}
  .grp>label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--ui-dim)}
  .sep{width:1px;height:26px;background:var(--ui-line)}
  select,input[type=text]{background:var(--ui-panel);color:var(--ui-fg);
       border:1px solid var(--ui-line);border-radius:7px;padding:6px 9px;font:inherit;font-size:12px;outline:none}
  select:focus,input[type=text]:focus{border-color:var(--wl-accent)}
  input[type=text]{width:120px}
  input[type=color]{width:30px;height:30px;padding:0;border:1px solid var(--ui-line);
       border-radius:7px;background:var(--ui-panel);cursor:pointer}
  .swatch{display:flex;flex-direction:column;align-items:center;gap:3px}
  .swatch span{font-size:9px;color:var(--ui-dim);letter-spacing:.04em}
  button{background:var(--ui-panel);color:var(--ui-fg);border:1px solid var(--ui-line);
       border-radius:7px;padding:7px 12px;font:inherit;font-size:12px;cursor:pointer}
  button:hover{border-color:var(--wl-accent);color:#fff}
  .logo-prev{width:30px;height:30px;border-radius:50%;border:1px solid var(--ui-line);
       background:var(--wl-logo) center/cover no-repeat}
  .zoom{width:110px;accent-color:var(--wl-accent)}

  /* ---------- gallery ---------- */
  main{padding:26px 18px 80px;display:flex;flex-direction:column;gap:26px}
  .board{margin:0}
  figcaption{display:flex;align-items:baseline;gap:10px;margin:0 0 8px 2px}
  .bname{font-size:12px;font-weight:600;letter-spacing:.03em}
  .bdim{font-size:10px;color:var(--ui-dim);font-variant-numeric:tabular-nums}
  .stage{width:calc(var(--bw) * var(--zoom));height:calc(var(--bh) * var(--zoom));
         overflow:hidden;border:1px solid var(--ui-line);border-radius:12px;
         background:#000;box-shadow:0 12px 34px rgba(0,0,0,.45)}
  .stage>*{transform:scale(var(--zoom));transform-origin:top left;flex:none}
  .wl-logo{background-image:var(--wl-logo)!important}
  .wl-platform{background-image:var(--wl-platform)!important}
</style>
</head>
<body>

<div class="bar">
  <h1>Perpie Whitelabel<small>live canvas · 17 boards</small></h1>

  <div class="grp">
    <label for="preset">Protocol</label>
    <select id="preset">
%%OPTIONS%%
    </select>
  </div>

  <div class="sep"></div>

  <div class="grp">
    <div class="swatch"><input type="color" id="c-primary" value="#121312"><span>Primary</span></div>
    <div class="swatch"><input type="color" id="c-blur"    value="#15433c"><span>Blur</span></div>
    <div class="swatch"><input type="color" id="c-accent"  value="#118263"><span>Accent</span></div>
    <div class="swatch"><input type="color" id="c-theme"   value="#ffffff"><span>Theme</span></div>
  </div>

  <div class="sep"></div>

  <div class="grp">
    <label for="bname">Name</label>
    <input type="text" id="bname" value="Safe" spellcheck="false">
  </div>

  <div class="grp">
    <label>Logo</label>
    <div class="logo-prev" id="logoPrev"></div>
    <button id="logoBtn">Upload…</button>
    <input type="file" id="logoFile" accept="image/*" hidden>
  </div>

  <div class="sep"></div>

  <div class="grp">
    <label for="zoom">Zoom</label>
    <input type="range" class="zoom" id="zoom" min="10" max="100" value="45">
    <span id="zoomVal" style="font-size:11px;color:var(--ui-dim);width:34px">45%</span>
  </div>

  <button id="reset" style="margin-left:auto">Reset</button>
</div>

<main>
%%CARDS%%
</main>

<script>
const BRANDS = %%BRANDS%%;

const root = document.documentElement;
const $ = id => document.getElementById(id);

/* Safe's avatar ring is a bespoke cyan->green gradient. For every other brand we
   derive a comparable ring from its accent so the avatars stay on-brand. */
function hex2hsl(hex){
  let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0,l=(mx+mn)/2;
  if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);
    h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6;}
  return [h*360,s*100,l*100];
}
const hsl=(h,s,l)=>`hsl(${h.toFixed(1)} ${Math.min(100,Math.max(0,s)).toFixed(1)}% ${Math.min(100,Math.max(0,l)).toFixed(1)}%)`;
function ringFrom(accent){
  const [h,s,l]=hex2hsl(accent);
  return [hsl(h+18,Math.max(s,70),Math.max(l+38,62)),
          hsl(h,Math.max(s,72),Math.max(l+28,55)),
          hsl(h-6,Math.max(s,78),Math.max(l+22,50))];
}

function applyLogo(url){
  root.style.setProperty('--wl-logo', `url('${url}')`);
  $('logoPrev').style.backgroundImage = `url('${url}')`;
}

function applyPlatform(url){
  root.style.setProperty('--wl-platform', `url('${url}')`);
}

function applyName(name){
  document.querySelectorAll('.wl-name').forEach(n => n.textContent = name);
}

function luminance(hex){
  const v=hex.replace('#','');
  const ch=c=>c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);
  const [r,g,b]=[0,2,4].map(i=>ch(parseInt(v.slice(i,i+2),16)/255));
  return 0.2126*r+0.7152*g+0.0722*b;
}

function applyColors({primary,blur,accent,theme,ring}){
  root.style.setProperty('--wl-primary',primary);
  root.style.setProperty('--wl-blur',blur);
  root.style.setProperty('--wl-accent',accent);
  { const [h,sa,l]=hex2hsl(accent); root.style.setProperty('--wl-accent-soft',hsl(h,Math.max(sa,55),Math.min(88,l+34))); }
  // labels drawn ON the accent: a bright accent needs near-black, or they vanish
  root.style.setProperty('--wl-on-accent', luminance(accent) > 0.45 ? '#0B1410' : '#FFFFFF');
  root.style.setProperty('--wl-theme',theme);
  const r = ring || ringFrom(accent);
  root.style.setProperty('--wl-ring-a',r[0]);
  root.style.setProperty('--wl-ring-b',r[1]);
  root.style.setProperty('--wl-ring-c',r[2]);
  $('c-primary').value=primary; $('c-blur').value=blur;
  $('c-accent').value=accent;   $('c-theme').value=theme;
}

function applyBrand(key){
  const b = BRANDS[key];
  if(!b) return;
  applyColors(b);
  applyName(b.name || key);
  $('bname').value = b.name || key;
  if(b.logo) applyLogo(b.logo);
  if(b.platform) applyPlatform(b.platform);
}

/* ---- wiring ---- */
$('preset').addEventListener('change', e => applyBrand(e.target.value));

['primary','blur','accent','theme'].forEach(k => {
  $('c-'+k).addEventListener('input', e => {
    root.style.setProperty('--wl-'+k, e.target.value);
    if(k==='accent'){
      const [hh,ss,ll]=hex2hsl(e.target.value);
      root.style.setProperty('--wl-accent-soft',hsl(hh,Math.max(ss,55),Math.min(88,ll+34)));
      const r = ringFrom(e.target.value);
      root.style.setProperty('--wl-ring-a',r[0]);
      root.style.setProperty('--wl-ring-b',r[1]);
      root.style.setProperty('--wl-ring-c',r[2]);
    }
  });
});

$('bname').addEventListener('input', e => applyName(e.target.value));

$('logoBtn').addEventListener('click', () => $('logoFile').click());
$('logoFile').addEventListener('change', e => {
  const f = e.target.files[0]; if(!f) return;
  const fr = new FileReader();
  fr.onload = () => applyLogo(fr.result);
  fr.readAsDataURL(f);
});

const zoom = $('zoom');
function applyZoom(){
  root.style.setProperty('--zoom', zoom.value/100);
  $('zoomVal').textContent = zoom.value + '%';
}
zoom.addEventListener('input', applyZoom);

$('reset').addEventListener('click', () => {
  $('preset').value='Safe'; applyBrand('Safe');
  zoom.value=45; applyZoom();
});

applyZoom();
applyBrand('Safe');
</script>
</body>
</html>
'''

if __name__ == '__main__':
    main()
