#!/usr/bin/env python3
"""Extract MCQs from source text files, add to existing data to reach 50/year."""

import re, os, json, random
from collections import defaultdict, Counter

STUDY_DIR = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\study-questions'
SRC_DIR = r'C:\Users\HP\Downloads\Past questions main'
TARGET = 50

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def extract_chemistry_questions(content):
    """Extract MCQs from chemistry 2014-2025.txt by year."""
    questions = []
    
    # Split file by year sections
    # Year sections are marked like: "JUPEB 2024", "JUPEB 2023", etc.
    year_positions = []
    for y in range(2014, 2026):
        patterns = [
            rf'JUPEB\s+{y}\b',
            rf'JUPEB CHEMISTRY {y}\b',
            rf'{y}\s*JUPEB',
            rf'JUPEB\s+2024.*?(?=JUPEB\s+{y}\b|JUPEB CHEMISTRY {y}\b|$)',
        ]
        for pat in patterns:
            for m in re.finditer(pat, content, re.IGNORECASE):
                year_positions.append((m.start(), y, pat))
                break
    
    if not year_positions:
        # Fallback: look for "# JUPEB CHEMISTRY 2025" style
        for m in re.finditer(r'#+\s*JUPEB.*?(\d{4})', content, re.IGNORECASE):
            y = int(m.group(1))
            if 2014 <= y <= 2025:
                year_positions.append((m.start(), y, 'header'))
    
    year_positions.sort()
    
    for i, (pos, year, _) in enumerate(year_positions):
        end_pos = year_positions[i+1][0] if i+1 < len(year_positions) else len(content)
        section = content[pos:end_pos]
        
        # Only extract from MCQ sections (skip essay/answer sections)
        # MCQ sections contain lines like "**1.**" followed by options
        section_lines = section.split('\n')
        
        current_q = None
        for line in section_lines:
            # Check if line has MCQ question number
            qm = re.match(r'^\s*(?:\*\*)?(\d{1,2})(?:\.|\))\s*(?:\*\*)?\s*(.*)', line)
            if qm:
                qnum = int(qm.group(1))
                rest = qm.group(2).strip()
                
                # Skip if this is an answer/essay section
                if any(kw in rest.lower() for kw in ['answer', 'essay', 'marking guide', 'practical']):
                    current_q = None
                    continue
                
                # Skip if rest is too short (answer key line like "1. B")
                if re.match(r'^[A-D]\s', rest) or len(rest) < 5:
                    current_q = None
                    continue
                
                # Start new question
                if current_q:
                    questions.append(current_q)
                
                current_q = {'year': year, 'num': qnum, 'text': rest, 'options': []}
                continue
            
            # Check for options: "A. opt B. opt C. opt D. opt"
            if current_q:
                opt_m = re.match(r'^\s*(?:- )?([A-D])[.)]\s*(.*?)(?=\s+[A-D][.)]\s|$)', line)
                # Full line match: find all A. B. C. D. patterns
                opts = re.findall(r'([A-D])[.)\s]+([^A-D]*(?=[A-D][.)]|$))', line)
                if opts:
                    for l, t in opts:
                        t = t.strip().rstrip(',')
                        if t and len(t) > 1:
                            current_q['options'].append((l, t))
                elif line.strip() and not line.strip().startswith(('-', '*', '#', '>')):
                    curr_text = current_q['text']
                    if len(curr_text) < len(line.strip()):
                        current_q['text'] = line.strip()
    
        if current_q:
            questions.append(current_q)
    
    # Filter: only questions with at least 3 options
    questions = [q for q in questions if len(q['options']) >= 3]
    
    # Deduplicate by text
    seen = set()
    unique = []
    for q in questions:
        qt = q['text'][:50]
        if qt not in seen:
            seen.add(qt)
            unique.append(q)
    
    return unique

