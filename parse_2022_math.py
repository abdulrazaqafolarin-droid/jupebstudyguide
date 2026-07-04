import re, json, sys

with open(r'C:\Users\HP\Downloads\math 2022.txt', encoding='utf-8') as f:
    text = f.read()

# Strip the preamble (first section before Q1)
text = re.sub(r'^.*?(?=## \*\*1\.)', '', text, flags=re.DOTALL)

# Split into question blocks by ## **N. pattern
blocks = re.split(r'\n(?=## \*\*\d+\.)', text)

# Corrections from notes
CORRECTIONS = {
    1: 'A',   # key said C, correct is A
    4: 'B',   # key said C, correct is B
    7: 'A',   # key said B, correct is A
    20: 'D',  # key said B, correct is D
}

BS = chr(92)

def looks_like_math(s):
    if not s or s.isspace():
        return False
    s = s.strip()
    if BS in s:
        return True
    if any(c in s for c in '^_{}[]'):
        return True
    if any(c in s for c in '=+-*/÷×'):
        return True
    if s and s[0].isdigit():
        return True
    # purely alphabetic word of length > 1 — not math
    if re.match(r'^[a-zA-Z]+$', s) and len(s) > 1:
        return False
    # short greek/alphanumeric: a, x, 3, etc.
    if len(s) <= 3 and re.match(r'^[a-zA-Z0-9\u03b1-\u03c9\u0391-\u03a9\u221e]+$', s):
        return True
    return False

def convert_math(text):
    protected = {}
    def protect(m):
        token = f'%%M{len(protected)}%%'
        protected[token] = m.group(0)
        return token
    
    # 1. Convert display math [...] to $$...$$ 
    text = re.sub(
        r'^\s*\[\s*$\n(.*?)\n\s*\]\s*$',
        r'@@DISPLAY@@\1@@ENDDISPLAY@@',
        text,
        flags=re.MULTILINE | re.DOTALL
    )
    text = re.sub(r'@@DISPLAY@@(.*?)@@ENDDISPLAY@@', lambda m: '$$' + m.group(1) + '$$', text, flags=re.DOTALL)
    
    # Protect $$...$$ and $...$
    text = re.sub(r'\$\$[^$]+\$\$', protect, text)
    text = re.sub(r'\$[^$]+\$', protect, text)
    
    # 3. Convert inline (...) with proper nesting
    def replace_paren_math(t):
        result = []
        depth = 0
        buf = ''
        for ch in t:
            if ch == '(':
                if depth == 0:
                    if buf:
                        result.append(buf)
                    buf = '('
                else:
                    buf += '('
                depth += 1
            elif ch == ')':
                depth -= 1
                buf += ')'
                if depth == 0:
                    inner = buf[1:-1]
                    if looks_like_math(inner):
                        result.append('$' + inner + '$')
                    else:
                        result.append(buf)
                    buf = ''
            else:
                if depth > 0:
                    buf += ch
                else:
                    result.append(ch)
        if buf:
            result.append(buf)
        return ''.join(result)
    
    text = replace_paren_math(text)
    
    # 4. Restore protected math blocks
    for token, original in protected.items():
        text = text.replace(token, original)
    
    return text

def clean_latex(text):
    # Remove markdown bold markers that interfere with LaTeX
    text = text.replace('**', '')
    # Remove leading/trailing whitespace per line
    return text.strip()

questions = []

