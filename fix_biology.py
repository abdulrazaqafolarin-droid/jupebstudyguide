#!/usr/bin/env python3
"""Convert biology backup data to standard format + merge with imported data."""

import re, os, json
from collections import defaultdict, Counter

STUDY_DIR = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\study-questions'

def extract_obj_calls(content):
    """Extract obj() function call data from backup biology.ts."""
    results = []
    i = 0
    while True:
        idx = content.find('obj(', i)
        if idx < 0:
            break
        # Find the matching close paren
        depth = 0
        j = idx
        while j < len(content):
            if content[j] == '(':
                depth += 1
            elif content[j] == ')':
                depth -= 1
                if depth == 0:
                    call = content[idx:j+1]
                    # Parse the obj() call
                    q = parse_obj_call(call)
                    if q:
                        results.append(q)
                    break
            j += 1
        i = j + 1
    return results

def parse_obj_call(call):
    """Parse obj('id', year, 'question', [...], 'answer', 'explanation', 'difficulty')."""
    try:
        # Extract string args by finding quoted strings
        # Remove function name
        inner = call[4:].strip()  # remove 'obj('
        if inner.endswith(')'):
            inner = inner[:-1]
        
        # Use ast.literal_eval approach - extract each argument
        args = split_args_by_commas(inner)
        if len(args) < 7:
            return None
        
        qid = clean_str(args[0])
        year = int(args[1].strip())
        question = clean_str(args[2])
        
        # Parse options array
        opt_text = args[3]
        options = []
        opt_pairs = re.findall(r'\{\s*label:\s*"([A-D])"\s*,\s*text:\s*"([^"]*)"\s*\}', opt_text)
        for l, t in opt_pairs:
            options.append((l.strip(), t.strip()))
        
        correct_answer = clean_str(args[4])
        
        return {
            'id': qid,
            'year': year,
            'subject': 'biology',
            'category': 'objective',
            'question': question,
            'options': options,
            'correctAnswer': correct_answer,
            'explanation': args[5] if len(args) > 5 else '',
            'difficulty': clean_str(args[6]) if len(args) > 6 else 'medium'
        }
    except:
        return None

def clean_str(s):
    """Remove quotes and whitespace from a string arg."""
    s = s.strip()
    if s.startswith('"') and s.endswith('"'):
        s = s[1:-1]
    return s

def split_args_by_commas(text):
    """Split function arguments respecting brackets and strings."""
    args = []
    depth_paren = 0
    depth_bracket = 0
    depth_brace = 0
    in_string = False
    string_char = None
    current = ''
    
    for c in text:
        if in_string:
            current += c
            if c == '\\':
                continue
            if c == string_char:
                in_string = False
            continue
        
        if c in '"\'':
            in_string = True
            string_char = c
            current += c
            continue
        
        if c == '(':
            depth_paren += 1
            current += c
        elif c == ')':
            depth_paren -= 1
            current += c
        elif c == '[':
            depth_bracket += 1
            current += c
        elif c == ']':
            depth_bracket -= 1
            current += c
        elif c == '{':
            depth_brace += 1
            current += c
        elif c == '}':
            depth_brace -= 1
            current += c
        elif c == ',' and depth_paren == 0 and depth_bracket == 0 and depth_brace == 0:
            args.append(current.strip())
            current = ''
        else:
            current += c
    
    if current.strip():
        args.append(current.strip())
    return args

def extract_imported_bio(content):
    """Parse imported biology-imported.ts file with nested record structure."""
    questions = []
    
    # Find ALL brace pairs and check each one
    i = 0
    while True:
        idx = content.find('{', i)
        if idx < 0:
            break
        
        # Match braces from this position
        depth = 0
        j = idx
        while j < len(content):
            if content[j] == '{': depth += 1
            elif content[j] == '}':
                depth -= 1
                if depth == 0:
                    break
            j += 1
        
        if depth != 0:
            i = idx + 1
            continue
        
        obj_text = content[idx:j+1]
        
        # Skip braces that are too large (>1000 chars) or too small (<30 chars)
        obj_len = len(obj_text)
        if obj_len > 1000 or obj_len < 30:
            i = idx + 1
            continue
        
        # Check for required fields
        if not re.search(r'["\s]*id["\s]*:', obj_text):
            i = idx + 1
            continue
        if not re.search(r'["\s]*question["\s]*:', obj_text):
            i = idx + 1
            continue
        
        qid_m = re.search(r'["\s]*id["\s]*:\s*"([^"]*)"', obj_text)
        yr_m = re.search(r'["\s]*year["\s]*:\s*(\d+)', obj_text)
        qm = re.search(r'["\s]*question["\s]*:\s*[`"]([^`"]*)[`"]', obj_text)
        ca_m = re.search(r'["\s]*correctAnswer["\s]*:\s*"([^"]*)"', obj_text)
        
        if not qid_m:
            i = j + 1
            continue
        
        qid = qid_m.group(1)
        year = int(yr_m.group(1)) if yr_m else 0
        qtext = qm.group(1) if qm else ''
        ca = ca_m.group(1) if ca_m else ''
        
        options = []
        opt_text = obj_text
        opt_m_start = opt_text.find('options')
        if opt_m_start >= 0:
            opt_bracket = opt_text.find('[', opt_m_start)
            if opt_bracket >= 0:
                od = 0
                ok = opt_bracket
                while ok < len(opt_text):
                    if opt_text[ok] == '[': od += 1
                    elif opt_text[ok] == ']':
                        od -= 1
                        if od == 0:
                            opt_content = opt_text[opt_bracket+1:ok]
                            pairs = re.findall(r'label["\s]*:\s*"([A-D])".*?text["\s]*:\s*"([^"]*)"', opt_content)
                            for l, t in pairs:
                                options.append((l.strip(), t.strip()))
                            break
                    ok += 1
        
        questions.append({
            'id': qid, 'year': year, 'subject': 'biology',
            'question': qtext, 'options': options,
            'correctAnswer': ca
        })
        
        i = j + 1
    
    return questions