def extract_physics_questions(content):
    """Extract MCQs from physics file."""
    questions = []
    
    # Year sections: "## 2014 JUPEB PHYSICS", "## 2015 JUPEB PHYSICS", etc.
    year_headers = list(re.finditer(r'##\s*(\d{4})\s*JUPEB\s*PHYSICS', content, re.IGNORECASE))
    
    for i, m in enumerate(year_headers):
        year = int(m.group(1))
        start = m.start()
        end = year_headers[i+1].start() if i+1 < len(year_headers) else len(content)
        section = content[start:end]
        
        current_q = None
        for line in section.split('\n'):
            # Question line: "**1.** question" or "**1.** question"
            qm = re.match(r'^(\s*\*{0,2})(\d{1,2})(?:\.|\))\s*\*{0,2}\s*(.*)', line)
            if qm:
                qnum = int(qm.group(2))
                rest = qm.group(3).strip()
                
                if not rest or len(rest) < 5 or re.match(r'^[A-D]\b', rest):
                    if current_q:
                        questions.append(current_q)
                    current_q = None
                    continue
                
                if any(kw in rest.lower() for kw in ['answer', 'essay', 'section b']):
                    if current_q:
                        questions.append(current_q)
                    current_q = None
                    continue
                
                if current_q:
                    questions.append(current_q)
                
                current_q = {'year': year, 'num': qnum, 'text': rest, 'options': []}
                continue
            
            if current_q and line.strip():
                # Find options: "- A. opt B. opt C. opt D. opt"
                opts = re.findall(r'([A-D])[.)]\s*([^A-D]*)', line)
                if opts and len(opts) >= 3:
                    for l, t in opts:
                        t = t.strip().rstrip(',')
                        if t and len(t) > 1:
                            current_q['options'].append((l, t))
    
        if current_q:
            questions.append(current_q)
    
    questions = [q for q in questions if len(q['options']) >= 3]
    seen = set()
    unique = []
    for q in questions:
        qt = q['text'][:60]
        if qt not in seen:
            seen.add(qt)
            unique.append(q)
    return unique

def extract_math_questions(content):
    """Extract MCQs from math file - has 2020, 2022, 2023, 2024 sections."""
    questions = []
    
    # Find year sections
    year_headers = list(re.finditer(r'##\s*JUPEB\s*MATHEMATICS.*?(\d{4})', content, re.IGNORECASE))
    
    for i, m in enumerate(year_headers):
        year = int(m.group(1))
        start = m.start()
        end = year_headers[i+1].start() if i+1 < len(year_headers) else len(content)
        section = content[start:end]
        
        current_q = None
        for line in section.split('\n'):
            qm = re.match(r'^\s*\*{0,2}(\d{1,2})(?:\.|\))\s*\*{0,2}\s*(.*)', line)
            if qm:
                qnum = int(qm.group(1))
                rest = qm.group(2).strip()
                
                if not rest or len(rest) < 5:
                    if current_q:
                        questions.append(current_q)
                    current_q = None
                    continue
                
                if any(kw in rest.lower() for kw in ['section b', 'essay', 'answer']):
                    if current_q:
                        questions.append(current_q)
                    current_q = None
                    continue
                
                if current_q:
                    questions.append(current_q)
                
                current_q = {'year': year, 'num': qnum, 'text': rest, 'options': []}
                continue
            
            if current_q and line.strip():
                # Format: "- A. opt B. opt C. opt D. opt"
                opts = re.findall(r'([A-D])[.)]\s*([^A-D]*)', line)
                if opts:
                    for l, t in opts:
                        t = t.strip().rstrip(',')
                        if t and len(t) > 1:
                            current_q['options'].append((l, t))
    
        if current_q:
            questions.append(current_q)
    
    questions = [q for q in questions if len(q['options']) >= 3]
    seen = set()
    unique = []
    for q in questions:
        qt = q['text'][:60]
        if qt not in seen:
            seen.add(qt)
            unique.append(q)
    return unique