for block in blocks:
    block = block.strip()
    if not block:
        continue
    
    # Extract question number from ## **N. pattern
    m = re.match(r'##\s*\*{0,2}(\d+)\s*\.\*{0,2}\s*(.*)', block, re.DOTALL)
    if not m:
        continue
    
    qnum = int(m.group(1))
    rest = m.group(2).strip()
    
    # Extract explanation section
    expl_match = re.search(r'(?:###\s*\*{0,2}Explanation\*{0,2}|###\s*✅\s*Explanation)(.*?)$', rest, re.DOTALL)
    explanation = ''
    if expl_match:
        explanation = expl_match.group(1).strip()
        rest = rest[:expl_match.start()] + rest[expl_match.end():]
    # Remove notes from explanation
    explanation = re.sub(r'> \*\*Note:.*', '', explanation, flags=re.DOTALL).strip()
    # Remove stray content from Correct Answer marker to end
    explanation = re.sub(r'[\*✅ ]*Correct Answer:?\s*[A-D].*', '', explanation, flags=re.DOTALL).strip()
    
    # Extract note (correction info)
    note_match = re.search(r'> \*\*Note:.*', rest)
    has_correction = False
    if note_match:
        has_correction = True
        rest = rest[:note_match.start()] + rest[note_match.end():]
    
    # Remove stray markers
    rest = re.sub(r'\*{0,2}Correct Answer:?\s*[A-D]\s*✓\*{0,2}', '', rest)
    rest = re.sub(r'✅\s*\*{0,2}Correct Answer:?\s*[A-D][^*]*', '', rest)
    
    # Parse the question (first part before options)
    # Options are on lines starting with A., B., C., D. (possibly with **)
    opt_pattern = re.compile(r'^\s*\*{0,2}([A-D])\s*\.\s*(.*?)(?:\s*✓\s*)?\*{0,2}\s*$', re.MULTILINE)
    
    # Split rest into lines
    lines = rest.split('\n')
    
    question_lines = []
    options = {}
    correct_from_source = None
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            question_lines.append(line)
            continue
        
        om = opt_pattern.match(stripped)
        if om:
            label = om.group(1)
            opt_text = om.group(2).strip()
            # Check if this line had ✓ marking it correct
            if '✓' in stripped:
                correct_from_source = label
            # Also check if the original text had **...** (bold = correct)
            if stripped.startswith('**') or stripped.startswith('*'):
                correct_from_source = label
            options[label] = opt_text
        else:
            question_lines.append(line)
    
    # Reconstruct question text
    question_text = '\n'.join(question_lines).strip()
    
    # Apply correction if this question has one
    correct_answer = correct_from_source
    if qnum in CORRECTIONS:
        correct_answer = CORRECTIONS[qnum]
    
    # Convert math delimiters in question, options, and explanation
    question_text = convert_math(question_text)
    for label in options:
        options[label] = convert_math(options[label])
    explanation = convert_math(explanation)
    
    # Clean up: remove stray markdown artifacts
    question_text = question_text.replace('**', '')
    
    # Organize options A-D
    ordered_options = []
    for label in ['A', 'B', 'C', 'D']:
        if label in options:
            ordered_options.append({
                'label': label,
                'text': options[label].strip()
            })
    
    # Generate ID
    qid = f'mat-2022-obj-{qnum:04d}'
    
    questions.append({
        'id': qid,
        'number': qnum,
        'question': question_text,
        'options': ordered_options,
        'correct_answer': correct_answer,
        'explanation': explanation.strip(),
        'source_marked': correct_from_source,
        'corrected': qnum in CORRECTIONS
    })

# Sort by number
questions.sort(key=lambda x: x['number'])

print(f"Parsed {len(questions)} questions")

issues = []
for q in questions:
    opts = q['options']
    c = q['correct_answer']
    has_4 = len(opts) == 4
    ok = has_4 and c is not None
    status = 'OK'
    if not has_4:
        status = f'OPTS={len(opts)}'
    if c is None:
        status = 'NO_CORRECT'
    if q['corrected']:
        status += ' CORRECTED'
    if not ok:
        issues.append(q['number'])
    print(f"  Q{q['number']:>2}: correct={c} opts={len(opts)} {status}")

if issues:
    print(f"\nIssues: Q{', '.join(str(x) for x in issues)}")
else:
    print("All questions parsed successfully!")

# Save to JSON
with open('2022_math.json', 'w', encoding='utf-8') as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)
print(f"Saved to 2022_math.json")
