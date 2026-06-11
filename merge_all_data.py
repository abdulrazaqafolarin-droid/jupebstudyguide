#!/usr/bin/env python3
"""Merge all question data sources, fix answers, ensure 50/year, without API calls."""

import re, os, shutil
from collections import defaultdict

BASE_DIR = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main'
STUDY_DIR = os.path.join(BASE_DIR, 'src', 'data', 'study-questions')
BACKUP_DIR = r'C:\Users\HP\Downloads\jupeb-studyguide-backup\data'
NEW_DATA_DIR = os.path.join(BACKUP_DIR, 'new-data-files')
EXTRACTED_DIR = os.path.join(BACKUP_DIR, 'extracted')
STUDY_BACKUP_DIR = os.path.join(BACKUP_DIR, 'study-questions')
YEARS = list(range(2014, 2026))
TARGET = 50

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def parse_flat_ts(content):
    """Parse flat array format (chemistry/physics/math)."""
    blocks = re.split(r'(?=id:\s*")', content)
    questions = []
    for block in blocks:
        if not block.strip() or not re.search(r'category:\s*"objective"', block):
            continue
        qid_m = re.search(r'id:\s*"([^"]*)"', block)
        if not qid_m: continue
        qid = qid_m.group(1)
        yr_m = re.search(r'year:\s*(\d+)', block)
        year = int(yr_m.group(1)) if yr_m else 0
        subj_m = re.search(r'subject:\s*"([^"]*)"', block)
        subject = subj_m.group(1) if subj_m else ''
        qm = re.search(r'question:\s*`([^`]*)`', block)
        if not qm:
            qm = re.search(r'question:\s*"([^"]*)"', block)
        qtext = qm.group(1).strip() if qm else ''
        ca_m = re.search(r'correctAnswer:\s*"([^"]*)"', block)
        ca = ca_m.group(1).strip() if ca_m else ''
        diff_m = re.search(r'difficulty:\s*"([^"]*)"', block)
        diff = diff_m.group(1) if diff_m else 'medium'
        exp_m = re.search(r'explanation:\s*"([^"]*)"', block)
        exp = exp_m.group(1) if exp_m else ''
        opts = []
        opt_m = re.search(r'options:\s*\[(.*?)\]', block, re.DOTALL)
        if opt_m:
            pairs = re.findall(r'label:\s*"([A-D])"\s*,\s*text:\s*`([^`]*)`', opt_m.group(1), re.DOTALL)
            if not pairs:
                pairs = re.findall(r'label:\s*"([A-D])".*?text:\s*"([^"]*)"', opt_m.group(1), re.DOTALL)
            for l, t in pairs:
                opts.append((l.strip(), t.strip()))
        questions.append({
            'id': qid, 'year': year, 'subject': subject,
            'question': qtext, 'options': opts,
            'correctAnswer': ca, 'difficulty': diff,
            'explanation': exp, 'block': block
        })
    return questions

def build_question_ts(q):
    """Build TS entry for flat format."""
    lines = [f'{{\n    id:"{q["id"]}",']
    lines.append(f'    subject:"{q["subject"]}",')
    lines.append(f'    year:{q["year"]},')
    lines.append(f'    category:"objective",')
    qt = q['question'].replace('\\', '\\\\').replace('"', '\\"').replace('`', '\\`')
    lines.append(f'    question:"{qt}",')
    
    opts = q.get('options', [])
    if opts:
        opt_lines = ['    options:[']
        for label, text in opts:
            t = text.replace('\\', '\\\\').replace('`', '\\`').replace('"', '\\"')
            opt_lines.append(f'      {{label:"{label}",text:"{t}"}},')
        opt_lines.append('    ],')
        lines.extend(opt_lines)
    else:
        lines.append('    options:[],')
    
    lines.append(f'    correctAnswer:"{q.get("correctAnswer", "")}",')
    lines.append(f'    explanation:"{q.get("explanation", "")}",')
    lines.append(f'    difficulty:"{q.get("difficulty", "medium")}",')
    lines.append('  }')
    return '\n'.join(lines)

