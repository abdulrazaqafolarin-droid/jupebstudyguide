import re, json

with open(r'C:\Users\HP\Downloads\2023 math new.txt', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'^Got it.*?\n---\n', '', text)
text = re.sub(r'\n---\n\*\*Flag:.*', '', text, flags=re.DOTALL)

blocks = re.split(r'\*\*(\d+)\.\*\*\s+', text)
seen = {}
for i in range(1, len(blocks)-1, 2):
    seen[int(blocks[i])] = blocks[i+1]

MATH_FUNCTIONS = {'sin','cos','tan','log','ln','sec','csc','cot','lim','exp','det','mod','sinh','cosh','tanh','arcsin','arccos','arctan'}
# 2-letter variable products common in math (not English)
ALLOWED_VARS = {'ab','bc','cd','de','ef','fg','gh','hi','ij','jk','kl','lm','mn','no','op','pq','qr','rs','st','tu','uv','vw','wx','xy','yz',
                'ba','cb','dc','ed','fe','gf','hg','ih','ji','kj','lk','ml','nm','on','po','qp','rq','sr','ts','ut','vu','wv','xw','yx','zy',
                'ax','bx','cx','dx','ex','fx','gx','hx','ix','jx','kx','lx','mx','nx','ox','px','qx','rx','sx','tx','ux','vx','wx','xx',
                'ay','by','cy','dy','ey','fy','gy','hy','iy','jy','ky','ly','my','ny','oy','py','qy','ry','sy','ty','uy','vy','wy','xy',
                'at','bt','ct','dt','et','ft','gt','ht','it','jt','kt','lt','mt','nt','ot','pt','qt','rt','st','tt','ut','vt','wt','xt','yt','zt',
                'ad','bd','cd','dd','ed','fd','gd','hd','id','jd','kd','ld','md','nd','od','pd','qd','rd','sd','td','ud','vd','wd','xd','yd','zd',
                'an','bn','cn','dn','en','fn','gn','hn','in','jn','kn','ln','mn','nn','on','pn','qn','rn','sn','tn','un','vn','wn','xn','yn','zn',
                'ap','bp','cp','dp','ep','fp','gp','hp','ip','jp','kp','lp','mp','np','op','pp','qp','rp','sp','tp','up','vp','wp','xp','yp','zp',
                'ar','br','cr','dr','er','fr','gr','hr','ir','jr','kr','lr','mr','nr','or','pr','qr','rr','sr','tr','ur','vr','wr','xr','yr','zr'}
ENGLISH_STOP = {'the','and','for','that','this','with','from','which','when','where','what','how','why','are','not','but','has','have','been','was','were','will','would','could','should','about','into','over','also','than','then','there','their','these','those','each','both','more','some','such','only','very','just','can','did','get','may','way','use','say','whose','they','them','than','all','one','its','find','determine','evaluate','given','equation','function','value','values','range','obtain','differentiate','calculate','compute','deduce','express','solve','using','integrate','hence','hence','hence'}

def is_pure_math(text):
    """Check if text is purely mathematical (no English words)"""
    t = text.strip().strip('.,;:!?')
    if not t:
        return False
    if re.match(r'^-?[\d.,\s/]+$', t):
        return True
    words = re.findall(r'[a-zA-Z]{2,}', t)
    for w in words:
        wl = w.lower()
        if wl in MATH_FUNCTIONS or wl in ALLOWED_VARS:
            continue
        if wl in ENGLISH_STOP:
            return False
        # If it has uppercase, it's probably English
        if w[0].isupper():
            return False
        # 2-letter lowercase words could be variable products
        if len(w) == 2 and w.islower():
            continue
        # Unknown word — not math
        return False
    return True

questions = []
for num in sorted(seen.keys()):
    content = seen[num].strip()
    lines = content.split('\n')
    
    opt_start = None
    for idx, line in enumerate(lines):
        if re.search(r'(?:^|\s)\*{0,2}[A-D]\.\s', line):
            opt_start = idx
            break
    
    if opt_start is None:
        questions.append({'id': f'mat-2023-mq-{num:04d}', 'number': num,
            'question': content[:100], 'options': [], 'correct_answer': 'A', 'explanation': ''})
        continue
    
    q_text = ' '.join(lines[:opt_start]).strip()
    q_text = re.sub(r'\s+', ' ', q_text)
    opt_line = ' '.join(lines[opt_start:])
    
    options = {}
    correct_label = None
    cm = re.search(r'\*\*([A-D])\s*[.✓]\s*(.*?)\s*✓\s*\*\*', opt_line)
    if cm:
        correct_label = cm.group(1)
        txt = cm.group(2).strip().rstrip('*').strip()
        if txt:
            options[cm.group(1)] = txt
    else:
        cm2 = re.search(r'\*\*([A-D])\s*✓\s*\*\*', opt_line)
        if cm2:
            correct_label = cm2.group(1)
    
    opt_matches = list(re.finditer(r'(?:\*{0,2})([A-D])\.\s+', opt_line))
    for idx, m in enumerate(opt_matches):
        label = m.group(1)
        start_pos = m.end()
        end_pos = opt_matches[idx+1].start() if idx + 1 < len(opt_matches) else len(opt_line)
        txt = opt_line[start_pos:end_pos].strip().rstrip('*').strip()
        if label not in options:
            options[label] = txt
    
    # ONLY wrap pure-math options in $...$ — question text stays as-is
    for label in list(options.keys()):
        opt = options[label]
        if is_pure_math(opt):
            options[label] = '$' + opt + '$'
    
    ordered = []
    for label in ['A', 'B', 'C', 'D']:
        if label in options:
            ordered.append({'label': label, 'text': options[label]})
    
    questions.append({
        'id': f'mat-2023-mq-{num:04d}',
        'number': num,
        'question': q_text,  # Keep as-is, MathRenderer auto-detects
        'options': ordered,
        'correct_answer': correct_label or 'A',
        'explanation': ''
    })

questions.sort(key=lambda x: x['number'])

with open('2023_math_wrapped.json', 'w', encoding='utf-8') as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)

# Print stats
pure = 0
mixed = 0
for q in questions:
    for o in q['options']:
        if o['text'].startswith('$') and o['text'].endswith('$'):
            pure += 1
        else:
            mixed += 1
print(f"Options wrapped as pure math: {pure}")
print(f"Options left as mixed text: {mixed}")

with open('2023_wrapped_v3.txt', 'w', encoding='utf-8') as out:
    for q in questions[:5]:
        out.write(f"Q{q['number']}: {q['question'][:120]}\n")
        for o in q['options']:
            out.write(f"  {o['label']}: {o['text'][:80]}\n")
        out.write(f"  Correct: {q['correct_answer']}\n\n")

print("Done — see 2023_wrapped_v3.txt")
