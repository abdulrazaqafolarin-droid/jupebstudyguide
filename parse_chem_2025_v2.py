import re, json

with open(r'C:\Users\HP\Downloads\2025 chemistry.txt', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.split('\n')

# ============ PARSE MCQs ============
# Parse answer key
answer_section = False
answer_map = {}
for line in lines:
    if 'ANSWERS TO MCQ' in line:
        answer_section = True
        continue
    if answer_section and line.strip().startswith('**Workings:**'):
        break
    if answer_section:
        matches = re.findall(r'(\d+)\.([A-D])', line)
        for num, ans in matches:
            answer_map[int(num)] = ans

if 13 not in answer_map:
    answer_map[13] = 'B'
if 17 not in answer_map:
    answer_map[17] = 'C'

# Collect MCQ lines
mcq_lines = []
in_mcq = False
for line in lines:
    if re.match(r'^\s*1\.\s', line) and 'relative error' in line:
        in_mcq = True
    if in_mcq:
        if re.match(r'^\s*50\.\s', line) and 'polymerization' in line:
            mcq_lines.append(line)
            break
        mcq_lines.append(line)

mcq_text = '\n'.join(mcq_lines)

# Parse individual questions
mcq_questions = []
parts = re.split(r'\n(?=\d+\.\s)', mcq_text)

# Manual corrections for garbled questions
manual_fixes = {
    13: {
        'question': "If 2.5 L of a sample of a gas at 27 °C and 1 bar pressure is compressed to a volume of 500 mL at constant temperature, what is the percentage increase in pressure?",
        'options': ['100%', '400%', '500%', '80%'],
        'answer': '400%'
    },
    19: {
        'question': "What is the correct order of melting points of B, Al, and Ga?",
        'options': ['B > Al > Ga', 'B > Al > B > Ga', 'Ga > B > Al', 'B > Ga > Al'],
        'answer': 'B > Al > Ga'
    },
    26: {
        'question': "An example of a zwitterion is",
        'options': ['alanine', 'methyl acetate', 'HFO', 'BrOH'],
        'answer': 'alanine'
    },
    30: {
        'question': "Synthesis gas is a mixture of",
        'options': ['steam and CO', 'H2 and CH4', 'H2 and CO', 'CO and N2'],
        'answer': 'H2 and CO'
    }
}

for part in parts:
    part = part.strip()
    if not part:
        continue
    m = re.match(r'(\d+)\.\s*(.*)', part)
    if not m:
        continue
    qnum = int(m.group(1))
    rest = m.group(2)
    
    # Check for manual fix
    if qnum in manual_fixes:
        fix = manual_fixes[qnum]
        mcq_questions.append({
            'num': qnum,
            'question': fix['question'],
            'options': fix['options'],
            'answer': fix['answer']
        })
        continue
    
    # Extract options A, B, C, D
    opt_pattern = r'(?:^|(?<=[.?:;\s]))A\.\s*(.*?)\s*B\.\s*(.*?)\s*C\.\s*(.*?)\s*D\.\s*(.*?)$'
    opt_match = re.search(opt_pattern, rest, re.DOTALL)
    
    if opt_match:
        question_text = rest[:opt_match.start()].strip()
        opts = [opt_match.group(1).strip(), opt_match.group(2).strip(),
                opt_match.group(3).strip(), opt_match.group(4).strip()]
    else:
        question_text = rest
        opts = []
    
    question_text = re.sub(r'\s*[:]\s*$', '', question_text)
    answer = answer_map.get(qnum, '')
    
    # Map answer letter to text
    answer_text = ''
    if answer and opts:
        idx = ord(answer) - ord('A')
        if 0 <= idx < len(opts):
            answer_text = opts[idx]
    
    # Fix Q29: clean extra text from D option
    if qnum == 29 and len(opts) == 4:
        opts[3] = re.sub(r'\s*B\.\s*Reducing\s*nature', '', opts[3])
        answer_text = opts[ord(answer_map[qnum]) - ord('A')] if qnum in answer_map else ''
    
    mcq_questions.append({
        'num': qnum,
        'question': question_text,
        'options': opts,
        'answer': answer_text
    })

# ============ PARSE THEORY ============
current_course = None
current_text = []
theory_data = {}  # course -> list of text snippets

for i, line in enumerate(lines):
    stripped = line.strip()
    if line.startswith('### CHM 001:'):
        if current_course and current_text:
            theory_data.setdefault(current_course, []).append('\n'.join(current_text).strip())
        current_course = 'CHM 001'
        current_text = [line]
    elif line.startswith('### CHM 002:'):
        if current_course and current_text:
            theory_data.setdefault(current_course, []).append('\n'.join(current_text).strip())
        current_course = 'CHM 002'
        current_text = [line]
    elif line.startswith('### CHM 003:'):
        if current_course and current_text:
            theory_data.setdefault(current_course, []).append('\n'.join(current_text).strip())
        current_course = 'CHM 003'
        current_text = [line]
    elif line.startswith('### CHM 004:'):
        if current_course and current_text:
            theory_data.setdefault(current_course, []).append('\n'.join(current_text).strip())
        current_course = 'CHM 004'
        current_text = [line]
    elif line.startswith('## MARKING GUIDE') or line.startswith('## ANSWERS TO MCQ'):
        if current_course and current_text:
            theory_data.setdefault(current_course, []).append('\n'.join(current_text).strip())
        current_course = None
    elif line.startswith('## PRACTICAL'):
        if current_course and current_text:
            theory_data.setdefault(current_course, []).append('\n'.join(current_text).strip())
        current_course = None
    elif current_course is not None and stripped:
        current_text.append(line)

# ============ PARSE PRACTICAL ============
practical_start = None
practical_end = None
for i, line in enumerate(lines):
    if 'PRACTICAL QUESTIONS' in line or 'QUANTITATIVE ANALYSIS' in line:
        if practical_start is None:
            practical_start = i
    if line.startswith('## MARKING GUIDE'):
        practical_end = i
        break

practical_text = '\n'.join(lines[practical_start:practical_end]).strip() if practical_start and practical_end else ''

# ============ GENERATE TS ============
output_parts = []

# Store objective entries as list of strings (to build arrays of option objects)
obj_entries = []
for q in mcq_questions:
    qnum = q['num']
    opts = q['options']
    answer_text = q['answer']
    
    if len(opts) != 4 or not answer_text:
        print(f"SKIP Q{qnum}: {len(opts)} options or no answer")
        continue
    
    # Escape the strings for JS
    question_esc = q['question'].replace('\\', '\\\\').replace('"', '\\"')
    opts_esc = [o.replace('\\', '\\\\').replace('"', '\\"') for o in opts]
    answer_esc = answer_text.replace('\\', '\\\\').replace('"', '\\"')
    
    entry = '    {\n'
    entry += f'      id:"che-2025-obj-{qnum:04d}",\n'
    entry += '      subject:"chemistry",\n'
    entry += '      year:2025,\n'
    entry += '      category:"objective",\n'
    entry += f'      question:"{question_esc}",\n'
    entry += '      options:[\n'
    labels = ['A','B','C','D']
    for i, opt in enumerate(opts_esc):
        entry += f'        {{label:"{labels[i]}", text:"{opt}"}},\n'
    entry += '      ],\n'
    entry += f'      correctAnswer:"{answer_esc}",\n'
    entry += '      difficulty:"medium"\n'
    entry += '    },'
    obj_entries.append(entry)

# Theory entries - as double-quoted strings with \n escapes
theory_order = ['CHM 001', 'CHM 002', 'CHM 003', 'CHM 004']
theory_entries = []
tid = 1
for course in theory_order:
    if course in theory_data:
        combined = '\n\n---\n\n'.join(theory_data[course])
        # Escape for JS double-quoted string
        combined_esc = combined.replace('\\', '\\\\').replace('"', '\\"')
        combined_esc = combined_esc.replace('\n', '\\n')
        combined_esc = combined_esc.replace('\r', '')
        # Remove markdown code fences (backticks) from theory text
        combined_esc = combined_esc.replace('```', '')
        
        entry = '    {\n'
        entry += f'      id:"che-2025-t{tid:04d}",\n'
        entry += '      subject:"chemistry",\n'
        entry += '      year:2025,\n'
        entry += '      category:"theory",\n'
        entry += f'      course:"{course}",\n'
        entry += f'      question:"{combined_esc}",\n'
        entry += '      difficulty:"medium"\n'
        entry += '    },'
        theory_entries.append(entry)
        tid += 1

# Practical entry
practical_entries = []
if practical_text:
    prac_esc = practical_text.replace('\\', '\\\\').replace('"', '\\"')
    prac_esc = prac_esc.replace('\n', '\\n')
    prac_esc = prac_esc.replace('\r', '')
    prac_esc = prac_esc.replace('```', '')
    
    entry = '    {\n'
    entry += '      id:"che-2025-p0001",\n'
    entry += '      subject:"chemistry",\n'
    entry += '      year:2025,\n'
    entry += '      category:"practical",\n'
    entry += f'      question:"{prac_esc}",\n'
    entry += '      difficulty:"medium"\n'
    entry += '    },'
    practical_entries.append(entry)

all_entries = obj_entries + theory_entries + practical_entries
ts_output = '\n'.join(all_entries)

with open(r'C:\Users\HP\Downloads\chem_2025_generated.txt', 'w', encoding='utf-8') as f:
    f.write(ts_output)

print(f"Generated: {len(obj_entries)} obj + {len(theory_entries)} theory + {len(practical_entries)} practical = {len(all_entries)} total")
print("Using double-quoted strings with \\n escapes (no backticks)")
