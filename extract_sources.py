#!/usr/bin/env python3
"""
Extract MCQs with answer keys from source text files.
Physics: 2014-2024 (all years with questions in source)
Math: 2020, 2022, 2023, 2024
Chemistry: 2025
"""
import re, os
from collections import Counter, defaultdict

STUDY_DIR = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\study-questions'
SRC_DIR = r'C:\Users\HP\Downloads\Past questions main'
TARGET = 50

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def esc(s):
    if isinstance(s, str):
        return s.replace('\\', '\\\\').replace('"', '\\"').replace('`', '\\`').replace('\n', ' ').replace('\r', ' ').strip()
    return str(s) if s else ''

def get_next_id(subject, year, existing_ids):
    prefix = f'{subject[0:3]}-{year}-q'
    used = set()
    for qid in existing_ids:
        if qid.startswith(prefix):
            n = qid[len(prefix):]
            if n.isdigit(): used.add(int(n))
    n = 1
    while n in used: n += 1
    return f'{prefix}{n:04d}'

def norm_text(t):
    return re.sub(r'[^a-z0-9]', '', t.lower())[:40]

def is_similar(t1, t2):
    n1, n2 = norm_text(t1), norm_text(t2)
    return n1 and n2 and (n1[:20] == n2[:20] or n1 in n2 or n2 in n1)

def build_ts(subject, questions):
    lines = [
        'import type { StudyQuestion } from "@/types/study-questions";',
        'import type { Subject } from "@/types/question";', '',
        f'const {subject}Questions: StudyQuestion[] = ['
    ]
    for q in sorted(questions, key=lambda q: (q.get('year', 0), int(re.search(r'q(\d+)', q.get('id', '0')).group(1)) if re.search(r'q(\d+)', q.get('id', '0')) else 0)):
        obj = ['  {']
        obj.append(f'    id:"{esc(q.get("id",""))}",')
        obj.append(f'    subject:"{subject}",')
        obj.append(f'    year:{q.get("year",0)},')
        obj.append(f'    category:"objective",')
        obj.append(f'    question:"{esc(q.get("question",""))}",')
        obj.append('    options:[')
        for opt in q.get('options', []):
            lbl = opt.get('label', '')
            txt = esc(opt.get('text', ''))
            obj.append(f'      {{label:"{lbl}",text:"{txt}"}},')
        obj.append('    ],')
        obj.append(f'    correctAnswer:"{esc(q.get("correctAnswer",""))}",')
        obj.append(f'    explanation:"{esc(q.get("explanation",""))}",')
        obj.append(f'    difficulty:"{esc(q.get("difficulty","medium"))}",')
        obj.append('  },')
        lines.extend(obj)
    lines.append('];\n')
    cap = subject.capitalize()
    lines.extend([
        f'export function get{cap}Questions(year: number): {{',
        '  objective: StudyQuestion[];', '  theory: StudyQuestion[];', '  practical: StudyQuestion[];',
        f'}} {{',
        f'  const objective = {subject}Questions.filter(q => q.year === year && q.category === "objective");',
        f'  const theory = {subject}Questions.filter(q => q.year === year && q.category === "theory");',
        f'  const practical = {subject}Questions.filter(q => q.year === year && q.category === "practical");',
        '  return { objective, theory, practical };', '}'
    ])
    return '\n'.join(lines)

# ============================================================
# PARSE ANSWER KEYS FROM SOLUTION SECTIONS
# ============================================================
def parse_solution_keys(lines, start_line, end_line):
    """Extract answer keys from solution sections.
    Looks for patterns like "N. X" or "N X" where N is question number, X is A-D.
    """
    keys = {}
    for i in range(start_line, end_line):
        s = lines[i].strip()
        # Pattern: "N. X" at start of line (e.g., "4. B", "5. D")
        m = re.match(r'^(\d{1,2})\.\s*([A-D])\b', s)
        if m:
            qnum, ans = int(m.group(1)), m.group(2)
            if qnum <= 60:
                keys[qnum] = ans
                continue
        # Pattern: "N X" (e.g., "11.D", "20 C")
        m = re.match(r'^(\d{1,2})\.?\s*([A-D])\b', s.replace(' ', ''))
        if m:
            qnum, ans = int(m.group(1)), m.group(2)
            if qnum <= 60 and qnum not in keys:
                keys[qnum] = ans
    return keys

