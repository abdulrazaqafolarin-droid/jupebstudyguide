"""
Merge ALL study question data sources into comprehensive TypeScript files.
Sources: existing TS files + new-questions/*.json + output/*.json

For each subject-year: fill up to 50 objective questions, include all theory+practical.
"""
import re, json, os, sys
from collections import defaultdict, Counter

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEW_DIR = os.path.join(BASE, 'src', 'data', 'new-questions')
OUT_DIR = os.path.join(BASE, 'output')
STUDY_DIR = os.path.join(BASE, 'src', 'data', 'study-questions')

SUBJECTS = ['physics', 'chemistry', 'biology', 'math']
YEARS = list(range(2014, 2026))

def norm(s):
    if not s: return ''
    s = s.replace('**', '')
    return re.sub(r'\s+', ' ', s).strip().lower()

def extract_correct_from_options(options):
    for opt in options or []:
        text = opt.get('text', '')
        if '**' in text:
            opt['text'] = text.replace('**', '').strip()
            return opt['label']
    return ''

def parse_ts_questions(content):
    """Parse TS StudyQuestion[] array properly, handling braces inside strings."""
    questions = []
    i = content.find('[')
    if i < 0: return questions
    i += 1
    
    depth = 0
    obj_start = -1
    in_string = False
    string_char = None
    escape = False
    
    while i < len(content):
        ch = content[i]
        
        if escape:
            escape = False
            i += 1
            continue
        
        if ch == '\\' and in_string:
            escape = True
            i += 1
            continue
        
        if in_string:
            if ch == string_char:
                in_string = False
                string_char = None
            i += 1
            continue
        
        if ch in '"\'':
            in_string = True
            string_char = ch
            i += 1
            continue
        
        if ch == '{':
            if depth == 0:
                obj_start = i
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0 and obj_start is not None:
                obj_text = content[obj_start:i+1]
                q = {}
                for key in ['id', 'subject', 'year', 'category', 'question',
                           'correctAnswer', 'explanation', 'difficulty',
                           'topic', 'answerGuide', 'title', 'objective']:
                    kpos = obj_text.find(key + ':')
                    if kpos < 0: continue
                    after = obj_text[kpos + len(key) + 1:].lstrip()
                    if after.startswith('"') or after.startswith("'"):
                        quote = after[0]
                        end = 1
                        while end < len(after):
                            if after[end] == '\\':
                                end += 2
                                continue
                            if after[end] == quote:
                                q[key] = after[1:end]
                                break
                            end += 1
                    elif after and after[0].isdigit():
                        end = 0
                        while end < len(after) and (after[end].isdigit() or after[end] == '.'):
                            end += 1
                        if after[:end]:
                            try:
                                q[key] = int(after[:end]) if '.' not in after[:end] else float(after[:end])
                            except: pass
                
                opts = []
                opt_pos = 0
                while True:
                    ostart = obj_text.find('{label:', opt_pos)
                    if ostart < 0: break
                    oend = obj_text.find('}', ostart)
                    if oend < 0: break
                    oblock = obj_text[ostart:oend+1]
                    lm = re.search(r'label:"([A-D])"', oblock)
                    tm = re.search(r'text:"([^"]*)"', oblock)
                    if lm and tm:
                        opts.append({'label': lm.group(1), 'text': tm.group(1)})
                    opt_pos = oend + 1
                if opts:
                    q['options'] = opts
                
                if q.get('id'):
                    questions.append(q)
                obj_start = None
        i += 1
    return questions

def load_data():
    """Load ALL questions from all sources"""
    all_by_subj = {s: [] for s in SUBJECTS}
    
    # 1. Existing TS files
    for fname in os.listdir(STUDY_DIR):
        if fname == 'index.ts' or not fname.endswith('.ts'):
            continue
        fpath = os.path.join(STUDY_DIR, fname)
        with open(fpath, encoding='utf-8') as f:
            qs = parse_ts_questions(f.read())
        for q in qs:
            s = q.get('subject', '').lower()
            if s in all_by_subj:
                all_by_subj[s].append(q)
        print(f"  TS {fname}: {len(qs)} questions")
    
    # 2. new-questions JSON files
    for root, dirs, files in os.walk(NEW_DIR):
        for fname in sorted(files):
            if not fname.endswith('.json'):
                continue
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, encoding='utf-8') as f:
                    data = json.load(f)
                if isinstance(data, list):
                    for q in data:
                        if isinstance(q, dict) and q.get('question'):
                            if not q.get('correctAnswer'):
                                q['correctAnswer'] = extract_correct_from_options(q.get('options', []))
                            s = q.get('subject', '').lower()
                            if s in all_by_subj:
                                all_by_subj[s].append(q)
            except Exception as e:
                print(f"  SKIP {fpath}: {e}")
    
    # 3. output JSON files
    if os.path.isdir(OUT_DIR):
        for fname in sorted(os.listdir(OUT_DIR)):
            if not fname.endswith('.json'):
                continue
            fpath = os.path.join(OUT_DIR, fname)
            try:
                with open(fpath, encoding='utf-8') as f:
                    data = json.load(f)
                if isinstance(data, list):
                    for q in data:
                        if isinstance(q, dict) and q.get('question'):
                            s = q.get('subject', '').lower()
                            if s in all_by_subj:
                                all_by_subj[s].append(q)
            except Exception as e:
                print(f"  SKIP {fpath}: {e}")
    
    return all_by_subj

