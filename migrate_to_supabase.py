"""Migrate all chemistry study questions from chemistry.ts to Supabase."""

import re
import json
import sys
import urllib.request
import urllib.error
from collections import Counter

SUPABASE_URL = "https://gzyczowqqywesqhqqpdi.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM"

chem_path = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\study-questions\chemistry.ts'

with open(chem_path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"File size: {len(content)} chars")

# Extract array: find [ after "const chemistryQuestions" and matching ]
start_marker = "const chemistryQuestions"
arr_start = content.find(start_marker)
arr_start = content.find("[", arr_start)
export_pos = content.find("export", arr_start)  # find "export" after array
arr_end = content.rfind("]", arr_start, export_pos)  # last ] before export
array_text = content[arr_start + 1 : arr_end]

print(f"Array text length: {len(array_text)}")

# Split into individual question objects by tracking brace depth
entries = []
depth = 0
in_str = False
sc = None
bs = False
buf_start = -1

for idx, ch in enumerate(array_text):
    if in_str:
        if bs:
            bs = False
        elif ch == '\\':
            bs = True
        elif ch == sc:
            in_str = False
        continue

    if ch in '"\'':
        in_str = True
        sc = ch
        continue

    if ch == '{':
        if depth == 0:
            buf_start = idx
        depth += 1
    elif ch == '}':
        depth -= 1
        if depth == 0 and buf_start >= 0:
            entries.append(array_text[buf_start:idx+1])
            buf_start = -1

print(f"Found {len(entries)} question entries")

def parse_field(block, field_name):
    """Extract a string value from a field: `field: value`"""
    # Try backtick first
    m = re.search(rf'{field_name}\s*:\s*`([^`]*)`', block, re.DOTALL)
    if m:
        return m.group(1).strip()
    # Try double-quoted
    m = re.search(rf'{field_name}\s*:\s*"((?:[^"\\]|\\.)*)"', block)
    if m:
        return m.group(1)
    # Try single-quoted
    m = re.search(rf"{field_name}\s*:\s*'([^']*)'", block)
    if m:
        return m.group(1)
    return None

def parse_field_int(block, field_name):
    m = re.search(rf'{field_name}\s*:\s*(\d+)', block)
    return int(m.group(1)) if m else None

def parse_options(block):
    """Parse options array from a question block."""
    opt_start = block.find("options:")
    if opt_start == -1:
        return None
    arr_start = block.find("[", opt_start)
    if arr_start == -1:
        return None
    opts_text = block[arr_start:]
    # Track depth to find end of array
    depth = 0
    in_str = False
    sc = None
    bs = False
    arr_end = -1
    for j, ch in enumerate(opts_text):
        if in_str:
            if bs:
                bs = False
            elif ch == '\\':
                bs = True
            elif ch == sc:
                in_str = False
            continue
        if ch in '"\'':
            in_str = True
            sc = ch
            continue
        if ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                arr_end = j + 1
                break
    if arr_end == -1:
        return None
    array_content = opts_text[0:arr_end]
    # Extract option objects
    opts = []
    for om in re.finditer(r"\{\s*label\s*:\s*['\"]([^'\"]+)['\"]\s*,\s*text\s*:\s*\"((?:[^\"\\]|\\.)*)\"\s*\}", array_content):
        opts.append({"label": om.group(1), "text": om.group(2)})
    return opts if opts else None

parsed = []
for entry in entries:
    eid = parse_field(entry, "id")
    if not eid:
        continue
    e = {
        "id": eid,
        "subject": parse_field(entry, "subject") or "chemistry",
        "year": parse_field_int(entry, "year") or 0,
        "category": parse_field(entry, "category") or "obj",
        "question": parse_field(entry, "question") or "",
        "options": parse_options(entry),
        "correct_answer": parse_field(entry, "correctAnswer"),
        "explanation": parse_field(entry, "explanation"),
        "difficulty": parse_field(entry, "difficulty") or "medium",
        "course": parse_field(entry, "course"),
    }
    parsed.append(e)

print(f"Parsed {len(parsed)} entries with valid IDs")

# Stats
years = Counter()
for e in parsed:
    years[e["year"]] += 1
print(f"By year: {dict(sorted(years.items()))}")
cats = Counter()
for e in parsed:
    cats[e["category"]] += 1
print(f"By category: {dict(sorted(cats.items()))}")

# Insert into Supabase in batches of 50
headers = {
    "Content-Type": "application/json",
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Prefer": "resolution=merge-duplicates"
}

batch_size = 50
success = 0
errors = 0

for i in range(0, len(parsed), batch_size):
    batch = parsed[i:i+batch_size]
    db_rows = []
    for e in batch:
        row = {
            "id": e["id"],
            "subject": e["subject"],
            "year": e["year"],
            "category": e["category"],
            "question": e["question"],
            "difficulty": e["difficulty"],
            "options": json.dumps(e["options"]) if e.get("options") else None,
            "correct_answer": e.get("correct_answer"),
            "explanation": e.get("explanation"),
            "course": e.get("course"),
        }
        db_rows.append(row)

    payload = json.dumps(db_rows).encode('utf-8')
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/study_questions",
        data=payload,
        headers=headers,
        method="POST"
    )
    try:
        resp = urllib.request.urlopen(req)
        success += len(batch)
        print(f"  Batch {i//batch_size + 1}: {len(batch)} inserted OK")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        errors += len(batch)
        print(f"  Batch {i//batch_size + 1}: ERROR {e.code} - {body[:300]}")

print(f"\nDone! {success} inserted, {errors} errors")