# ============================================================
# PHYSICS EXTRACTION (all years 2014-2024)
# ============================================================
def extract_physics():
    content = read_file(os.path.join(SRC_DIR, 'physics 2014-2023.txt'))
    lines = content.split('\n')
    
    # ---- Answer keys from solution sections ----
    # 2024 answer key (lines 3218-3222): "1A 2B 3A ..."
    phys_ak_2024 = {}
    for m in re.finditer(r'(\d+)([A-D])', lines[3217].strip() + lines[3218].strip() + lines[3219].strip() + lines[3220].strip() + lines[3221].strip()):
        phys_ak_2024[int(m.group(1))] = m.group(2)
    
    # 2016 answer keys (lines 1875-1877): "1. C 2. B 3. C ..."
    phys_ak_2016 = parse_solution_keys(lines, 1874, 1878)
    # Also Q29-45 from same section
    phys_ak_2016.update(parse_solution_keys(lines, 1877, 1920))
    
    # 2015 answer keys from solution section (lines 2883-3100)
    phys_ak_2015 = parse_solution_keys(lines, 2883, 3100)
    
    # 2017+ answer keys from the "SECTION A: OBJECTIVE TEST ANSWERS" / "Objective Answers (2021)" sections
    # These are more complex - mixed with solutions
    
    mcqs = []
    
    # ---- Define year sections ----
    # 2014: PHS 001 (Q1-13) + PHS 002 (Q14-45) in SECTION A MCQs
    # 2015: lines 234-408
    # 2016: lines 450-500
    # 2017: lines 504-548
    # 2018: lines 552-590
    # 2019: lines 657-885
    # 2020: lines 887-1041
    # 2021: lines 1041-1302
    # 2022: lines 1938-2100
    # 2023: lines 2158-2403
    # 2024: lines 2403-3210
    
    # Helper to parse a section of lines into MCQs
    def parse_section(year, section_lines, answer_key=None):
        qs = []
        i = 0
        current_q = None
        
        while i < len(section_lines):
            line = section_lines[i]
            stripped = line.strip()
            
            if not stripped or '---' in stripped or 'IMAGE' in stripped or '|' in stripped:
                if current_q:
                    qs.append(current_q)
                    current_q = None
                i += 1
                continue
            
            # Skip section headers
            if 'SECTION A' in stripped or 'SECTION B' in stripped or 'ESSAY' in stripped:
                if current_q:
                    qs.append(current_q)
                    current_q = None
                i += 1
                continue
            if stripped.startswith('**PHS') or stripped.startswith('PHS'):
                if current_q:
                    qs.append(current_q)
                    current_q = None
                i += 1
                continue
            if 'answer all questions' in stripped.lower() or 'NOTE:' in stripped or 'Question' in stripped:
                i += 1
                continue
            
            # Check for MCQ number: "**N.** question" or "N.** question" or "**N.** question"
            qm = re.match(r'^\*{0,2}(\d{1,2})[.)]\*{0,2}\s+(.*)', stripped)
            if qm and not stripped.startswith('**PHS'):
                qnum = int(qm.group(1))
                qtext = qm.group(2).strip()
                
                if qnum > 60:
                    if current_q:
                        qs.append(current_q)
                    current_q = None
                    i += 1
                    continue
                
                # Skip "6-11" type labels and "(options visible in image)"
                if re.match(r'^\d+[–-]\d+', qtext) or qtext.startswith('(options') or qtext.startswith('(continuing'):
                    if current_q:
                        qs.append(current_q)
                    current_q = None
                    i += 1
                    continue
                
                if current_q:
                    qs.append(current_q)
                
                # Check if question has inline options
                inline_opts = re.findall(r'([A-D])[.)]\s*([^A-D]*)', qtext)
                if inline_opts and len(inline_opts) >= 2:
                    opt_end = qtext.find(inline_opts[0][0] + '.')
                    if opt_end > 0:
                        clean_question = qtext[:opt_end].strip()
                        current_q = {
                            'year': year, 'num': qnum, 'text': clean_question,
                            'options': [], 'correctAnswer': ''
                        }
                        for lbl, txt in inline_opts:
                            txt = txt.strip().strip(',').strip()
                            if txt:
                                current_q['options'].append({'label': lbl, 'text': txt})
                        i += 1
                        continue
                
                current_q = {
                    'year': year, 'num': qnum, 'text': qtext,
                    'options': [], 'correctAnswer': ''
                }
                i += 1
                continue
            
            # Parse options (separate lines)
            if current_q and stripped:
                clean = stripped.lstrip('- ').strip()
                
                # Skip "(options visible in image)" etc
                if clean.startswith('(options') or clean.startswith('(answer') or clean.startswith('(continuing') or clean.startswith('(values'):
                    i += 1
                    continue
                if clean.startswith('**PHS') or clean.startswith('PHS') or 'k and C' in clean:
                    i += 1
                    continue
                
                # Try multi-option: "A. opt B. opt C. opt D. opt"
                opts = re.findall(r'([A-D])[.)]\s*([^A-D]*)', clean)
                if opts and len(opts) >= 2:
                    for lbl, txt in opts:
                        txt = txt.strip().strip(',').strip()
                        if txt and not any(o['label'] == lbl for o in current_q['options']):
                            current_q['options'].append({'label': lbl, 'text': txt})
                else:
                    # Single option: "- A. opt" or "A. opt"
                    om = re.match(r'([A-D])[.)]\s*(.*)', clean)
                    if om:
                        lbl = om.group(1)
                        txt = om.group(2).strip()
                        if txt and not any(o['label'] == lbl for o in current_q['options']):
                            current_q['options'].append({'label': lbl, 'text': txt})
            
            i += 1
        
        if current_q:
            qs.append(current_q)
        
        # Filter: keep Qs with 3+ options
        qs = [q for q in qs if len(q['options']) >= 3]
        
        # Apply answer keys
        if answer_key:
            for q in qs:
                if q['num'] in answer_key:
                    q['correctAnswer'] = answer_key[q['num']]
        
        return qs
    
    # Parse each year
    # 2014: lines 13-178 (0-indexed 12-177)
    mcqs.extend(parse_section(2014, lines[12:178]))
    
    # 2015: lines 234-408 (0-indexed 233-407)
    mcqs.extend(parse_section(2015, lines[233:408], phys_ak_2015))
    
    # 2016: lines 450-500 (0-indexed 449-499)
    mcqs.extend(parse_section(2016, lines[449:500], phys_ak_2016))
    
    # 2017: lines 504-548 (0-indexed 503-547)
    mcqs.extend(parse_section(2017, lines[503:548]))
    
    # 2018: lines 552-590 (0-indexed 551-589)
    mcqs.extend(parse_section(2018, lines[551:589]))
    
    # 2019-2024 (existing extraction)
    year_sections = [
        (2019, 657, 885),
        (2020, 887, 1041),
        (2021, 1041, 1302),
        (2022, 1938, 2100),
        (2023, 2158, 2403),
        (2024, 2403, 3210),
    ]
    
    for year, start, end in year_sections:
        ak = phys_ak_2024 if year == 2024 else None
        qs = parse_section(year, lines[start-1:end-1], ak)
        mcqs.extend(qs)
    
    # Stats
    print(f'Physics: {len(mcqs)} MCQs extracted')
    by_year = Counter(q['year'] for q in mcqs)
    ca_by_year = Counter(q['year'] for q in mcqs if q.get('correctAnswer', ''))
    for y in sorted(by_year):
        print(f'  {y}: {by_year[y]} Q ({ca_by_year.get(y, 0)} CA)')
    
    return mcqs