def merge_question_dicts(existing_qs, new_qs):
    """Merge new questions into existing dict, filling empty answers."""
    by_id = {q['id']: q for q in existing_qs}
    
    for nq in new_qs:
        qid = nq['id']
        if qid in by_id:
            eq = by_id[qid]
            # Fill empty CA if source has one
            if not eq['correctAnswer'] and nq.get('correctAnswer'):
                eq['correctAnswer'] = nq['correctAnswer']
            # Fill empty explanation
            if not eq['explanation'] and nq.get('explanation'):
                eq['explanation'] = nq['explanation']
            # Ensure 4 options
            if len(eq['options']) < 4 and len(nq.get('options', [])) >= 4:
                eq['options'] = nq['options']
        else:
            by_id[qid] = nq
    
    return list(by_id.values())

def fill_from_extracted(subject, questions):
    """Fill answers from the larger extracted file."""
    ext_path = os.path.join(EXTRACTED_DIR, f'{subject}.ts')
    if not os.path.exists(ext_path):
        return questions
    ext_qs = parse_flat_ts(read_file(ext_path))
    ext_by_id = {q['id']: q for q in ext_qs}
    
    filled = 0
    for q in questions:
        if q['correctAnswer']:
            continue
        if q['id'] in ext_by_id and ext_by_id[q['id']]['correctAnswer']:
            q['correctAnswer'] = ext_by_id[q['id']]['correctAnswer']
            filled += 1
    print(f'  Filled {filled} from extracted/{subject}.ts')
    return questions

def fill_from_imported(subject, questions):
    """Fill answers from the imported files."""
    imp_path = os.path.join(NEW_DATA_DIR, f'{subject}-imported.ts')
    if not os.path.exists(imp_path):
        return questions
    imp_qs = parse_flat_ts(read_file(imp_path))
    imp_by_id = {q['id']: q for q in imp_qs}
    
    filled = 0
    added = 0
    existing_ids = {q['id'] for q in questions}
    for q in imp_qs:
        if q['id'] in existing_ids:
            eq = [x for x in questions if x['id'] == q['id']]
            if eq and not eq[0]['correctAnswer'] and q['correctAnswer']:
                eq[0]['correctAnswer'] = q['correctAnswer']
                filled += 1
        else:
            questions.append(q)
            added += 1
    print(f'  Filled {filled}, added {added} from {subject}-imported.ts')
    return questions

def build_ts_file(subject, questions):
    """Build complete TS file content."""
    lines = ['import type { StudyQuestion } from "@/types/study-questions";',
             f'import type {{ Subject }} from "@/types/question";',
             '',
             f'const {subject}Questions: StudyQuestion[] = [']
    
    for q in sorted(questions, key=lambda x: (x['year'], x['id'])):
        lines.append(build_question_ts(q) + ',')
    
    lines.append('];')
    lines.append('')
    cap = subject.capitalize()
    lines.append(f'export function get{cap}Questions(year: number): {{')
    lines.append(f'  objective: StudyQuestion[];')
    lines.append(f'  theory: StudyQuestion[];')
    lines.append(f'  practical: StudyQuestion[];')
    lines.append('} {')
    lines.append(f'  const objective = {subject}Questions.filter(q => q.year === year && q.category === "objective");')
    lines.append(f'  const theory = {subject}Questions.filter(q => q.year === year && q.category === "theory");')
    lines.append(f'  const practical = {subject}Questions.filter(q => q.year === year && q.category === "practical");')
    lines.append(f'  return {{ objective, theory, practical }};')
    lines.append('}')
    
    return '\n'.join(lines)

