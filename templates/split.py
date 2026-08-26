import json, re, os, sys
src = sys.argv[1]
d = json.loads(open(src).read())
h = d["html"]
open('/tmp/wl/all.html','w').write(h)
inner = h[h.index('>')+1 : h.rindex('</div>')]
VOID = {'br','img','input','meta','link','hr','source','use'}
tok = re.compile(r'<(/?)([a-zA-Z][-a-zA-Z0-9]*)\b[^>]*?(/?)>', re.S)
depth = 0; start = None; boards = []
for m in tok.finditer(inner):
    closing, name, sc = m.group(1), m.group(2).lower(), m.group(3)
    if closing:
        depth -= 1
        if depth == 0 and start is not None:
            boards.append(inner[start:m.end()]); start = None
    else:
        if sc or name in VOID: continue
        if depth == 0: start = m.start()
        depth += 1
os.makedirs('/tmp/wl/frag', exist_ok=True)
meta = []
for b in boards:
    pid = re.search(r'data-pencil-id="([^"]+)"', b).group(1)
    nm  = re.search(r'data-pencil-name="([^"]*)"', b).group(1)
    cls = re.search(r'class="([^"]*)"', b).group(1)
    w = re.search(r'w-\[([\d.]+)px\]', cls); ht = re.search(r'h-\[([\d.]+)px\]', cls)
    open(f'/tmp/wl/frag/{pid}.html','w').write(b)
    meta.append({'id':pid,'name':nm,'w':float(w.group(1)),'h':float(ht.group(1)),'chars':len(b)})
json.dump(meta, open('/tmp/wl/boards.json','w'), indent=1)
print("boards:", len(boards))
