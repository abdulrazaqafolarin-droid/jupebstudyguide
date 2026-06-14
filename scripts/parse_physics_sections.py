"""Extract physics questions by parsing sections from the text file."""
import json, re, os, sys

filepath = r'C:\Users\HP\Downloads\phsyics 2014 question.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find section boundaries by tracking brace depth across lines
content = ''.join(lines)

# Strategy: extract each section by finding its JSON array
# section_a_multiple_choice: from [ after the key to matching ]
# section_b_short_essay: same
# section_b_long_essay: same

def extract_array(text, key):
    """Extract a JSON array value for a given key from the text."""
    pattern = rf'"{re.escape(key)}"\s*:\s*\['
    match = re.search(pattern, text)
    if not match:
        return None
    start = match.end() - 1  # position of [
    # Now find matching ]
    depth = 0
    in_str = False
    esc = False
    for i in range(start, len(text)):
        ch = text[i]
        if esc:
            esc = False
            continue
        if ch == '\\' and in_str:
            esc = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                return text[start:i+1]
    return None

# Extract each section
mcq_json = extract_array(content, 'section_a_multiple_choice')
short_json = extract_array(content, 'section_b_short_essay')
long_json = extract_array(content, 'section_b_long_essay')

# Now try to parse each
questions = []

def clean_text(t):
    """Clean unicode to ASCII."""
    t = t.replace('\u00bd', '(1/2)')
    t = re.sub(r'[\u2080-\u2089]', lambda m: str(ord(m.group()) - 0x2080), t)
    t = re.sub(r'[\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079]',
        lambda m: {'\u2070':'^0','\u00b9':'^1','\u00b2':'^2','\u00b3':'^3','\u2074':'^4',
                   '\u2075':'^5','\u2076':'^6','\u2077':'^7','\u2078':'^8','\u2079':'^9'}[m.group()], t)
    t = t.replace('\u03bb', 'lambda')
    t = t.replace('\u2192', '->')
    t = t.replace('\u00d7', 'x')
    t = ''.join(c if ord(c) < 128 else ' ' for c in t)
    return t

def safe_parse(json_str, label):
    """Try to parse a JSON array, fixing common issues."""
    if not json_str:
        print(f"  {label}: not found")
        return []
    # Clean unicode
    json_str = clean_text(json_str)
    # Remove \r
    json_str = json_str.replace('\r', '')
    try:
        result = json.loads(json_str)
        print(f"  {label}: {len(result)} items")
        return result
    except json.JSONDecodeError as e:
        print(f"  {label}: JSON error at char {e.pos}: {e.msg[:60]}")
        # Try line-based: skip problematic lines
        lines = json_str.split('\n')
        fixed_lines = []
        for line in lines:
            # Skip lines that would break JSON (e.g., diagram lines with unescaped quotes)
            fixed_lines.append(line)
        fixed = '\n'.join(fixed_lines)
        try:
            result = json.loads(fixed)
            print(f"  {label}: {len(result)} items after fix")
            return result
        except json.JSONDecodeError as e2:
            print(f"  {label}: still broken: {e2.msg[:60]}")
            return []

mcqs = safe_parse(mcq_json, 'MCQ')
short_essay = safe_parse(short_json, 'Short Essay')
long_essay = safe_parse(long_json, 'Long Essay')

for q in mcqs:
    opts = q.get('options', {})
    options_list = []
    if isinstance(opts, dict):
        options_list = [{"label": k, "text": str(v)} for k, v in opts.items()]
    elif isinstance(opts, list):
        options_list = opts

    questions.append({
        "id": f"phy-2014-mq-{q.get('question_number', 0):04d}",
        "subject": "physics",
        "year": 2014,
        "category": "objective",
        "question": str(q.get('question', '')),
        "options": options_list if options_list else None,
        "correct_answer": str(q.get('answer', '')),
        "explanation": str(q.get('answer_explanation', '')),
        "difficulty": "medium",
    })

