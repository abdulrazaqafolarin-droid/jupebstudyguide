#!/usr/bin/env python3
"""Full extraction test."""
import re
import json
from collections import defaultdict

import time
t0 = time.time()

with open(r'C:\Users\HP\Downloads\Past questions main\chemistry 2014-2025.txt', 'r', encoding='utf-8', errors='replace') as f:
    text = f.read()

# Normalize
text = re.sub(r'\*\*(\d+)\.\*\*', r'__Q__\1', text)

# Only normalize answer markers, not options (to avoid complexity)
text = re.sub(r'\*\*Answer:?\s*([A-Da-d])[\.\)]?\s*(.*?)\*\*', r'__ANS__\1||\2||', text)

lines = text.split('\n')

def clean_text(t):
    t = re.sub(r'\s+', ' ', t).strip()
    t = t.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
    return t

def extract_options(block):
    """Extract options from a question block."""
    opts = []
    # Method 1: Look for **A.** patterns (bold options)
    bold_opts = re.findall(r'\*\*([A-D])\.\*\*\s*([^*]+?)(?=\*\*[A-D]\.\*\*|\Z)', block, re.DOTALL)
    for label, text_val in bold_opts:
        t = clean_text(text_val)
        if t and len(t) > 1:
            opts.append({"label": label, "text": t})
    
    if len(opts) >= 2:
        return opts
    
    # Method 2: A. text B. text pattern
    if not opts:
        for line in block.split('\n'):
            m = re.match(r'^([A-D])[\.\)]\s*(.{3,}?)\s*$', line.strip())
            if m:
                opts.append({"label": m.group(1), "text": clean_text(m.group(2))})
    
    if len(opts) >= 2:
        return opts
    
    # Method 3: Split line on "X. " pattern
    for line in block.split('\n'):
        s = line.strip()
        parts = re.split(r'(?=[A-D]\.\s)', s)
        if len(parts) >= 2:
            for p in parts:
                m = re.match(r'^([A-D])[\.\)]\s*(.*)', p.strip())
                if m:
                    t = clean_text(m.group(2))
                    # Remove embedded option markers
                    t = re.sub(r'\s*[B-D]\.\s.*$', '', t)
                    if t and len(t) > 1:
                        opts.append({"label": m.group(1), "text": t})
    
    if len(opts) >= 2:
        return opts
    
    return []

# Parse questions
q_num = None
buffer = []
questions = []
current_year = 0
current_cat = "objective"

for line in lines:
    # Track year
    ym = re.findall(r'(?:JUPEB|JUPEB)\s*(?:CHEMISTRY)?\s*(\d{4})', line, re.IGNORECASE)
    for y in ym:
        yi = int(y)
        if 'PAGE' not in line.upper() and 'CONTINUED' not in line.upper():
            current_year = yi
    
    # Track category
    upper = line.upper()
    if 'ESSAY' in upper and 'ANSWERS' not in upper and 'MARKING' not in upper:
        current_cat = "theory"
    elif 'PRACTICAL' in upper and 'ANSWERS' not in upper and 'MARKING' not in upper:
        current_cat = "practical"
    elif ('MULTIPLE CHOICE' in upper or 'MCQ' in upper) and 'ANSWERS' not in upper:
        current_cat = "objective"
    
    # Skip answer key and marking sections
    if re.search(r'ANSWERS?\s*(?:TO|KEY|:)', line, re.IGNORECASE) and ('MULTIPLE' in upper or 'ESSAY' in upper):
        continue
    if 'MARKING GUIDE' in upper:
        continue
    
    qm = re.match(r'^__Q__(\d+)\s', line)
    if qm:
        # Skip answer key
        stripped = line.replace(f'__Q__{qm.group(1)}', '').strip()
        if re.match(r'^[A-D]\b', stripped) and len(stripped) < 5:
            continue
        
        if buffer and q_num is not None:
            block = '\n'.join(buffer)
            opts = extract_options(block)
            
            # Extract answer
            ans = "TBD"
            ans_match = re.search(r'__ANS__([A-Da-d])\|\|(.*?)\|\|', block)
            if ans_match:
                ans = ans_match.group(1).upper()
            
            # Extract question text
            qtext = block
            qtext = re.sub(r'__ANS__[A-Da-d]\|\|.*?\|\|', '', qtext)
            qtext = re.sub(r'__Q__\d+\s*', '', qtext)
            # Remove option lines
            ql = []
            for l in qtext.split('\n'):
                s = l.strip()
                if re.match(r'^[A-D]\.\s', s):
                    continue
                if re.match(r'^\*\*[A-D]\.\*\*', s):
                    continue
                if re.match(r'^#+\s', s):
                    continue
                if re.match(r'^\(?[a-z]\)?\.?\s*CHECK\s+JUPEB', s, re.IGNORECASE):
                    continue
                if re.match(r'^PAGE\s+\d+', s, re.IGNORECASE):
                    continue
                if re.match(r'^---+\s*$', s):
                    continue
                ql.append(l)
            qtext = clean_text('\n'.join(ql))
            check = re.compile(r'\([a-z]\)\.?\s*CHECK\s+JUPEB.*', re.IGNORECASE)
            qtext = check.sub('', qtext)
            qtext = re.sub(r'\s*[A-D]\.\s+.*$', '', qtext)
            qtext = qtext.strip()
            
            if qtext and len(qtext) >= 5:
                qid = f"chemistry-{current_year}-{current_cat}-{q_num:03d}"
                questions.append({
                    "id": qid,
                    "question": qtext,
                    "subject": "chemistry",
                    "year": current_year,
                    "category": current_cat,
                    "options": opts,
                    "correctAnswer": ans,
                    "difficulty": "medium",
                    "tags": ["chemistry"],
                })
        
        q_num = int(qm.group(1))
        buffer = [line]
    elif q_num is not None:
        # Skip answer key entries like "1. C" or "1. C 2. A"
        s = line.strip()
        if re.match(r'^\d+[\.\)]?\s*[A-D][\.\)]?\s*$', s):
            continue
        if re.match(r'^\d+\s*[A-D]\s*$', s):
            continue
        buffer.append(line)