def build_ts_file(subject, questions):
    lines = [
        'import type { StudyQuestion } from "@/types/study-questions";',
        'import type { Subject } from "@/types/question";',
        '',
        f'const {subject}Questions: StudyQuestion[] = ['
    ]
    
    def sort_key(q):
        num_m = re.search(r'q(\d+)', q['id']) if 'id' in q else None
        return (q.get('year', 0), int(num_m.group(1)) if num_m else 0)
    
    for q in sorted(questions, key=sort_key):
        qt = q.get('question', '').replace('\\', '\\\\').replace('"', '\\"').replace('`', '\\`').replace('\n', ' ').replace('\r', ' ').strip()
        obj_lines = ['  {']
        obj_lines.append(f'    id:"{q.get("id", "")}",')
        obj_lines.append(f'    subject:"{subject}",')
        obj_lines.append(f'    year:{q.get("year", 0)},')
        obj_lines.append(f'    category:"{q.get("category", "objective")}",')
        obj_lines.append(f'    question:"{qt}",')
        obj_lines.append('    options:[')
        for label, text in q.get('options', []):
            t = text.replace('\\', '\\\\').replace('"', '\\"').replace('`', '\\`').replace('\n', ' ').replace('\r', '')
            obj_lines.append(f'      {{label:"{label}",text:"{t}"}},')
        obj_lines.append('    ],')
        exp = q.get('explanation', '').replace('\\', '\\\\').replace('"', '\\"').replace('`', '\\`').replace('\n', ' ').replace('\r', ' ').strip()
        ca = q.get('correctAnswer', '')
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

def main():
    # Parse backup bio
    backup_path = r'C:\Users\HP\Downloads\jupeb-studyguide-backup\data\study-questions\biology.ts'
    with open(backup_path, 'r', encoding='utf-8') as f:
        backup_content = f.read()
    
    backup_objs = extract_obj_calls(backup_content)
    print(f'Backup biology: {len(backup_objs)} obj questions')
    
    # Parse imported bio
    imported_path = r'C:\Users\HP\Downloads\jupeb-studyguide-backup\data\new-data-files\biology-imported.ts'
    if os.path.exists(imported_path):
        with open(imported_path, 'r', encoding='utf-8') as f:
            imported_content = f.read()
        imported = extract_imported_bio(imported_content)
        print(f'Imported biology: {len(imported)} questions')
    else:
        imported = []
    
    # Merge - use a dict keyed by id
    merged = {}
    for q in backup_objs:
        qid = q.get('id', '')
        if qid and (qid not in merged or merged[qid]['correctAnswer']):
            merged[qid] = q
    for q in imported:
        qid = q.get('id', '')
        if qid and (qid not in merged or merged[qid]['correctAnswer']):
            merged[qid] = q
    
    # Deduplicate by question text as well
    by_text = {}
    for q in merged.values():
        qt = q.get('question', '')
        if qt and (qt not in by_text or len(by_text[qt]['options']) >= len(q['options'])):
            by_text[qt] = q
    
    final = list(by_text.values())
    
    # Stats
    by_year = Counter(q.get('year', 0) for q in final)
    ca_count = sum(1 for q in final if q.get('correctAnswer', ''))
    print(f'\nMerged biology: {len(final)} questions, {ca_count} with CA')
    for y in sorted(by_year):
        print(f'  {y}: {by_year[y]}')
    
    # Write file
    new_content = build_ts_file('biology', final)
    out_path = os.path.join(STUDY_DIR, 'biology.ts')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'\nWritten to {out_path}')

if __name__ == '__main__':
    main()
