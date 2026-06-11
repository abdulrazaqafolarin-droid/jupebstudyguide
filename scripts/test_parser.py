import re
import json

def parse_ts_better(content):
    questions = []
    idx = content.find('const ')
    if idx < 0:
        idx = 0
    bidx = content.find('[', idx)
    if bidx < 0:
        return questions
    
    i = bidx + 1
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
        
        if ch == '"' or ch == "'":
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
                           'correctAnswer', 'explanation', 'difficulty']:
                    kpos = obj_text.find(key + ':')
                    if kpos < 0:
                        continue
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
                            except:
                                pass
                
                opts = []
                opt_pos = 0
                while True:
                    ostart = obj_text.find('{label:', opt_pos)
                    if ostart < 0:
                        break
                    oend = obj_text.find('}', ostart)
                    if oend < 0:
                        break
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


# Test on all 4 subjects
for subj in ['physics', 'chemistry', 'biology', 'math']:
    with open(f'src/data/study-questions/{subj}.ts', encoding='utf-8') as f:
        content = f.read()
    
    id_count = len(re.findall(r'id:\s*"', content))
    qs = parse_ts_better(content)
    
    from collections import Counter
    years = Counter()
    cats = Counter()
    for q in qs:
        years[q.get('year', 0)] += 1
        cats[q.get('category', '?')] += 1
    
    print(f"{subj}: id_count={id_count}, parsed={len(qs)}, by_year={dict(sorted(years.items()))}, cats={dict(cats)}")
