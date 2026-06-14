"""Generic parser for JUPEB Physics JSON files (year as argument)."""
import json, re, os, sys, urllib.request, urllib.error

year = sys.argv[1] if len(sys.argv) > 1 else None
if not year:
    print("Usage: python3 scripts/parse_physics_generic.py <year>")
    sys.exit(1)

filepath = f'C:/Users/HP/Downloads/{year} physics.txt'
fallback = f'C:/Users/HP/Downloads/{year} physics que.txt'
if not os.path.exists(filepath):
    filepath = fallback

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'```json\s*(\{.*?\})\s*```', content, re.DOTALL)
if not match:
    # Try raw JSON (no code block)
    match = re.search(r'(\{.*"exam".*\})', content, re.DOTALL)
if not match:
    print(f"ERROR: Could not find JSON in {filepath}")
    sys.exit(1)

json_str = match.group(1)

def clean_text(t):
    if not isinstance(t, str): return t
    subs = {'\u2018':"'",'\u2019':"'",'\u201c':'"','\u201d':'"','\u2013':'--','\u2014':'--',
            '\u2026':'...','\u00bd':'(1/2)','\u2153':'(1/3)',
            '\u00b9':'^1','\u00b2':'^2','\u00b3':'^3',
            '\u2070':'^0','\u2074':'^4','\u2075':'^5','\u2076':'^6',
            '\u2077':'^7','\u2078':'^8','\u2079':'^9',
            '\u03bb':'lambda','\u03b2':'beta','\u2192':'->','\u00d7':'x',
            '\u03bc':'u','\u03bc':'u','\u2126':'ohm',
            '\u2248':'~','\u2261':'=','\u0398':'Theta','\u03b1':'alpha',
            '\u03b3':'gamma','\u03b4':'delta','\u03c0':'pi',
            '\u03c1':'rho','\u03c3':'sigma','\u03c9':'omega',
            '\u0394':'Delta','\u03a3':'Sigma','\u03a9':'Omega'}
    for k, v in subs.items(): t = t.replace(k, v)
    t = re.sub(r'[\u2080-\u2089]', lambda m: str(ord(m.group()) - 0x2080), t)
    return ''.join(c if ord(c) < 128 else ' ' for c in t)

def fix_options(opts):
    if not opts: return None
    if isinstance(opts, dict):
        return [{"label": k, "text": clean_text(str(v))} for k, v in opts.items()]
    return None

try:
    data = json.loads(json_str)
except json.JSONDecodeError:
    json_str = clean_text(json_str)
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        print(f"JSON error: {e.msg}")
        sys.exit(1)

sections = data['exam']['sections']
questions = []

section_a = sections[0]
if 'multiple choice' in section_a.get('title', '').lower():
    for q in section_a['questions']:
        qn_raw = q.get('number', q.get('num', 0))
        qn = int(re.match(r'\d+', str(qn_raw)).group())
        tags = ''
        if 'topic' in q: tags += f"[{q['topic']}] "
        if 'note' in q: tags += f"(Note: {q['note']}) "
        questions.append({
            "id": f"phy-{year}-mq-{qn:04d}",
            "subject": "physics",
            "year": int(year),
            "category": "objective",
            "question": clean_text(tags + q['question']),
            "options": fix_options(q.get('options')),
            "correct_answer": q.get('answer', ''),
            "explanation": clean_text(q.get('solution', q.get('explanation', ''))),
            "difficulty": "medium",
        })

for sec in sections[1:]:
    title_lower = sec.get('title', '').lower()
    if 'essay' in title_lower or 'theory' in title_lower:
        for eq in sec.get('questions', []):
            q_num_raw = str(eq['number'])
            m = re.match(r'(\d+)\s*(.*)', q_num_raw)
            q_num = int(m.group(1))
            q_suffix = m.group(2).strip().replace(' ', '_').replace('/', '_') if m.group(2).strip() else ''
            all_text = ""
            q_explanation = ""
            for part in eq.get('parts', []):
                pl = part.get('part', '')
                if 'question' in part:
                    all_text += f"\n({pl}): {part['question']}"
                for sp in part.get('sub_parts', []):
                    sp_id = sp.get('sub', '')
                    if 'question' in sp:
                        m = sp.get('marks', '')
                        all_text += f"\n({pl}.{sp_id}): {sp['question']}" + (f" ({m} marks)" if m else "")
                    sol = sp.get('solution', '')
                    if isinstance(sol, dict):
                        for k, v in sol.items():
                            q_explanation += f"\n{k}: {v}"
                    elif isinstance(sol, str):
                        q_explanation += f"\n{sol}"
                sol = part.get('solution', '')
                if isinstance(sol, dict):
                    for k, v in sol.items():
                        if isinstance(v, str): q_explanation += f"\n{k}: {v}"
                elif isinstance(sol, str):
                    q_explanation += f"\n{sol}"

            suffix_part = f'-{q_suffix}' if q_suffix else ''
            questions.append({
                "id": f"phy-{year}-th-{q_num:04d}{suffix_part}",
                "subject": "physics",
                "year": int(year),
                "category": "theory",
                "question": clean_text(all_text.strip()),
                "explanation": clean_text(q_explanation.strip()),
                "difficulty": "medium",
            })

output_dir = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'new-questions', 'physics')
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, f'{year}.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)
print(f"Saved {len(questions)} questions to {output_path}", flush=True)

SUPABASE_URL = "https://gzyczowqqywesqhqqpdi.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM"
headers = {
    "Content-Type": "application/json",
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Prefer": "resolution=merge-duplicates"
}

for i in range(0, len(questions), 50):
    batch = questions[i:i+50]
    db_rows = []
    for q in batch:
        row = {"id": q["id"], "subject": "physics", "year": int(year),
               "category": q["category"], "question": q["question"],
               "difficulty": "medium", "correct_answer": q.get("correct_answer") or None,
               "explanation": q.get("explanation") or None,
               "options": json.dumps(q["options"]) if q.get("options") else None}
        db_rows.append(row)
    payload = json.dumps(db_rows).encode('utf-8')
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/study_questions", data=payload, headers=headers, method="POST")
    try:
        urllib.request.urlopen(req)
        print(f"  Batch {i//50+1}: {len(batch)} OK", flush=True)
    except urllib.error.HTTPError as e:
        print(f"  Batch {i//50+1}: ERROR {e.code} - {e.read().decode()[:200]}", flush=True)

print(f"\nTotal: {len(questions)} questions for {year} uploaded!", flush=True)
