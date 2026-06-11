#!/usr/bin/env python3
"""Clean data files: remove duplicates, apply known answer keys, normalize."""

import re, os, json
from collections import defaultdict, Counter

STUDY_DIR = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\study-questions'

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def extract_all_objects(content):
    """Parse TS file line-by-line, extract question objects properly."""
    objs = []
    current = None
    brace_depth = 0
    for line in content.split('\n'):
        brace_depth += line.count('{') - line.count('}')
        if brace_depth > 0 and current is None:
            current = {'lines': [line], 'start': len('\n'.join(objs)) if objs else 0}
            continue
        if current is not None:
            current['lines'].append(line)
            if brace_depth == 0:
                objs.append(current)
                current = None
    return objs

def extract_questions(content):
    """Parse TS file into question dicts using brace-level parsing."""
    questions = []
    i = 0
    while i < len(content):
        # Find start of a question object (after the array opening)
        idx = content.find('{', i)
        if idx < 0:
            break
        
        # Check if this is inside or part of a question
        # Count braces to find matching close
        depth = 0
        j = idx
        while j < len(content):
            if content[j] == '{':
                depth += 1
            elif content[j] == '}':
                depth -= 1
                if depth == 0:
                    obj_text = content[idx:j+1]
                    break
            j += 1
        
        if depth != 0:
            i = idx + 1
            continue
        
        if 'id:' in obj_text and 'question:' in obj_text:
            qid_m = re.search(r'id:\s*"([^"]*)"', obj_text)
            qid = qid_m.group(1) if qid_m else ''
            
            yr_m = re.search(r'year:\s*(\d+)', obj_text)
            year = int(yr_m.group(1)) if yr_m else 0
            
            subj_m = re.search(r'subject:\s*"([^"]*)"', obj_text)
            subject = subj_m.group(1) if subj_m else ''
            
            qm = re.search(r'question:\s*[`"]([^`"]*)[`"]', obj_text)
            qtext = qm.group(1) if qm else ''
            
            ca_m = re.search(r'correctAnswer:\s*"([^"]*)"', obj_text)
            ca = ca_m.group(1) if ca_m else ''
            
            options = []
            opt_m = re.search(r'options:\s*\[([\s\S]*?)\]', obj_text)
            if opt_m:
                pairs = re.findall(r'label:\s*"([A-D])"\s*,\s*text:\s*[`"]([^`"]*)[`"]', opt_m.group(1))
                for l, t in pairs:
                    options.append((l.strip(), t.strip()))
            
            questions.append({
                'id': qid, 'year': year, 'subject': subject,
                'question': qtext, 'options': options,
                'correctAnswer': ca
            })
        
        i = j + 1
    
    return questions

def deduplicate_questions(questions):
    """Remove duplicate IDs, keep the one with CA filled."""
    by_id = defaultdict(list)
    for q in questions:
        by_id[q['id']].append(q)
    
    cleaned = []
    for qid, qs in by_id.items():
        if len(qs) == 1:
            cleaned.append(qs[0])
        else:
            # Keep the one with CA filled, then with more options, then first
            best = max(qs, key=lambda q: (
                1 if q['correctAnswer'] else 0,
                len(q['options']),
                len(q['question'])
            ))
            cleaned.append(best)
    
    return cleaned

def count_questions(questions):
    total = len(questions)
    with_ca = sum(1 for q in questions if q['correctAnswer'] and q['correctAnswer'].strip())
    empty_ca = total - with_ca
    by_year = defaultdict(lambda: {'total': 0, 'ca': 0})
    for q in questions:
        by_year[q['year']]['total'] += 1
        if q['correctAnswer'] and q['correctAnswer'].strip():
            by_year[q['year']]['ca'] += 1
    return total, with_ca, empty_ca, dict(sorted(by_year.items()))