def deduplicate(questions):
    """Deduplicate by question text, keep best version"""
    seen = {}
    result = []
    for q in questions:
        key = norm(q.get('question', ''))
        if not key:
            continue
        if key in seen:
            # Keep the version with more complete info
            existing = seen[key]
            if q.get('correctAnswer') and not existing.get('correctAnswer'):
                seen[key] = q
            elif q.get('explanation') and not existing.get('explanation'):
                seen[key] = q
            elif q.get('options') and len(q.get('options', [])) > len(existing.get('options', [])):
                seen[key] = q
        else:
            seen[key] = q
    
    for q in seen.values():
        if not q.get('correctAnswer'):
            q['correctAnswer'] = ''
        if not q.get('explanation'):
            q['explanation'] = ''
        if not q.get('difficulty'):
            q['difficulty'] = 'medium'
        result.append(q)
    
    return result

def organize(data):
    """Organize by subject -> year -> category"""
    org = {}
    for subj in SUBJECTS:
        org[subj] = {}
        for year in YEARS:
            org[subj][year] = {'objective': [], 'theory': [], 'practical': []}
    
    for q in data:
        subj = q.get('subject', '').lower()
        year = q.get('year')
        if isinstance(year, str):
            try: year = int(year)
            except: continue
        cat = q.get('category', 'objective')
        if subj in org and year in org[subj] and cat in org[subj][year]:
            org[subj][year][cat].append(q)
    
    return org

def fill_objectives(org):
    """Cap objective questions to 50 per year"""
    for subj in SUBJECTS:
        for year in YEARS:
            objs = org[subj][year]['objective']
            if len(objs) > 50:
                org[subj][year]['objective'] = objs[:50]
            missing = 50 - len(objs)
            if missing > 0:
                print(f"  {subj} {year}: {len(objs)} obj ({missing} short of 50)")
    return org

def ts_escape(s):
    if not s: return ''
    s = s.replace('\\', '\\\\')
    s = s.replace('"', '\\"')
    s = s.replace('\n', ' ')
    s = s.replace('\r', ' ')
    s = ''.join(c if ord(c) < 128 else ' ' for c in s)
    return s

def ts_val(v):
    if isinstance(v, str):
        return '"' + ts_escape(v) + '"'
    elif isinstance(v, bool):
        return 'true' if v else 'false'
    elif isinstance(v, int):
        return str(v)
    elif v is None:
        return 'undefined'
    elif isinstance(v, list):
        if not v: return '[]'
        items = ',\n          '.join(ts_val(item) for item in v)
        return '[\n            ' + items + '\n          ]'
    elif isinstance(v, dict):
        props = []
        for k, val in v.items():
            if val is not None and val != '':
                props.append(f'{k}:{ts_val(val)}')
        return '{' + ', '.join(props) + '}'
    else:
        return str(v)

def build_q_ts(q):
    """Build TypeScript object literal for a question"""
    fields = ['id', 'subject', 'year', 'category', 'topic', 'question',
              'options', 'correctAnswer', 'explanation', 'answerGuide',
              'totalMarks', 'title', 'objective', 'procedure',
              'subQuestions', 'difficulty']
    
    parts = []
    for key in fields:
        if key in q and q[key] is not None:
            val = q[key]
            if isinstance(val, str) and val == '':
                continue
            if isinstance(val, list) and len(val) == 0:
                continue
            parts.append(f'{key}:{ts_val(val)}')
    
    if not parts:
        return None
    
    inner = ',\n      '.join(parts)
    lines = [
        '    {',
        '      ' + inner,
        '    },',
    ]
    return '\n'.join(lines)