# ============================================================
# MATH EXTRACTION
# ============================================================
def extract_math():
    content = read_file(os.path.join(SRC_DIR, 'math.txt'))
    lines = content.split('\n')
    
    year_sections = {
        2020: {'start': 12, 'end': 258, 'ak_start': 240},
        2022: {'start': 259, 'end': 558, 'ak_start': 682},
        2023: {'start': 558, 'end': 700, 'ak_start': 689},
        2024: {'start': 700, 'end': 1016, 'ak_start': 1006},
    }
    
    answer_keys = {}
    for year, info in year_sections.items():
        ak = {}
        ak_text = '\n'.join(lines[info['ak_start']-1:info['ak_start']+12])
        for m in re.finditer(r'(\d+)\.([A-D])', ak_text):
            ak[int(m.group(1))] = m.group(2)
        answer_keys[year] = ak
        print(f'  Math {year}: {len(ak)} answer keys')
    
    mcqs = []
    
    for year, info in year_sections.items():
        section_lines = lines[info['start']-1:info['end']-1]
        current_q = None
        
        for line in section_lines:
            stripped = line.strip()
            
            if not stripped or '---' in stripped or 'IMAGE' in stripped:
                if current_q and stripped and 'SECTION B' in stripped.upper():
                    mcqs.append(current_q)
                    current_q = None
                continue
            
            if 'SECTION A' in stripped or 'SECTION B' in stripped:
                if current_q:
                    mcqs.append(current_q)
                    current_q = None
                continue
            if 'MAT ' in stripped and ':' in stripped:
                if current_q:
                    mcqs.append(current_q)
                    current_q = None
                continue
            if stripped.startswith('|') and stripped.endswith('|'):
                continue
            if 'acceler' in stripped.lower() and 'gravity' in stripped.lower():
                continue
            if 'Avogadro' in stripped or 'Boltzmann' in stripped or 'Planck' in stripped:
                continue
            if 'suggested answer' in stripped.lower() or (year > 2020 and stripped.startswith('That')):
                if current_q:
                    mcqs.append(current_q)
                    current_q = None
                continue
            
            qm = re.match(r'^\*{0,2}(\d{1,2})[.)]\*{0,2}\s+(.*)', stripped)
            if qm and len(stripped) > 15:
                qnum = int(qm.group(1))
                qtext = qm.group(2).strip()
                
                if qnum >= 60:
                    if current_q:
                        mcqs.append(current_q)
                    current_q = None
                    continue
                
                if current_q:
                    mcqs.append(current_q)
                
                current_q = {
                    'year': year, 'num': qnum, 'text': qtext,
                    'options': [], 'correctAnswer': ''
                }
                continue
            
            if current_q and stripped:
                clean = stripped.lstrip('- ').strip()
                opts = re.findall(r'([A-D])[.)]\s*([^A-D]*)', clean)
                if opts and len(opts) >= 2:
                    for lbl, txt in opts:
                        txt = txt.strip().strip(',').strip()
                        if txt:
                            current_q['options'].append({'label': lbl, 'text': txt})
        
        if current_q:
            mcqs.append(current_q)
    
    mcqs = [q for q in mcqs if len(q['options']) >= 3]
    
    for q in mcqs:
        if q['num'] in answer_keys.get(q['year'], {}):
            q['correctAnswer'] = answer_keys[q['year']][q['num']]
    
    print(f'Math: {len(mcqs)} MCQs extracted')
    by_year = Counter(q['year'] for q in mcqs)
    ca_by_year = Counter(q['year'] for q in mcqs if q.get('correctAnswer', ''))
    for y in sorted(by_year):
        print(f'  {y}: {by_year[y]} Q ({ca_by_year.get(y, 0)} CA)')
    
    return mcqs