def build_ts_file(subject, questions, extra_imports=''):
    """Rebuild TS file from question dicts."""
    lines = [
        'import type { StudyQuestion } from "@/types/study-questions";',
        f'import type {{ Subject }} from "@/types/question";',
        '',
        f'const {subject}Questions: StudyQuestion[] = ['
    ]
    
    # Sort by year then by question number in ID
    def sort_key(q):
        num_m = re.search(r'q(\d+)', q['id'])
        return (q['year'], int(num_m.group(1)) if num_m else 0)
    
    for q in sorted(questions, key=sort_key):
        qt = q['question'].replace('\\', '\\\\').replace('"', '\\"').replace('`', '\\`').replace('\n', ' ').replace('\r', ' ').strip()
        obj_lines = ['  {']
        obj_lines.append(f'    id:"{q["id"]}",')
        obj_lines.append(f'    subject:"{subject}",')
        obj_lines.append(f'    year:{q["year"]},')
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

def apply_answer_keys(questions):
    """Apply known answer keys from the chem_answer_keys.txt file."""
    keys_path = r'C:\Users\HP\Downloads\chem_answer_keys.txt'
    if not os.path.exists(keys_path):
        return questions
    
    with open(keys_path, 'r', encoding='utf-8') as f:
        keys_content = f.read()
    
    # Parse keys by year
    keys_by_year = defaultdict(dict)
    
    sections = re.split(r'=== ANSWER KEY SECTION ===', keys_content)
    for section in sections:
        if not section.strip():
            continue
        
        # Identify year
        year = None
        for y in range(2014, 2026):
            if str(y) in section[:200]:
                year = y
                break
        if not year:
            continue
        
        # Extract num:letter pairs
        pairs = re.findall(r'(?<!\d)(\d+)\s*[:.\-)}]+(?:\s*\*{0,2})([A-D])(?:\*{0,2})', section)
        for num, letter in pairs:
            n = int(num)
            if 1 <= n <= 70:
                keys_by_year[year][n] = letter
    
    filled = 0
    for q in questions:
        if q['correctAnswer'] and q['correctAnswer'].strip():
            continue
        if q['year'] not in keys_by_year:
            continue
        
        num_m = re.search(r'q(\d+)', q['id'])
        if not num_m:
            continue
        qnum = int(num_m.group(1))
        
        if qnum in keys_by_year[q['year']]:
            q['correctAnswer'] = keys_by_year[q['year']][qnum]
            filled += 1
    
    return questions

def process_subject(subject):
    path = os.path.join(STUDY_DIR, f'{subject}.ts')
    if not os.path.exists(path):
        print(f'{subject}.ts not found')
        return
    
    print(f'\n{"="*60}\n{subject}\n{"="*60}')
    content = read_file(path)
    
    # Extract questions
    questions = extract_questions(content)
    t, ca, empty, years = count_questions(questions)
    print(f'Raw: {t} Qs ({ca} CA, {empty} empty) from file')
    
    # Deduplicate
    questions = deduplicate_questions(questions)
    t, ca, empty, years = count_questions(questions)
    print(f'After dedup: {t} Qs ({ca} CA, {empty} empty)')
    
    # Apply answer keys
    questions = apply_answer_keys(questions)
    t, ca, empty, years = count_questions(questions)
    print(f'After keys: {t} Qs ({ca} CA, {empty} empty)')
    for y, d in years.items():
        if d['total'] > 0:
            print(f'  {y}: {d["total"]} Qs, {d["ca"]} CA')
    
    # Rebuild file
    new_content = build_ts_file(subject, questions)
    write_file(path, new_content)
    
    t2, ca2, empty2, years2 = count_questions(extract_questions(new_content))
    print(f'\nWritten: {t2} Qs ({ca2} CA, {empty2} empty)')

def main():
    for subject in ['chemistry', 'physics', 'math', 'biology']:
        process_subject(subject)
    print('\nDone')

if __name__ == '__main__':
    main()
