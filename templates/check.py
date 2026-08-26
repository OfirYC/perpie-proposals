import re, glob
out = open('/Users/ofirsmolinsky/.pencil/documents/9b458320-11f5-4f92-8d63-0fee60cb3c3f/whitelabel.html').read()
SEP = '  '
raw_frag = sum(open(f).read().count(c) for f in glob.glob('frag/*.html') for c in SEP)
raw_out  = sum(out.count(c) for c in SEP)
# how many survive inside attributes (expected) vs text (bug)
in_attr = sum(m.group(0).count(c) for m in re.finditer(r'data-pencil-name="[^"]*"', out) for c in SEP)
print(f'U+2028/29 in source fragments : {raw_frag}')
print(f'U+2028/29 left in output      : {raw_out}   (in data-pencil-name attrs: {in_attr})')
print(f'converted to <br/>            : {raw_frag - raw_out}')
print(f'total <br/> in output         : {out.count("<br/>")}')
