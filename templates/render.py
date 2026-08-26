#!/usr/bin/env python3
"""Render canvas boards to exact-size PNGs for any protocol brand.

    python3 render.py --brand Vertex --out <dir> [--boards id,id,...] [--scale 2]

Reuses the same tokenised fragments that power whitelabel.html, so a board only
has to be designed once and every protocol falls out of the brand table.
"""
import json, os, re, subprocess, sys, argparse
sys.path.insert(0, '/tmp/wl')
from build import tokenize, fix_linebreaks, unpin, BRANDS   # noqa: E402

SRC = '/tmp/wl'
DOC = '/Users/ofirsmolinsky/.pencil/documents/9b458320-11f5-4f92-8d63-0fee60cb3c3f'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# canonical export names for the boards the proposal uses
NAMES = {
    'OOX4z': 'agent-everywhere',   'yt1By': 'embedded-agent',
    'xRsC0': 'agent-telegram',     'Ef8WO': 'alert-to-action',
    'FRN6Y': 'groups',             'gewms': 'selfcustody',
    'DWe1c': 'charts',             'FBIGP': 'transactional-miniapp',
    'rr9b7': 'traders-tracker',    'R6Bij9': 'ai-feature',
    'cDVcR': 'notifications',      'JjJoA': 'pnlcards',
    'u1FJb': 'batch-transactions', 'irVaR': 'referral-system',
    'JyK2S': 'users-love-tg',      'Khdhh': 'notion-cover',
    'r09PdP': 'partnership-banner',
    'W8XBCF': 'logo',
}

PAGE = """<!doctype html><html><head><meta charset="utf-8"/>
<script>tailwind={{config:{{corePlugins:{{preflight:false}}}}}};</script>
<script src="{doc}/tailwind.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet"/>
<style>
 :root{{
  --wl-primary:{primary}; --wl-blur:{blur}; --wl-accent:{accent}; --wl-theme:{theme};
  --wl-accent-soft:{soft};
  --wl-ring-a:{ring0}; --wl-ring-b:{ring1}; --wl-ring-c:{ring2};
  --wl-logo:url('{logo}');
 }}
 *,::before,::after{{box-sizing:border-box}}
 html,body{{margin:0;padding:0;background:transparent;width:{w}px;height:{h}px;overflow:hidden}}
 .wl-logo{{background-image:var(--wl-logo)!important}}
</style></head><body>{body}</body></html>"""


def hex2hsl(hx):
    hx = hx.lstrip('#')
    r, g, b = (int(hx[i:i+2], 16)/255 for i in (0, 2, 4))
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx+mn)/2
    if mx == mn:
        return 0.0, 0.0, l*100
    d = mx-mn
    s = d/(2-mx-mn) if l > .5 else d/(mx+mn)
    if mx == r:   h = (g-b)/d + (6 if g < b else 0)
    elif mx == g: h = (b-r)/d + 2
    else:         h = (r-g)/d + 4
    return h*60, s*100, l*100


def hsl(h, s, l):
    return f"hsl({h:.1f} {min(100,max(0,s)):.1f}% {min(100,max(0,l)):.1f}%)"


def brand_vars(key):
    b = BRANDS[key]
    h, s, l = hex2hsl(b['accent'])
    ring = b.get('ring') or [hsl(h+18, max(s,70), max(l+38,62)),
                             hsl(h,    max(s,72), max(l+28,55)),
                             hsl(h-6,  max(s,78), max(l+22,50))]
    return dict(primary=b['primary'], blur=b['blur'], accent=b['accent'],
                theme=b['theme'], soft=hsl(h, max(s,55), min(88, l+34)),
                ring0=ring[0], ring1=ring[1], ring2=ring[2],
                logo=os.path.join(DOC, (b.get('logo') or './images/3c6bafb9de31f4ff.png').lstrip('./')),
                name=b['name'])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--brand', default='Vertex')
    ap.add_argument('--out', required=True)
    ap.add_argument('--boards', default='')
    ap.add_argument('--scale', type=int, default=2)
    a = ap.parse_args()

    meta = {b['id']: b for b in json.load(open(f'{SRC}/boards.json'))}
    ids = a.boards.split(',') if a.boards else list(NAMES)
    v = brand_vars(a.brand)
    os.makedirs(a.out, exist_ok=True)
    os.makedirs('/tmp/wl/render', exist_ok=True)

    for bid in ids:
        if bid not in meta:
            print(f'  skip {bid} (not exported)'); continue
        b = meta[bid]
        frag = tokenize(fix_linebreaks(unpin(open(f'{SRC}/frag/{bid}.html').read())))
        # bake the brand name into the live spans
        frag = re.sub(r'<span class="wl-name">[^<]*</span>', v['name'], frag)
        # images are referenced ./images/... -> resolve against the document dir
        frag = frag.replace("url('./images/", f"url('{DOC}/images/")
        html = PAGE.format(doc=DOC, w=int(b['w']), h=int(b['h']), body=frag, **v)
        page = f'/tmp/wl/render/{bid}.html'
        open(page, 'w').write(html)

        name = NAMES.get(bid, bid)
        out = os.path.join(a.out, f'{name}.png')
        subprocess.run([CHROME, '--headless', '--disable-gpu', '--hide-scrollbars',
                        f'--force-device-scale-factor={a.scale}',
                        f'--window-size={int(b["w"])},{int(b["h"])}',
                        '--virtual-time-budget=4000',
                        '--default-background-color=00000000',
                        f'--screenshot={out}', f'file://{page}'],
                       capture_output=True)
        ok = os.path.exists(out)
        print(f'  {name:22} {"ok" if ok else "FAILED":6} {os.path.getsize(out)//1024 if ok else 0}KB')


if __name__ == '__main__':
    main()