def extract_existing_questions(content):
    """Get existing question data from current TS files."""
    questions = []
    i = 0
    while True:
        idx = content.find('{', i)
        if idx < 0:
            break
        # Quick check: does it have id?
        if 'id"' not in content[idx:idx+80] and 'id:' not in content[idx:idx+80]:
            i = idx + 1
            continue
        
        depth = 0
        j = idx
        while j < len(content):
            if content[j] == '{': depth += 1
            elif content[j] == '}':
                depth -= 1
                if depth == 0:
                    obj_text = content[idx:j+1]
                    break
            j += 1
        if depth != 0: i = idx + 1; continue
        
        if len(obj_text) > 2000 or 'question' not in obj_text:
            i = j + 1; continue
        
        qid_m = re.search(r'["\s]*id["\s]*:\s*"([^"]+)"', obj_text)
        yr_m = re.search(r'["\s]*year["\s]*:\s*(\d+)', obj_text)
        qm = re.search(r'["\s]*question["\s]*:\s*"([^"]*)"', obj_text)
        ca_m = re.search(r'["\s]*correctAnswer["\s]*:\s*"([^"]*)"', obj_text)
        
        if not qid_m or not yr_m:
            i = j + 1; continue
        
        qid = qid_m.group(1)
        year = int(yr_m.group(1))
        qtext = qm.group(1) if qm else ''
        ca = ca_m.group(1) if ca_m else ''
        
        options = []
        opt_m = re.search(r'options:\s*\[([\s\S]*?)\]', obj_text)
        if opt_m:
            pairs = re.findall(r'label:\s*"([A-D])".*?text:\s*"([^"]*)"', opt_m.group(1))
            for l, t in pairs:
                options.append((l.strip(), t.strip()))
        
        questions.append({
            'id': qid, 'year': year, 'question': qtext,
            'options': options, 'correctAnswer': ca
        })
        i = j + 1
    
    return questions

def count_question_years(questions):
    by_year = Counter(q['year'] for q in questions)
    ca_by_year = defaultdict(int)
    for q in questions:
        if q.get('correctAnswer', ''):
            ca_by_year[q['year']] += 1
    return by_year, ca_by_year

def questions_match(existing_text, new_text):
    """Check if two question texts are similar enough to be the same."""
    # Normalize
    e = re.sub(r'[^a-zA-Z0-9]', '', existing_text.lower())[:60]
    n = re.sub(r'[^a-zA-Z0-9]', '', new_text.lower())[:60]
    if not e or not n:
        return False
    # Check if one is substring of the other
    return e[:30] in n or n[:30] in e or e == n

def get_next_id(subject, year, existing_ids):
    """Get the next available question number for a given year."""
    used = set()
    for qid in existing_ids:
        m = re.search(rf'{subject[0:3]}-{year}-q(\d+)', qid)
        if m:
            used.add(int(m.group(1)))
    
    n = 1
    while n in used:
        n += 1
    return n

def build_ts_file(subject, questions):
    lines = [
        'import type { StudyQuestion } from "@/types/study-questions";',
        'import type { Subject } from "@/types/question";',
        '',
        f'const {subject}Questions: StudyQuestion[] = ['
    ]
    
    def sort_key(q):
        num_m = re.search(r'q(\d+)', q['id'])
        return (q.get('year', 0), int(num_m.group(1)) if num_m else 0)
    
    for q in sorted(questions, key=sort_key):
        qt = q.get('question', '').replace('\\', '\\\\').replace('"', '\\"').replace('`', '\\`').replace('\n', ' ').replace('\r', ' ').strip()
        obj_lines = ['  {']
        obj_lines.append(f'    id:"{q.get("id", "")}",')
        obj_lines.append(f'    subject:"{subject}",')
        obj_lines.append(f'    year:{q.get("year", 0)},')
        obj_lines.append(f'    category:"objective",')
        obj_lines.append(f'    question:"{qt}",')
        obj_lines.append('    options:[')
        for label, text in q.get('options', []):
            t = text.replace('\\', '\\\\').replace('"', '\\"').replace('`', '\\`').replace('\n', ' ').replace('\r', '')
            obj_lines.append(f'      {{label:"{label}",text:"{t}"}},')
        obj_lines.append('    ],')
        ca = q.get('correctAnswer', '')
        exp = q.get('explanation', '').replace('\\', '\\\\').replace('"', '\\"').replace('`', '\\`').replace('\n', ' ').replace('\r', ' ').strip()
        diff = q.get('difficulty', 'medium')
        obj_lines.append(f'    correctAnswer:"{ca}",')
        obj_lines.append(f'    explanation:"{exp}",')
        obj_lines.append(f'    difficulty:"{diff}",')
        obj_lines.append('  },')
        lines.extend(obj_lines)
    
    lines.append('];\n')
    cap = subject.capitalize()
    lines.extend([
        f'export function get{cap}Questions(year: number): {{',
        '  objective: StudyQuestion[];',
        '  theory: StudyQuestion[];',
        '  practical: StudyQuestion[];',
        '} {',
        f'  const objective = {subject}Questions.filter(q => q.year === year && q.category === "objective");',
        f'  const theory = {subject}Questions.filter(q => q.year === year && q.category === "theory");',
        f'  const practical = {subject}Questions.filter(q => q.year === year && q.category === "practical");',
        '  return { objective, theory, practical };',
        '}'
    ])
    return '\n'.join(lines)

