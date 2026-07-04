import re, json

with open(r'C:\Users\HP\Downloads\2023 math new.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Strip header/footer
text = re.sub(r'^Got it.*?\n---\n', '', text)
text = re.sub(r'\n---\n\*\*Flag:.*', '', text, flags=re.DOTALL)

blocks = re.split(r'\*\*(\d+)\.\*\*\s+', text)

# Keep only last occurrence for duplicates
seen = {}
for i in range(1, len(blocks)-1, 2):
    num = int(blocks[i])
    seen[num] = blocks[i+1]

questions = []

for num in sorted(seen.keys()):
    content = seen[num].strip()
    lines = content.split('\n')

    # Find option start
    opt_start = None
    for idx, line in enumerate(lines):
        if re.search(r'(^|\s)\*{0,2}[A-D]\.\s', line):
            opt_start = idx
            break

    if opt_start is None:
        print(f"Q{num}: no options")
        questions.append({
            'number': num, 'question': content[:100],
            'options': {}, 'correct': None, 'explanation': ''
        })
        continue

    q_text = ' '.join(lines[:opt_start]).strip()
    q_text = re.sub(r'\s+', ' ', q_text)

    opt_text = ' '.join(lines[opt_start:])

    options = {}
    correct_label = None

    # 1. Find bold correct answers: **X. text ✓** or **X ✓**
    cm = re.search(r'\*\*([A-D])\s*[.✓]\s*(.*?)\s*✓\s*\*\*', opt_text)
    if cm:
        correct_label = cm.group(1)
        txt = cm.group(2).strip().rstrip('*').strip()
        if txt:
            options[cm.group(1)] = txt
    else:
        # Try **X ✓** (just letter + checkmark)
        cm2 = re.search(r'\*\*([A-D])\s*✓\s*\*\*', opt_text)
        if cm2:
            correct_label = cm2.group(1)

    # 2. Parse all options
    # Split on option markers at word boundaries
    opt_matches = list(re.finditer(r'(?:\*{0,2})([A-D])\.\s+', opt_text))
    for idx, m in enumerate(opt_matches):
        label = m.group(1)
        start = m.end()
        if idx + 1 < len(opt_matches):
            end = opt_matches[idx+1].start()
        else:
            end = len(opt_text)
        txt = opt_text[start:end].strip().rstrip('*').strip()
        if label not in options:
            options[label] = txt

    # Organize A-D
    ordered = {}
    for label in ['A', 'B', 'C', 'D']:
        if label in options:
            ordered[label] = options[label]

    questions.append({
        'number': num,
        'question': q_text,
        'options': ordered,
        'correct': correct_label,
        'explanation': ''
    })

questions.sort(key=lambda x: x['number'])

print(f"Parsed {len(questions)} questions")
issues = []
for q in questions:
    opts = q['options']
    c = q['correct']
    ok = len(opts) == 4
    if not ok or not c:
        issues.append(q['number'])
    print(f"  Q{q['number']:>2}: correct={c} opts={len(opts)} {'OK' if ok and c else 'ISSUE!'}")

if issues:
    print(f"\nIssues: Q{', '.join(str(x) for x in issues)}")

with open('2023_parsed.json', 'w', encoding='utf-8') as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)
print(f"Saved to 2023_parsed.json")