# ============================================================
# CHEMISTRY 2025 EXTRACTION
# ============================================================
def extract_chemistry():
    path = os.path.join(SRC_DIR, 'chemistry 2014-2025.txt')
    content = read_file(path)
    lines = content.split('\n')
    
    mcqs = []
    current = None
    prev_opts = None  # track previous question's options to detect stray duplicates
    
    for i in range(15, 250):
        line = lines[i].strip()
        if not line:
            continue
        if '---' in line or 'ESSAY' in line:
            if current:
                mcqs.append(current)
                current = None
            break
        
        qm = re.match(r'\*\*(\d{1,2})\.\*\*\s+(.*)', line)
        if qm:
            if current:
                mcqs.append(current)
            # Save previous question's options for stray-duplicate detection
            if current and current.get('options'):
                prev_opts = [(o['label'], o['text']) for o in current['options']]
            else:
                prev_opts = None
            current = {
                'year': 2025,
                'num': int(qm.group(1)),
                'text': qm.group(2).strip(),
                'options': [],
                'correctAnswer': ''
            }
            continue
        
        if current and len(current['options']) < 4:
            opts = re.findall(r'\b([A-D])[.)]\s+(.+?)(?=\s*\b[A-D][.)]|\s*$)', line)
            if opts:
                # Check if this line has exact same options as previous question (stray duplicate)
                cur_opts = [(lbl, txt.strip()[:20]) for lbl, txt in opts]
                if prev_opts and len(cur_opts) >= 4 and cur_opts[:4] == prev_opts[:4]:
                    continue
                
                for lbl, txt in opts:
                    txt = txt.strip().strip(',').strip()
                    if txt and lbl not in [o['label'] for o in current['options']]:
                        current['options'].append({'label': lbl, 'text': txt})
        
        # If we already have 4 options, check if a later line has a COMPLETE
        # replacement set (handles Q26 where stray options appear then real ones)
        elif current and len(current['options']) >= 4:
            opts = re.findall(r'\b([A-D])[.)]\s+(.+?)(?=\s*\b[A-D][.)]|\s*$)', line)
            if opts and len(opts) >= 4:
                new_opts = opts[:4]
                new_texts = [txt.strip()[:20] for lbl, txt in new_opts]
                old_texts = [o['text'][:20] for o in current['options']]
                if new_texts != old_texts and all(t.strip() for lbl, t in new_opts):
                    replacement = []
                    for lbl, txt in new_opts:
                        txt = txt.strip().strip(',').strip()
                        if txt:
                            replacement.append({'label': lbl, 'text': txt})
                    if len(replacement) == 4:
                        current['options'] = replacement
    
    if current:
        mcqs.append(current)
    
    mcqs = [q for q in mcqs if len(q['options']) >= 3]
    print(f'Chemistry 2025: {len(mcqs)} MCQs extracted')
    return mcqs

