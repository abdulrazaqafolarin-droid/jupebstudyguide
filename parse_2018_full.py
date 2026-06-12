"""
Parse 2018 Chemistry exam: 50 MCQs + 8 essay questions + answer key
Output TypeScript in existing chemistry.ts format
"""
import re

with open(r'C:\Users\HP\Downloads\physics 2014-2023\2018 chemistry OBJ and theory.txt', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.split('\n')

mcq_start = next(i for i, l in enumerate(lines) if 'SECTION A: MULTIPLE CHOICE QUESTIONS' in l)
essay_start = next(i for i, l in enumerate(lines) if 'SECTION B: ESSAY QUESTIONS' in l)
answer_start = next(i for i, l in enumerate(lines) if 'SECTION A: MULTIPLE CHOICE ANSWERS' in l)
essay_answer_start = next(i for i, l in enumerate(lines) if 'SECTION B: ESSAY ANSWERS' in l)

# ---- Answer key ----
answers = {}
for i in range(answer_start + 1, essay_answer_start):
    line = lines[i].strip()
    m = re.match(r'^(\d+)\.\s*Option\s+([A-D])', line)
    if m:
        answers[int(m.group(1))] = m.group(2)

# ---- Parse MCQs ----
q_pat = re.compile(r'^(\d+)\.(?!\d)')
opt_pat = re.compile(r'\b([A-D])\.\s')

mcq_questions = []
i = mcq_start + 2

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
        if peek: q_text += ' ' + peek
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
        i += 1

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
            while i < essay_start:
                cont = lines[i].strip()
                if not cont or cont.startswith('Alevelschool'):
                    i += 1
                    continue
                if q_pat.match(cont):
                    break
                if opt_pat.search(cont):
                    break
                for lbl in ['D', 'C', 'B', 'A']:
                    if opt_texts[lbl]:
                        opt_texts[lbl] += ' ' + cont
                        break
                i += 1
        else:
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
        mcq_questions.append({
            'num': q_num,
            'question': q_text.strip(),
            'options': opts,
            'answer': answers.get(q_num, '')
        })

# ---- Parse essay questions ----
course_map = {}
current_course = None
for i in range(essay_start + 2, answer_start):
    l = lines[i].strip()
    for c in ['CHM 001', 'CHM 002', 'CHM 003', 'CHM 004']:
        if c in l:
            current_course = c
    if current_course:
        course_map[i] = current_course

essay_qs = []
for q_num in range(1, 9):
    # Find start of question q_num
    q_start = None
    for i in range(essay_start + 2, answer_start):
        l = lines[i].strip()
        m = re.match(rf'^{q_num}\.([a-d])(?:\s|$)', l)
        if m:
            q_start = i
            break
    
    if q_start is None:
        continue
    
    # Find end
    next_q_start = answer_start
    for next_num in range(q_num + 1, 9):
        for i in range(essay_start + 2, answer_start):
            l = lines[i].strip()
            if re.match(rf'^{next_num}\.([a-d])\s', l):
                next_q_start = i
                break
        if next_q_start != answer_start:
            break
    
    q_lines = []
    for j in range(q_start, next_q_start):
        l = lines[j].rstrip('\n')
        if l.strip().startswith('Alevelschool'):
            continue
        q_lines.append(l)
    
    course = course_map.get(q_start, '')
    essay_qs.append({
        'num': q_num,
        'course': course,
        'text': '\n'.join(q_lines)
    })

# ---- Generate TypeScript ----
# Build comprehensive replacement map for math alphanumeric symbols
REPLACEMENTS = {
    '×': 'x', '−': '-', '→': '->', '⇌': '<->',
    '≈': '~', '≤': '<=', '≥': '>=',
    '𝜋': 'pi', '𝜃': 'theta',
    '"': "'", '"': "'", "'": "'", '’': "'",
    '–': '-', '—': '--', '…': '...',
    '°': 'deg',
    '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6',
    '₇': '7', '₈': '8', '₉': '9', '₀': '0',
    '²': '2', '³': '3',
    '⁺': '+', '⁻': '-',
    '•': '.', '·': '.',
}

# Math Bold Capital A-Z (U+1D400-U+1D419)
for i in range(26):
    REPLACEMENTS[chr(0x1D400 + i)] = chr(ord('A') + i)
# Math Bold Small a-z (U+1D41A-U+1D433)
for i in range(26):
    REPLACEMENTS[chr(0x1D41A + i)] = chr(ord('a') + i)
# Math Italic Capital A-Z (U+1D434-U+1D44D)
for i in range(26):
    REPLACEMENTS[chr(0x1D434 + i)] = chr(ord('A') + i)
# Math Italic Small a-z (U+1D44E-U+1D467)
for i in range(26):
    REPLACEMENTS[chr(0x1D44E + i)] = chr(ord('a') + i)
# Math Bold Italic Capital A-Z (U+1D468-U+1D481)
for i in range(26):
    REPLACEMENTS[chr(0x1D468 + i)] = chr(ord('A') + i)
# Math Bold Italic Small a-z (U+1D482-U+1D49B)
for i in range(26):
    REPLACEMENTS[chr(0x1D482 + i)] = chr(ord('a') + i)

def esc(s):
    s = s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '').replace('\t', '\\t')
    result = []
    for c in s:
        if ord(c) < 128:
            result.append(c)
        else:
            result.append(REPLACEMENTS.get(c, ' '))
    return ''.join(result)

out_lines = []

for q in mcq_questions:
    q_text = esc(q['question'])
    opt_a = esc(q['options'].get('A', ''))
    opt_b = esc(q['options'].get('B', ''))
    opt_c = esc(q['options'].get('C', ''))
    opt_d = esc(q['options'].get('D', ''))
    ans = q.get('answer', '')
    qnum = q['num']
    out_lines.append(f'''    {{
      id:"che-2018-q{qnum:04d}",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"{q_text}",
      options:[
            {{label:"A", text:"{opt_a}"}},
            {{label:"B", text:"{opt_b}"}},
            {{label:"C", text:"{opt_c}"}},
            {{label:"D", text:"{opt_d}"}},
          ],
      correctAnswer:"{ans}",
      difficulty:"medium"
    }},''')

for i, eq in enumerate(essay_qs):
    q_text = esc(eq['text'])
    course = eq['course']
    qnum = eq['num']
    out_lines.append(f'''    {{
      id:"che-2018-t{qnum:04d}",
      subject:"chemistry",
      year:2018,
      category:"theory",
      course:"{course}",
      question:"{q_text}",
      difficulty:"medium"
    }},''')

output = '\n'.join(out_lines)
print(f"Generated {len(mcq_questions)} objective + {len(essay_qs)} theory entries")

with open(r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\2018_chemistry_output.txt', 'w', encoding='utf-8') as f:
    f.write(output)

print("Saved to 2018_chemistry_output.txt")

# Verify
mcqs_with_answer = [q for q in mcq_questions if q.get('answer')]
print(f"MCQs with answers: {len(mcqs_with_answer)}/{len(mcq_questions)}")