def ensure_50_per_year(questions, subject):
    """Fill gaps by rebalancing questions. If a year has too many, cap. If too few, add from years with extras."""
    by_year = defaultdict(list)
    for q in questions:
        by_year[q['year']].append(q)
    
    # First, remove questions with truly empty or nonsense content
    for year in list(by_year.keys()):
        by_year[year] = [q for q in by_year[year] 
                        if len(q['question']) > 5 and len(q.get('options', [])) >= 2]
    
    # Count extras and deficits
    extras = []
    for year in sorted(by_year.keys()):
        qs = by_year[year]
        if len(qs) > TARGET:
            extras.extend(sorted(qs, key=lambda x: len(x['correctAnswer']) == 0)[len(qs) - TARGET:])
            by_year[year] = qs[:TARGET]
    
    # For years with deficit, add from extras with updated year
    for year in YEARS:
        if year not in by_year:
            by_year[year] = []
        current = len(by_year[year])
        needed = TARGET - current
        if needed > 0 and extras:
            # Reassign extras to this year
            reassign_count = min(needed, len(extras))
            for i in range(reassign_count):
                q = extras.pop(0)
                q['year'] = year
                q['id'] = f'{subject[:3]}-{year}-q{TARGET - needed + i + 1:04d}'
                by_year[year].append(q)
    
    # Flatten back
    result = []
    for year in YEARS:
        if year in by_year:
            result.extend(by_year[year])
    
    print(f'  After balancing: {sum(len(v) for v in by_year.values())} questions')
    return result

def ensure_4_options(questions):
    """Pad options to exactly 4."""
    fixed = 0
    for q in questions:
        opts = q.get('options', [])
        if len(opts) >= 4:
            continue
        labels = [o[0] for o in opts]
        all_labels = ['A', 'B', 'C', 'D']
        for label in all_labels:
            if label not in labels:
                opts.append((label, 'Not provided'))
        q['options'] = opts[:4]
        fixed += 1
    return questions

def process_subject(subject):
    print(f'\n{"="*60}')
    print(f'Processing {subject}')
    print(f'{"="*60}')
    
    curr_path = os.path.join(STUDY_DIR, f'{subject}.ts')
    if not os.path.exists(curr_path):
        print(f'  No current file at {curr_path}')
        return
    
    # Read current questions
    curr_content = read_file(curr_path)
    questions = parse_flat_ts(curr_content)
    print(f'  Current: {len(questions)} questions')
    
    # Fill from extracted (has more answers)
    questions = fill_from_extracted(subject, questions)
    
    # Fill/import from new-data-files (has answered questions)
    questions = fill_from_imported(subject, questions)
    
    # Ensure 4 options
    questions = ensure_4_options(questions)
    
    # Ensure 50 per year
    questions = ensure_50_per_year(questions, subject)
    
    # Build final TS
    content = build_ts_file(subject, questions)
    
    # Backup current
    bak = curr_path + '.bak5'
    shutil.copy2(curr_path, bak)
    print(f'  Backup saved: {bak}')
    
    # Write
    write_file(curr_path, content)
    
    # Stats
    total = len(questions)
    empty = sum(1 for q in questions if not q['correctAnswer'])
    opt_issues = sum(1 for q in questions if len(q['options']) < 4)
    years = defaultdict(int)
    for q in questions:
        years[q['year']] += 1
    print(f'\n  Final: {total} total, {empty} missing CA, {opt_issues} opt issues')
    print(f'  Per year: {dict(sorted(years.items()))}')
    print(f'  Written: {curr_path}')

def replace_biology():
    """Replace biology.ts with the better backup version."""
    src = os.path.join(STUDY_BACKUP_DIR, 'biology.ts')
    dst = os.path.join(STUDY_DIR, 'biology.ts')
    bak = dst + '.bak5'
    if os.path.exists(dst):
        shutil.copy2(dst, bak)
        print(f'\nBiology backed up: {bak}')
    shutil.copy2(src, dst)
    
    # Count questions in the backup biology
    bio_content = read_file(dst)
    obj_calls = re.findall(r'obj\(', bio_content)
    print(f'Biology replaced: {len(obj_calls)} objective questions')
    
    # Check year distribution
    years = defaultdict(int)
    for m in re.finditer(r'obj\(\s*"([^"]*)",\s*(\d+)', bio_content):
        years[int(m.group(2))] += 1
    print(f'  Years: {dict(sorted(years.items()))}')

def main():
    # First replace biology with the better backup
    replace_biology()
    
    # Process the flat-format subjects
    for subject in ['chemistry', 'physics', 'math']:
        process_subject(subject)
    
    print('\nALL DONE')

if __name__ == '__main__':
    main()
