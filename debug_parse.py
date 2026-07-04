import json

with open(r'C:\Users\HP\Downloads\2015 math and bio.txt', 'r', encoding='utf-8') as f:
    text = f.read()

bio_idx = text.find('\n**BIOLOGY')
math_raw = text[text.find('{', text.find('MATH')):bio_idx].strip()

# Count brace-matched objects
depth = 0
count = 0
for ch in math_raw:
    if ch == '{': depth += 1
    elif ch == '}': depth -= 1
    if depth == 0 and ch == '}': count += 1
print(f"Brace-matched objects in math: {count}")

# Try line-by-line
lines = math_raw.split('\n\n')
parsed = 0
for l in lines:
    l = l.strip()
    if not l.startswith('{'): continue
    try:
        json.loads(l)
        parsed += 1
    except:
        pass
print(f"Direct parse (no escaping): {parsed}")

# Check the first line
for l in lines:
    l = l.strip()
    if not l.startswith('{'): continue
    bs_count = l.count(chr(92))
    print(f"First line backslash count: {bs_count}")
    print(f"First 100 chars: {repr(l[:100])}")
    break

# Try naive escape - replace each \ with \\
parsed2 = 0
for l in lines:
    l = l.strip()
    if not l.startswith('{'): continue
    try:
        json.loads(l.replace(chr(92), chr(92) + chr(92)))
        parsed2 += 1
    except:
        pass
print(f"Double-escaped: {parsed2}")