# ============================================================
# MERGE
# ============================================================
def merge(subject, new_mcqs):
    ts_path = os.path.join(STUDY_DIR, f'{subject}.ts')
    content = read_file(ts_path)
    
    existing = []
    i = 0
    while True:
        idx = content.find('\n  {', i)
        if idx < 0: idx = content.find('\n{', i)
        if idx < 0: break
        depth = 0; j = idx
        while j < len(content):
            if content[j] == '{': depth += 1
            elif content[j] == '}':
                depth -= 1
                if depth == 0: break
            j += 1
        if depth != 0: i = idx + 1; continue
        obj_text = content[idx:j+1]
        if 'id:' not in obj_text: i = j + 1; continue
        
        q = {}
        for m in re.finditer(r'(id|question|correctAnswer|explanation|difficulty|year|category):\s*("[^"]*"|\d+)', obj_text):
            k, v = m.group(1), m.group(2)
            if v.startswith('"'): v = v[1:-1]
            elif k == 'year': v = int(v)
            q[k] = v
        
        opt_m = re.search(r'options:\s*\[(.*?)\]', obj_text, re.DOTALL)
        if opt_m:
            opts = []
            for om in re.finditer(r'label:\s*"([A-D])",\s*text:\s*"([^"]*)"', opt_m.group(1)):
                opts.append({'label': om.group(1), 'text': om.group(2)})
            q['options'] = opts
        
        if 'id' in q and 'year' in q:
            existing.append(q)
        i = j + 1
    
    existing_ids = {q.get('id', '') for q in existing}
    existing_by_year = Counter(q.get('year', 0) for q in existing)
    ca_by_year = Counter(q.get('year', 0) for q in existing if q.get('correctAnswer', ''))
    
    print(f'\nExisting {subject}: {len(existing)} Qs')
    for y in sorted(existing_by_year):
        print(f'  {y}: {existing_by_year[y]} Q ({ca_by_year.get(y, 0)} CA)', end='')
        if existing_by_year[y] >= TARGET: print(' - OK')
        else: print(f' - need {TARGET - existing_by_year[y]} more')
    
    existing_texts = defaultdict(set)
    for q in existing:
        existing_texts[q.get('year', 0)].add(norm_text(q.get('question', '')))
    
    merged = list(existing)
    ca_lookup = {}
    for q in new_mcqs:
        if q.get('correctAnswer'):
            ca_lookup[norm_text(q['text'])] = q['correctAnswer']
    
    added = 0; ca_filled = 0
    
    for nq in new_mcqs:
        year = nq['year']
        current_count = Counter(q.get('year', 0) for q in merged).get(year, 0)
        if current_count >= TARGET: continue
        
        nt = norm_text(nq['text'])
        if nt in existing_texts[year]:
            continue
        if any(is_similar(nq['text'], mq.get('question', '')) for mq in merged if mq.get('year') == year):
            continue
        
        qid = get_next_id(subject, year, existing_ids)
        existing_ids.add(qid)
        
        opts = nq['options'][:4]
        while len(opts) < 4:
            lbl = chr(ord('A') + len(opts))
            opts.append({'label': lbl, 'text': ''})
        
        merged.append({
            'id': qid, 'year': year, 'question': nq['text'],
            'options': opts,
            'correctAnswer': nq.get('correctAnswer', ''),
            'explanation': '', 'difficulty': 'medium'
        })
        existing_texts[year].add(nt)
        added += 1
        if nq.get('correctAnswer'): ca_filled += 1
    
    ca_filled_ex = 0
    for q in merged:
        if not q.get('correctAnswer', ''):
            nt = norm_text(q.get('question', ''))
            if nt in ca_lookup:
                q['correctAnswer'] = ca_lookup[nt]
                ca_filled_ex += 1
    
    final_by_year = Counter(q.get('year', 0) for q in merged)
    final_ca = Counter(q.get('year', 0) for q in merged if q.get('correctAnswer', ''))
    
    print(f'\nAdded {added} Qs ({ca_filled} with CA), filled {ca_filled_ex} CA in existing')
    for y in sorted(final_by_year):
        co = final_by_year[y]
        ca = final_ca.get(y, 0)
        if co >= TARGET:
            print(f'  {y}: {co} Q ({ca} CA) - OK')
        else:
            print(f'  {y}: {co} Q ({ca} CA) - need {TARGET - co} more')
    
    write_file(ts_path, build_ts(subject, merged))
    print(f'  Written to {ts_path}')
    return merged