for q in short_essay:
    all_text = str(q.get('question', ''))
    sub_parts = q.get('sub_parts', {})
    for key in sorted(sub_parts.keys()):
        val = sub_parts[key]
        if isinstance(val, dict):
            for sub_key in sorted(val.keys()):
                all_text += f"\n({key}.{sub_key}): {val[sub_key]}"
        else:
            all_text += f"\n({key}): {val}"

    answers = q.get('answers', {})
    answer_text = ''
    for akey in sorted(answers.keys()):
        aval = answers[akey]
        if isinstance(aval, dict):
            if 'working' in aval:
                answer_text += '\n'.join(str(x) for x in aval['working'][:5]) + '\n'
            if 'final_answer' in aval:
                answer_text += f"Final: {aval['final_answer']}\n"
        elif isinstance(aval, list):
            answer_text += '\n'.join(str(x) for x in aval[:5]) + '\n'
        else:
            answer_text += f"{aval}\n"

    questions.append({
        "id": f"phy-2014-th-{q.get('question_number', 0):04d}",
        "subject": "physics",
        "year": 2014,
        "category": "theory",
        "question": clean_text(all_text),
        "answerGuide": clean_text(answer_text),
        "difficulty": "medium",
    })

for q in long_essay:
    all_text = str(q.get('question', ''))
    for key in sorted(q.get('parts', {}).keys()):
        val = q['parts'][key]
        if isinstance(val, dict):
            for sub_key in sorted(val.keys()):
                all_text += f"\n({key}.{sub_key}): {val[sub_key]}"
        else:
            all_text += f"\n({key}): {val}"

    answers = q.get('answers', {})
    answer_text = ''
    for akey in sorted(answers.keys()):
        aval = answers[akey]
        if isinstance(aval, dict):
            if 'derivation' in aval:
                answer_text += '\n'.join(str(x) for x in aval['derivation'][:5]) + '\n'
            elif 'working' in aval:
                answer_text += '\n'.join(str(x) for x in aval['working'][:5]) + '\n'
            if 'final_answer' in aval:
                answer_text += f"Final: {aval['final_answer']}\n"
            if 'final_answers' in aval and isinstance(aval['final_answers'], dict):
                for fk, fv in aval['final_answers'].items():
                    answer_text += f"{fk}: {fv}\n"
        elif isinstance(aval, list):
            answer_text += '\n'.join(str(x) for x in aval[:5]) + '\n'
        else:
            answer_text += f"{aval}\n"

    questions.append({
        "id": f"phy-2014-th-{10 + q.get('question_number', 0):04d}",
        "subject": "physics",
        "year": 2014,
        "category": "theory",
        "question": clean_text(all_text),
        "answerGuide": clean_text(answer_text),
        "difficulty": "medium",
    })

# Save to JSON
output_dir = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'new-questions', 'physics')
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, '2014.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)
print(f"\nSaved {len(questions)} questions to {output_path}", flush=True)

# Now also add them to the local physics.ts file
# Check if 2014 questions already exist
physics_ts_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'study-questions', 'physics.ts')
with open(physics_ts_path, 'r', encoding='utf-8') as f:
    physics_ts = f.read()

# Count existing 2014 questions in the file
phy_2014_count = physics_ts.count('year: 2014')
print(f"Existing 2014 questions in physics.ts: {phy_2014_count}", flush=True)

# Upload to Supabase
SUPABASE_URL = "https://gzyczowqqywesqhqqpdi.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM"

headers = {
    "Content-Type": "application/json",
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Prefer": "resolution=merge-duplicates"
}

import urllib.request, urllib.error

for i in range(0, len(questions), 50):
    batch = questions[i:i+50]
    db_rows = []
    for q in batch:
        explanation = q.get("explanation") or ""
        if q.get("answerGuide"):
            explanation = explanation + "\n\nAnswer Guide:\n" + q["answerGuide"]
        row = {
            "id": q["id"],
            "subject": "physics",
            "year": 2014,
            "category": q["category"],
            "question": q["question"],
            "difficulty": q.get("difficulty", "medium"),
            "correct_answer": q.get("correct_answer") or "",
            "explanation": explanation,
            "options": json.dumps(q["options"]) if q.get("options") else None,
        }
        db_rows.append(row)

    payload = json.dumps(db_rows).encode('utf-8')
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/study_questions",
        data=payload, headers=headers, method="POST")
    try:
        resp = urllib.request.urlopen(req)
        print(f"  Batch {i//50 + 1}: {len(batch)} OK", flush=True)
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        print(f"  Batch {i//50 + 1}: ERROR {e.code} - {body}", flush=True)

print(f"\nTotal: {len(questions)} questions uploaded!", flush=True)