def generate_ts(subj, questions):
    """Generate complete TS file for one subject"""
    func_name = f'get{subj.capitalize()}Questions'
    
    lines = []
    lines.append('import type { StudyQuestion } from "@/types/study-questions";')
    lines.append('import type { Subject } from "@/types/question";')
    lines.append('')
    lines.append(f'const {subj}Questions: StudyQuestion[] = [')
    
    for q in questions:
        q_ts = build_q_ts(q)
        if q_ts:
            lines.append(q_ts)
    
    # Fill missing IDs as last resort
    for i, q in enumerate(questions):
        if not q.get('id'):
            q['id'] = f'{subj}-{q.get("year", 0)}-{q.get("category", "obj")}-{i+1:04d}'
    
    lines.append('];')
    lines.append('')
    lines.append(f'export function {func_name}(year: number): ' + '{')
    lines.append('  objective: StudyQuestion[];')
    lines.append('  theory: StudyQuestion[];')
    lines.append('  practical: StudyQuestion[];')
    lines.append('} ' + '{')
    lines.append(f'  const objective = {subj}Questions.filter(q => q.year === year && q.category === "objective");')
    lines.append(f'  const theory = {subj}Questions.filter(q => q.year === year && q.category === "theory");')
    lines.append(f'  const practical = {subj}Questions.filter(q => q.year === year && q.category === "practical");')
    lines.append('  return ' + '{ objective, theory, practical };')
    lines.append('}')
    lines.append('')
    
    return '\n'.join(lines)

def normalize_ids(org):
    """Generate consistent IDs and clean up answers"""
    id_counter = {}
    for subj in SUBJECTS:
        for year in YEARS:
            for cat in ['objective', 'theory', 'practical']:
                map_key = (subj, year, cat)
                id_counter[map_key] = 0
                for q in org[subj][year][cat]:
                    id_counter[map_key] += 1
                    prefix = {'objective': 'q', 'theory': 't', 'practical': 'p'}.get(cat, 'q')
                    q['id'] = f'{subj[:3]}-{year}-{prefix}{id_counter[map_key]:04d}'
                    if q.get('correctAnswer') in ('', 'TBD', None):
                        # Try to infer from options
                        ca = extract_correct_from_options(q.get('options', []))
                        q['correctAnswer'] = ca if ca else ''
    return org

def main():
    print("=" * 50)
    print("Loading data from all sources...")
    print("=" * 50)
    raw = load_data()
    
    for s in SUBJECTS:
        print(f"  Raw {s}: {len(raw[s])} questions")
    
    print("\n" + "=" * 50)
    print("Deduplicating by question text...")
    print("=" * 50)
    deduped = {}
    for s in SUBJECTS:
        deduped[s] = deduplicate(raw[s])
        print(f"  {s}: {len(raw[s])} -> {len(deduped[s])} unique")
    
    print("\n" + "=" * 50)
    print("Organizing by subject/year/category...")
    print("=" * 50)
    all_qs = []
    for qs in deduped.values():
        all_qs.extend(qs)
    org = organize(all_qs)
    
    print("\n" + "=" * 50)
    print("Ensuring 50 objective Qs per subject-year...")
    print("=" * 50)
    org = fill_objectives(org)
    
    print("\n" + "=" * 50)
    print("Normalizing IDs and cleaning answers...")
    print("=" * 50)
    org = normalize_ids(org)
    
    print("\n" + "=" * 50)
    print("Generating TS files...")
    print("=" * 50)
    for subj in SUBJECTS:
        questions = []
        for year in YEARS:
            for cat in ['objective', 'theory', 'practical']:
                questions.extend(org[subj][year][cat])
        
        ts_content = generate_ts(subj, questions)
        
        fpath = os.path.join(STUDY_DIR, f'{subj}.ts')
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(ts_content)
        
        obj = sum(1 for q in questions if q.get('category') == 'objective')
        theory = sum(1 for q in questions if q.get('category') == 'theory')
        prac = sum(1 for q in questions if q.get('category') == 'practical')
        years_present = sorted(set(q.get('year') for q in questions))
        print(f"  {subj}.ts: {len(questions)}Q ({obj}obj/{theory}th/{prac}prac) | years={years_present}")
    
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    total = 0
    for subj in SUBJECTS:
        count = sum(len(org[subj][y]['objective']) + len(org[subj][y]['theory']) + len(org[subj][y]['practical']) for y in YEARS)
        obj = sum(len(org[subj][y]['objective']) for y in YEARS)
        theory = sum(len(org[subj][y]['theory']) for y in YEARS)
        prac = sum(len(org[subj][y]['practical']) for y in YEARS)
        total += count
        print(f"  {subj}: {count} ({obj}obj {theory}th {prac}prac)")
    print(f"\n  GRAND TOTAL: {total} questions")

if __name__ == '__main__':
    main()
