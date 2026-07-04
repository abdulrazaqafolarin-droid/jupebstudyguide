import json, re
with open(r'C:\Users\HP\Downloads\2020 2021 math and bio.txt', 'r', encoding='utf-8') as f:
    t = f.read()
m = re.search(r'```json\s*([\s\S]*?)```', t)
raw = m.group(1)
out = []; ins = False; esc = False
for c in raw:
    if esc:
        out.append('\\' + c); esc = False; continue
    if c == '\\' and ins:
        esc = True; continue
    if c == '"':
        ins = not ins
    out.append(c)
data = json.loads(''.join(out))
topics = set()
for item in data:
    topics.add(item.get('topic','?'))
print('Topics:')
for t in sorted(topics):
    print(f'  {t}')