# ============================================================
# MATH DOCX EXTRACTION (JUPEB_Mathematics files)
# ============================================================
def extract_math_docx():
    """Parse both .docx text files for math MCQs (2015-2020)"""
    # Read docx1
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo = script_dir
    path1 = os.path.join(repo, 'math_docx1.txt')
    print(f'  Reading docx1: {path1}')
    docx1 = read_file(path1).split('\n')
    
    # Read docx2
    path2 = os.path.join(repo, 'math_docx2.txt')
    print(f'  Reading docx2: {path2}')
    docx2 = read_file(path2).split('\n')
    
    mcqs = []
    
    # ---- Parse docx2 answer keys ----
    docx2_text = '\n'.join(docx2)
    # 2019 Answer Key: "1.C  2.B  3.B  4.A ..."
    ak_2019 = {}
    ak_2018 = {}
    
    # Find and parse answer key lines
    in_2019_ak = False
    in_2018_ak = False
    for line in docx2:
        s = line.strip()
        if '2019 JUPEB MCQ Answers' in s:
            in_2019_ak = True
            continue
        if '2018 JUPEB MCQ Answers' in s:
            in_2018_ak = False
            in_2019_ak = False
            continue
        
        if in_2019_ak and s:
            for m in re.finditer(r'(\d+)\.\s*([A-Da-d])', s):
                ak_2019[int(m.group(1))] = m.group(2).upper()
        if in_2018_ak and s:
            for m in re.finditer(r'(\d+)\.\s*([A-Da-d])', s):
                ak_2018[int(m.group(1))] = m.group(2).upper()
    
    print(f'  Docx2 answer keys: 2019={len(ak_2019)}, 2018={len(ak_2018)}')
    
    # ---- Parse docx2 MCQs with options ----
    # Format: "Q1. ..." then "Answer:" then "Option X" or "Option A", "Option B" etc
    current_q = None
    for i, line in enumerate(docx2):
        s = line.strip()
        
        # Year header
        ym = re.match(r'(\d{4})\s+JUPEB', s)
        if ym:
            if current_q:
                mcqs.append(current_q)
                current_q = None
            continue
        
        # Question: "Q1. " or "Q1. text"
        qm = re.match(r'Q(\d+)\.?\s*(.*)', s)
        if qm and ('Find' in s or 'Solve' in s or 'Evaluate' in s or 'Given' in s or 'If' in s or 'Express' in s or 'Simplify' in s or 'Let' in s or 'Show' in s or 'Determine' in s or 'Write' in s or 'Compute' in s or s.startswith('Q')) and not s.startswith('QMAT') and not s.startswith('Qb') and not s.startswith('QSeries'):
            if current_q:
                mcqs.append(current_q)
            qnum = int(qm.group(1))
            qtext = qm.group(2).strip()
            if qtext and len(qtext) > 5 and qnum <= 50:
                current_q = {
                    'year': 2019,  # default, will be set by context
                    'num': qnum,
                    'text': qtext,
                    'options': [],
                    'correctAnswer': ''
                }
            continue
        
        if current_q and s.startswith('Answer:'):
            ans_text = s.replace('Answer:', '').strip()
            # Try "Option X" pattern
            am = re.search(r'[Oo]ption\s+([A-Da-d])', ans_text)
            if am:
                current_q['correctAnswer'] = am.group(1).upper()
            # Try just a single letter
            am2 = re.match(r'^([A-Da-d])\b', ans_text)
            if am2 and not current_q['correctAnswer']:
                current_q['correctAnswer'] = am2.group(1).upper()
    
    if current_q:
        mcqs.append(current_q)
    
    # ---- Parse docx1 MCQs ----
    # Format: 
    # Year header: "2015 JUPEB MATHEMATICS QUESTIONS"
    # "Section A: MULTIPLE CHOICE QUESTIONS (MCQ)"
    # "Question 1"
    # Question text (may span lines)
    # "A. opt"
    # "B. opt"
    # "C. opt"
    # "D. opt"
    # "Answer: X. text" or "Answer: X"
    # "Solution: ..."
    
    current_year = None
    current_q = None
    qtext_lines = []
    options_collected = False
    
    for line in docx1:
        s = line.strip()
        if not s:
            continue
        
        # Year header
        ym = re.match(r'(\d{4})\s+JUPEB', s)
        if ym:
            current_year = int(ym.group(1))
            continue
        
        def finish_q():
            nc, nl = current_q, qtext_lines
            if nc and nl:
                nc['text'] = ' '.join(nl)
            if nc:
                mcqs.append(nc)
            return (None, [])
        
        # Skip section headers and essay sections
        if 'SECTION A' in s or 'SECTION B' in s:
            current_q, qtext_lines = finish_q()
            if 'ESSAY' in s:
                current_year = None
            continue
        
        if 'ESSAY' in s and 'QUESTIONS' in s:
            current_q, qtext_lines = finish_q()
            current_year = None
            continue
        
        # Skip supplementary section
        if 'SUPPLEMENTARY' in s.upper() or 'SOLUTION TOPICS' in s:
            current_q, qtext_lines = finish_q()
            current_year = None
            continue
        
        # Flush previous question text before starting new
        # "Question N" marker
        qm = re.match(r'Question\s+(\d+)', s)
        if qm:
            if current_q and qtext_lines:
                current_q['text'] = ' '.join(qtext_lines)
            if current_q:
                mcqs.append(current_q)
            qnum = int(qm.group(1))
            current_q = {
                'year': current_year,
                'num': qnum,
                'text': '',
                'options': [],
                'correctAnswer': ''
            }
            qtext_lines = []
            options_collected = False
            continue
        
        if not current_q or not current_year:
            continue
        
        # Answer line
        am = re.match(r'Answer:\s*([A-Da-d])[.)]?\s*(.*)', s)
        if am:
            current_q['correctAnswer'] = am.group(1).upper()
            continue
        
        # Solution line - skip
        if s.startswith('Solution:'):
            continue
        
        # Option line
        om = re.match(r'([A-D])[.)]\s*(.*)', s)
        if om and len(s) < 120:
            lbl = om.group(1)
            txt = om.group(2).strip()
            if txt and not any(o['label'] == lbl for o in current_q['options']):
                current_q['options'].append({'label': lbl, 'text': txt})
                options_collected = True
            continue
        
        # If we've already collected options, skip remaining text (solutions, etc)
        if options_collected:
            continue
        
        # Question text
        if not options_collected:
            qtext_lines.append(s)
    
    if current_q and qtext_lines:
        current_q['text'] = ' '.join(qtext_lines)
    if current_q:
        mcqs.append(current_q)
    
    # Filter: keep Qs with 2+ options
    mcqs = [q for q in mcqs if len(q['options']) >= 2]
    
    # Apply answer keys from docx2 to docx1 MCQs  
    for q in mcqs:
        if q['year'] == 2019 and not q.get('correctAnswer', '') and q['num'] in ak_2019:
            q['correctAnswer'] = ak_2019[q['num']]
        if q['year'] == 2018 and not q.get('correctAnswer', '') and q['num'] in ak_2018:
            q['correctAnswer'] = ak_2018[q['num']]
    
    # Create additional MCQs from answer keys (fill CA for existing questions)
    # We add them as answer-key-only entries so merge can fill CA
    for year, ak in [(2019, ak_2019), (2018, ak_2018)]:
        for qnum, ans in ak.items():
            # Check if we already have this Q with this answer
            if not any(q['year'] == year and q['num'] == qnum for q in mcqs):
                mcqs.append({
                    'year': year,
                    'num': qnum,
                    'text': f'JUPEB {year} Q{qnum}',
                    'options': [{'label': 'A', 'text': ''}, {'label': 'B', 'text': ''}, {'label': 'C', 'text': ''}, {'label': 'D', 'text': ''}],
                    'correctAnswer': ans
                })
    
    # Stats
    print(f'Math docx: {len(mcqs)} MCQs extracted')
    by_year = Counter(q['year'] for q in mcqs)
    ca_by_year = Counter(q['year'] for q in mcqs if q.get('correctAnswer', ''))
    for y in sorted(by_year):
        print(f'  {y}: {by_year[y]} Q ({ca_by_year.get(y, 0)} CA)')
    
    return mcqs

# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    print('=' * 70)
    print('EXTRACTING ALL SUBJECTS')
    print('=' * 70)
    
    print('\n--- Physics (2014-2024) ---')
    phys_mcqs = extract_physics()
    
    print('\n--- Math (source text) ---')
    math_mcqs = extract_math()
    
    print('\n--- Math (docx files 2015-2020) ---')
    math_docx_mcqs = extract_math_docx()
    
    print('\n--- Chemistry 2025 ---')
    chem_mcqs = extract_chemistry()
    
    print('\n' + '=' * 70)
    print('MERGING')
    print('=' * 70)
    
    print('\n--- Merging Physics ---')
    merge('physics', phys_mcqs)
    
    print('\n--- Merging Math (source text) ---')
    merge('math', math_mcqs)
    
    print('\n--- Merging Math (docx files) ---')
    merge('math', math_docx_mcqs)
    
    print('\n--- Merging Chemistry ---')
    merge('chemistry', chem_mcqs)
    
    print('\n' + '=' * 70)
    print('DONE')
    print('=' * 70)
