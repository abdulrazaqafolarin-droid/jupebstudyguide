#!/usr/bin/env python3
"""Final extraction and generation for all subjects."""
import re
import json
import os
import time
from collections import defaultdict

OUTPUT_DIR = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\output'
os.makedirs(OUTPUT_DIR, exist_ok=True)

SOURCES = {
    "chemistry": r'C:\Users\HP\Downloads\Past questions main\chemistry 2014-2025.txt',
    "physics": r'C:\Users\HP\Downloads\Past questions main\physics 2014-2023.txt',
    "math": r'C:\Users\HP\Downloads\Past questions main\math.txt',
}

def clean_text(t):
    t = re.sub(r'\s+', ' ', t).strip()
    t = t.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
    return t

def extract_options_from_block(block):
    opts = []
    
    # Method 1: **A.** text **B.** text (bold markers)
    bold = re.findall(r'\*\*([A-D])\.\*\*\s*([^*]+?)(?=\*\*[A-D]\.\*\*|\Z|\n\n)', block, re.DOTALL)
    for label, txt in bold:
        t = clean_text(txt)
        if t and len(t) > 1:
            opts.append({"label": label, "text": t})
    
    if 2 <= len(opts) <= 5:
        return opts
    
    # Method 2: Collect option lines, then combine adjacent ones
    # Handle options split across multiple lines and with/without dash prefix
    opt_lines = []
    for line in block.split('\n'):
        s = line.strip()
        s = re.sub(r'^-\s*', '', s)  # Remove leading dash
        # Check if line has option-like content
        if re.search(r'[A-D]\.\s', s) and len(s) > 3 and not s.startswith('**'):
            # Check it's not an answer or page reference
            if not re.search(r'Answer|PAGE|CHECK|JUPEB', s, re.IGNORECASE):
                opt_lines.append(s)
    
    # Combine adjacent option lines and split into individual options
    combined = ' '.join(opt_lines)
    parts = re.split(r'(?=[A-D]\.\s)', combined)
    for p in parts:
        m = re.match(r'^([A-D])[\.\)]\s*(.*)', p.strip())
        if m:
            t = clean_text(m.group(2))
            t = re.sub(r'\s*[B-D]\.\s.*$', '', t)
            if t and len(t) > 1:
                opts.append({"label": m.group(1).upper(), "text": t})
    
    # Deduplicate
    seen = set()
    unique = []
    for o in opts:
        if o["label"] not in seen:
            seen.add(o["label"])
            unique.append(o)
    
    if 2 <= len(unique) <= 5:
        return unique
    
    return []

def extract(subject, path):
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()
    
    # Normalize bold question numbers
    text = re.sub(r'\*\*(\d+)\.\*\*', r'__Q__\1', text)
    # Normalize bold answer markers (but keep **A.** options for now)
    text = re.sub(r'\*\*Answer:?\s*([A-Da-d])[\.\)]?\s*(.*?)\*\*', r'__ANS__\1||\2||', text)
    
    lines = text.split('\n')
    questions = []
    q_num = None
    buffer = []
    current_year = 0
    current_cat = "objective"
    
    for line in lines:
        # Track year - flexible regex (both "JUPEB 2024" and "2024 JUPEB")
        ym = re.findall(r'(\d{4})\s*JUPEB', line, re.IGNORECASE)
        if not ym:
            ym = re.findall(r'JUPEB\s*.{0,30}?(\d{4})', line, re.IGNORECASE)
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
        elif ('MULTIPLE CHOICE' in upper or 'MCQ' in upper or 'OBJECTIVE' in upper) and 'ANSWERS' not in upper and 'MARKING' not in upper:
            current_cat = "objective"
        
        # Skip answer key/marking sections
        if re.search(r'ANSWERS?\s*(?:TO|KEY|:)', line, re.IGNORECASE):
            continue
        if 'MARKING GUIDE' in upper:
            continue
        
        qm = re.match(r'^__Q__(\d+)\s', line)
        if qm:
            stripped = line.replace(f'__Q__{qm.group(1)}', '').strip()
            if re.match(r'^[A-D]\b', stripped) and len(stripped) < 5:
                continue
            
            if buffer and q_num is not None:
                q = make_question(buffer, q_num, current_year, current_cat, subject)
                if q:
                    questions.append(q)
            
            q_num = int(qm.group(1))
            buffer = [line]
        elif q_num is not None:
            s = line.strip()
            if re.match(r'^\d+[\.\)]?\s*[A-D][\.\)]?\s*$', s):
                continue
            if re.match(r'^\d+\s*[A-D]\s*$', s):
                continue
            buffer.append(line)
    
    # Flush last
    if buffer and q_num is not None:
        q = make_question(buffer, q_num, current_year, current_cat, subject)
        if q:
            questions.append(q)
    
    return questions