# Flush last
if buffer and q_num is not None:
    block = '\n'.join(buffer)
    opts = extract_options(block)
    ans = "TBD"
    ans_match = re.search(r'__ANS__([A-Da-d])\|\|(.*?)\|\|', block)
    if ans_match:
        ans = ans_match.group(1).upper()
    qtext = block
    qtext = re.sub(r'__ANS__[A-Da-d]\|\|.*?\|\|', '', qtext)
    qtext = re.sub(r'__Q__\d+\s*', '', qtext)
    ql = []
    for l in qtext.split('\n'):
        s = l.strip()
        if re.match(r'^[A-D]\.\s', s):
            continue
        if re.match(r'#+\s', s):
            continue
        if re.match(r'^\(?[a-z]\)?\.?\s*CHECK\s+JUPEB', s, re.IGNORECASE):
            continue
        if re.match(r'^PAGE\s+\d+', s, re.IGNORECASE):
            continue
        if re.match(r'^---+\s*$', s):
            continue
        ql.append(l)
    qtext = clean_text('\n'.join(ql))
    check = re.compile(r'\([a-z]\)\.?\s*CHECK\s+JUPEB.*', re.IGNORECASE)
    qtext = check.sub('', qtext)
    qtext = re.sub(r'\s*[A-D]\.\s+.*$', '', qtext)
    qtext = qtext.strip()
    if qtext and len(qtext) >= 5:
        qid = f"chemistry-{current_year}-{current_cat}-{q_num:03d}"
        questions.append({
            "id": qid,
            "question": qtext,
            "subject": "chemistry",
            "year": current_year,
            "category": current_cat,
            "options": opts,
            "correctAnswer": ans,
            "difficulty": "medium",
            "tags": ["chemistry"],
        })

print(f"Total: {len(questions)} questions, time: {time.time()-t0:.1f}s")

# Stats
cats = defaultdict(int)
opt_dist = defaultdict(int)
ans_count = {"known": 0, "TBD": 0}
for q in questions:
    cats[q["category"]] += 1
    n = len(q.get("options", []))
    opt_dist[str(n)] += 1
    if q["correctAnswer"] == "TBD":
        ans_count["TBD"] += 1
    else:
        ans_count["known"] += 1

print(f"Categories: {dict(cats)}")
print(f"Options distribution: {dict(sorted(opt_dist.items()))}")
print(f"Answers: {ans_count}")

# Save JSON
with open(r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\output\chemistry_test.json', 'w', encoding='utf-8') as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)
print(f"Saved to output/chemistry_test.json")
