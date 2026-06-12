import re

with open(r'C:\Users\HP\Downloads\physics 2014-2023\2018 chemistry OBJ and theory.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find sections
mcq_start = next(i for i, l in enumerate(lines) if 'SECTION A: MULTIPLE CHOICE QUESTIONS' in l)
essay_start = next(i for i, l in enumerate(lines) if 'SECTION B: ESSAY QUESTIONS' in l)
answer_start = next(i for i, l in enumerate(lines) if 'SECTION A: MULTIPLE CHOICE ANSWERS' in l)

def clean_text(s):
    return s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '').replace('\t', '\\t')

# Pattern for question numbers: digit(s) + dot NOT followed by digit (avoids matching "1.5")
q_pat = re.compile(r'^(\d+)\.(?!\d)')
opt_pat = re.compile(r'\b([A-D])\.\s')

mcq_questions = []
i = mcq_start + 2  # skip "Answer ALL Questions"

while i < essay_start:
    line = lines[i].strip()
    
    if not line or line.startswith('Alevelschool'):
        i += 1
        continue
    
    m = q_pat.match(line)
    if not m:
        i += 1
        continue
    
    q_num = int(m.group(1))
    q_text = line[m.end():]
    
    # Collect multi-line question text
    i += 1
    while i < essay_start:
        peek = lines[i].strip()
        if not peek or peek.startswith('Alevelschool'):
            i += 1
            continue
        if q_pat.match(peek):
            break
        if peek.startswith('A.'):
            break
        q_text += ' ' + peek
        i += 1
    
    # Skip to A. line
    while i < essay_start:
        peek = lines[i].strip()
        if not peek or peek.startswith('Alevelschool'):
            i += 1
            continue
        if q_pat.match(peek):
            break
        if peek.startswith('A.'):
            break
        i += 1
    
    # Collect options
    opt_texts = {'A': '', 'B': '', 'C': '', 'D': ''}
    
    while i < essay_start:
        peek = lines[i].strip()
        if not peek or peek.startswith('Alevelschool'):
            i += 1
            continue
        if q_pat.match(peek):
            break
        
        matches = list(opt_pat.finditer(peek))
        if matches:
            for j, m2 in enumerate(matches):
                label = m2.group(1)
                start = m2.end()
                end = matches[j+1].start() if j+1 < len(matches) else len(peek)
                t = peek[start:end].strip()
                if opt_texts[label]:
                    opt_texts[label] += ' ' + t
                else:
                    opt_texts[label] = t
            i += 1
            # Check continuation lines
            while i < essay_start:
                cont = lines[i].strip()
                if not cont or cont.startswith('Alevelschool'):
                    i += 1
                    continue
                if q_pat.match(cont):
                    break
                if opt_pat.search(cont):
                    break
                # Append to last non-empty option
                for lbl in ['D', 'C', 'B', 'A']:
                    if opt_texts[lbl]:
                        opt_texts[lbl] += ' ' + cont
                        break
                i += 1
        else:
            # Maybe continuation of last option
            if any(opt_texts.values()):
                for lbl in ['D', 'C', 'B', 'A']:
                    if opt_texts[lbl]:
                        opt_texts[lbl] += ' ' + peek
                        break
                i += 1
            else:
                i += 1
                continue
        
        if all(opt_texts.values()):
            break
    
    opts = {k: v.strip() for k, v in opt_texts.items() if v.strip()}
    if len(q_text) > 5 and len(opts) >= 3:
        mcq_questions.append({'question': q_text, 'options': opts})
        print(f"  Q{q_num}: OK" if q_num < 100 else f"  Q{q_num}: OK")
    else:
        print(f"  Q{q_num}: SKIP (q={len(q_text)} opts={len(opts)})")

print(f"\nTotal MCQs: {len(mcq_questions)}")

# Now also parse essay questions (lines essay_start+? to answer_start)
# Essay format: numbered question with parts (a, b, c, d)
essay_questions = []

# There are 8 essay questions across CHM 001-004
# Just capture the raw text for each question
print(f"\nEssay section from line {essay_start+1} to {answer_start+1}")