def make_question(lines, num, year, cat, subject):
    block = '\n'.join(lines)
    opts = extract_options_from_block(block)
    
    # If too many options, clear - it's a parsing error
    if len(opts) > 5:
        opts = []
    
    # Extract answer
    ans = "TBD"
    ans_match = re.search(r'__ANS__([A-Da-d])\|\|(.*?)\|\|', block)
    if ans_match:
        ans = ans_match.group(1).upper()
    
    # Extract question text
    qtext = block
    qtext = re.sub(r'__ANS__[A-Da-d]\|\|.*?\|\|', '', qtext)
    qtext = re.sub(r'__Q__\d+\s*', '', qtext)
    
    # Filter lines
    ql = []
    for l in qtext.split('\n'):
        s = l.strip()
        s_no = re.sub(r'^-\s*', '', s)
        if re.match(r'^[A-D]\.\s', s_no):
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
    check_re = re.compile(r'\([a-z]\)\.?\s*CHECK\s+JUPEB.*', re.IGNORECASE)
    qtext = check_re.sub('', qtext)
    qtext = re.sub(r'\s*[A-D]\.\s+.*$', '', qtext)
    qtext = qtext.strip()
    
    if not qtext or len(qtext) < 5:
        return None
    if re.match(r'^\d+[\.\)]?\s*[A-D]?\.?\s*$', qtext):
        return None
    
    qid = f"{subject}-{year}-{cat}-{num:03d}"
    return {
        "id": qid,
        "question": qtext,
        "subject": subject,
        "year": year,
        "category": cat,
        "options": opts,
        "correctAnswer": ans,
        "explanation": "",
        "answerGuide": "",
        "difficulty": "medium",
        "tags": [subject],
    }

def generate_ts(questions, subject):
    lines = []
    lines.append('import type { StudyQuestion } from "@/types/study-questions";')
    lines.append('')
    lines.append(f'// Auto-generated from source text files')
    lines.append(f'// Subject: {subject}, total: {len(questions)} questions')
    lines.append('')
    lines.append(f'const allQuestions: StudyQuestion[] = [')
    for q in questions:
        lines.append('  {')
        lines.append(f'    id: "{q["id"]}",')
        lines.append(f'    question: `{q["question"]}`,')
        lines.append(f'    subject: "{q["subject"]}",')
        lines.append(f'    year: {q["year"]},')
        lines.append(f'    category: "{q["category"]}",')
        lines.append(f'    correctAnswer: "{q["correctAnswer"]}",')
        lines.append(f'    difficulty: "{q.get("difficulty", "medium")}",')
        if q.get("tags"):
            lines.append(f'    tags: [{", ".join(f"\"{t}\"" for t in q["tags"])}],')
        if q.get("options"):
            lines.append(f'    options: [')
            for o in q["options"]:
                ot = o["text"].replace('`', '\\`').replace('${', '\\${')
                lines.append(f'      {{ label: "{o["label"]}", text: `{ot}` }},')
            lines.append(f'    ],')
        if q.get("explanation"):
            e = q["explanation"].replace('`', '\\`').replace('${', '\\${')
            lines.append(f'    explanation: `{e}`,')
        if q.get("answerGuide"):
            g = q["answerGuide"].replace('`', '\\`').replace('${', '\\${')
            lines.append(f'    answerGuide: `{g}`,')
        lines.append('  },')
    lines.append('];')
    lines.append('')
    lines.append('export function getSubjectQuestions(year: number): {')
    lines.append('  objective: StudyQuestion[];')
    lines.append('  theory: StudyQuestion[];')
    lines.append('  practical: StudyQuestion[];')
    lines.append('} {')
    lines.append('  const yearQs = allQuestions.filter((q) => q.year === year);')
    lines.append('  return {')
    lines.append('    objective: yearQs.filter((q) => q.category === "objective"),')
    lines.append('    theory: yearQs.filter((q) => q.category === "theory"),')
    lines.append('    practical: yearQs.filter((q) => q.category === "practical"),')
    lines.append('  };')
    lines.append('}')
    return '\n'.join(lines)

# Process all subjects
for subject, path in SOURCES.items():
    t0 = time.time()
    print(f"\n=== {subject} ===")
    questions = extract(subject, path)
    elapsed = time.time() - t0
    
    # Stats
    cats = defaultdict(int)
    opt_dist = defaultdict(int)
    ans_count = {"known": 0, "TBD": 0}
    for q in questions:
        cats[q["category"]] += 1
        opt_dist[len(q.get("options", []))] += 1
        if q["correctAnswer"] == "TBD":
            ans_count["TBD"] += 1
        else:
            ans_count["known"] += 1
    
    print(f"  Extracted: {len(questions)} questions in {elapsed:.1f}s")
    print(f"  Categories: {dict(cats)}")
    print(f"  Options: {dict(sorted(opt_dist.items()))}")
    print(f"  Answers: {ans_count}")
    
    # Save JSON
    json_path = os.path.join(OUTPUT_DIR, f"{subject}.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
    print(f"  JSON: {json_path}")
    
    # Save TS
    ts_content = generate_ts(questions, subject)
    ts_path = os.path.join(OUTPUT_DIR, f"{subject}.ts")
    with open(ts_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)
    print(f"  TS: {ts_path} ({len(ts_content)} bytes)")

print("\nDone!")