def process_subject(subject, extract_fn, source_path, years_needed):
    """Extract questions from source, merge with existing, fill to 50/year."""
    print(f'\n{"="*60}\n{subject}\n{"="*60}')
    
    # Read current data
    ts_path = os.path.join(STUDY_DIR, f'{subject}.ts')
    existing_content = read_file(ts_path)
    existing_qs = extract_existing_questions(existing_content)
    
    existing_by_year, existing_ca = count_question_years(existing_qs)
    print(f'Existing: {len(existing_qs)} questions')
    for y in sorted(existing_by_year):
        print(f'  {y}: {existing_by_year[y]} Qs ({existing_ca[y]} CA)')
    
    # Read source file
    if not os.path.exists(source_path):
        print(f'  Source not found: {source_path}')
        return existing_qs, False
    
    src_content = read_file(source_path)
    source_qs = extract_fn(src_content)
    
    # Filter source questions to only years we need
    source_by_year = Counter(q['year'] for q in source_qs)
    print(f'\nSource: {len(source_qs)} total')
    for y in sorted(source_by_year):
        if y in years_needed:
            print(f'  {y}: {source_by_year[y]} available')
    
    # Merge
    existing_ids = {q['id'] for q in existing_qs}
    new_qs = list(existing_qs)
    added = 0
    
    for year in sorted(years_needed):
        current_count = existing_by_year.get(year, 0)
        if current_count >= TARGET:
            continue
        
        need = TARGET - current_count
        candidates = [q for q in source_qs if q['year'] == year]
        
        # Remove duplicates (by question text similarity)
        existing_texts = [q['question'] for q in existing_qs if q['year'] == year]
        unique_candidates = []
        for q in candidates:
            is_dup = any(questions_match(q['text'], et) for et in existing_texts)
            if not is_dup:
                unique_candidates.append(q)
        
        take = min(need, len(unique_candidates))
        if take > 0:
            chosen = unique_candidates[:take]
            for q in chosen:
                qnum = get_next_id(subject, year, existing_ids)
                qid = f'{subject[0:3]}-{year}-q{qnum:04d}'
                existing_ids.add(qid)
                
                new_q = {
                    'id': qid,
                    'year': year,
                    'question': q['text'],
                    'options': q['options'],
                    'correctAnswer': '',
                    'explanation': '',
                    'difficulty': 'medium'
                }
                new_qs.append(new_q)
                added += 1
            
            print(f'  Added {take}/{need} for {year} (now {current_count + take})')
    
    print(f'\nTotal added: {added}')
    final_by_year, final_ca = count_question_years(new_qs)
    print(f'Final: {len(new_qs)} questions')
    for y in sorted(final_by_year):
        status = 'OK' if final_by_year[y] >= TARGET else f'SHORT by {TARGET - final_by_year[y]}'
        print(f'  {y}: {final_by_year[y]} Qs ({final_ca[y]} CA) - {status}')
    
    return new_qs, True

def main():
    # Read existing files
    subjects_config = [
        ('chemistry', extract_chemistry_questions,
         os.path.join(SRC_DIR, 'chemistry 2014-2025.txt'),
         list(range(2014, 2026))),
        ('physics', extract_physics_questions,
         os.path.join(SRC_DIR, 'physics 2014-2023.txt'),
         [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021]),
        ('math', extract_math_questions,
         os.path.join(SRC_DIR, 'math.txt'),
         [2020, 2022, 2023, 2024]),
    ]
    
    for subject, ext_fn, src_path, years in subjects_config:
        final_qs, changed = process_subject(subject, ext_fn, src_path, years)
        if changed:
            new_content = build_ts_file(subject, final_qs)
            out_path = os.path.join(STUDY_DIR, f'{subject}.ts')
            read_file(out_path)  # ensure we can write
            with open(out_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'  Written to {out_path}')
    
    print('\nDone')

if __name__ == '__main__':
    main()
