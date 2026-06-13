import re, json

with open(r'C:\Users\HP\Downloads\2025 chemistry.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Split into sections
lines = text.split('\n')

# ============ PARSE MCQs ============
# Find MCQ questions - they start with "1." up to "50."
mcq_start = None
mcq_end = None
for i, line in enumerate(lines):
    if re.match(r'^\s*1\.\s', line) and 'relative error' in line:
        mcq_start = i
    if re.match(r'^\s*50\.\s', line) and 'polymerization' in line:
        mcq_end = i

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
        # Parse pattern like "1.A 2.C 3.B ..."
        matches = re.findall(r'(\d+)\.([A-D])', line)
        for num, ans in matches:
            answer_map[int(num)] = ans

# Also handle Q13 and Q17 which have special answer formats
# From workings: Q13 → B (400%), Q17 → C (3 days)
if 13 not in answer_map:
    answer_map[13] = 'B'
if 17 not in answer_map:
    answer_map[17] = 'C'

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
# Split by question number pattern
parts = re.split(r'\n(?=\d+\.\s)', mcq_text)
for part in parts:
    part = part.strip()
    if not part:
        continue
    m = re.match(r'(\d+)\.\s*(.*)', part)
    if not m:
        continue
    qnum = int(m.group(1))
    rest = m.group(2)
    
    # Extract options A, B, C, D
    # Pattern: text A. opt1 B. opt2 C. opt3 D. opt4
    # But many questions have garbled text. Let's try to find the last A/B/C/D group
    opt_pattern = r'(?:^|(?<=[.?:;\s]))A\.\s*(.*?)\s*B\.\s*(.*?)\s*C\.\s*(.*?)\s*D\.\s*(.*?)$'
    opt_match = re.search(opt_pattern, rest, re.DOTALL)
    
    if opt_match:
        question_text = rest[:opt_match.start()].strip()
        opts = [opt_match.group(1).strip(), opt_match.group(2).strip(), 
                opt_match.group(3).strip(), opt_match.group(4).strip()]
    else:
        question_text = rest
        opts = []
    
    # Clean up question text - remove trailing colon/space before options
    question_text = re.sub(r'\s*[:]\s*$', '', question_text)
    
    answer = answer_map.get(qnum, '')
    
    mcq_questions.append({
        'num': qnum,
        'question': question_text,
        'options': opts,
        'answer': answer
    })

# ============ PARSE THEORY QUESTIONS ============
# Theory questions from all options combined
theory_sections = []

# Extract theory sections
current_section = None
current_course = None
current_text = []

for i, line in enumerate(lines):
    # Detect theory question sections
    if line.startswith('### CHM 001:'):
        if current_section and current_text:
            theory_sections.append({'course': current_course, 'text': '\n'.join(current_text).strip()})
        current_course = 'CHM 001'
        current_text = [line]
        current_section = 'theory'
    elif line.startswith('### CHM 002:'):
        if current_section and current_text:
            theory_sections.append({'course': current_course, 'text': '\n'.join(current_text).strip()})
        current_course = 'CHM 002'
        current_text = [line]
        current_section = 'theory'
    elif line.startswith('### CHM 003:'):
        if current_section and current_text:
            theory_sections.append({'course': current_course, 'text': '\n'.join(current_text).strip()})
        current_course = 'CHM 003'
        current_text = [line]
        current_section = 'theory'
    elif line.startswith('### CHM 004:'):
        if current_section and current_text:
            theory_sections.append({'course': current_course, 'text': '\n'.join(current_text).strip()})
        current_course = 'CHM 004'
        current_text = [line]
        current_section = 'theory'
    elif line.startswith('## MARKING GUIDE') or line.startswith('## ANSWERS TO MCQ'):
        if current_section and current_text:
            theory_sections.append({'course': current_course, 'text': '\n'.join(current_text).strip()})
        current_section = None
    elif line.startswith('## PRACTICAL'):
        if current_section and current_text:
            theory_sections.append({'course': current_course, 'text': '\n'.join(current_text).strip()})
        current_section = None
    elif current_section == 'theory' and line.strip():
        current_text.append(line)

# Combine theory into one big text per course, merging all options
combined_theory = {}
for sec in theory_sections:
    course = sec['course']
    if course not in combined_theory:
        combined_theory[course] = []
    combined_theory[course].append(sec['text'])

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

# ============ GENERATE TS OUTPUT ============
output_lines = []

# Add objective questions
for q in mcq_questions:
    qnum = q['num']
    opts = q['options']
    answer = q['answer']
    
    # Map answer letter to text
    answer_text = ''
    if answer and opts:
        idx = ord(answer) - ord('A')
        if 0 <= idx < len(opts):
            answer_text = opts[idx]
    
    if len(opts) == 4 and answer:
        output_lines.append('    {')
        output_lines.append(f'      id:"che-2025-obj-{qnum:04d}",')
        output_lines.append('      subject:"chemistry",')
        output_lines.append('      year:2025,')
        output_lines.append('      category:"objective",')
        question_escaped = q['question'].replace('\\', '\\\\').replace('"', '\\"')
        output_lines.append(f'      question:"{question_escaped}",')
        output_lines.append('      options:[')
        labels = ['A','B','C','D']
        for i, opt in enumerate(opts):
            opt_escaped = opt.replace('\\', '\\\\').replace('"', '\\"')
            output_lines.append(f'        {{label:"{labels[i]}", text:"{opt_escaped}"}},')
        output_lines.append('      ],')
        output_lines.append(f'      correctAnswer:"{answer_text}",')
        output_lines.append('      difficulty:"medium"')
        output_lines.append('    },')
    else:
        print(f"SKIP Q{qnum}: only {len(opts)} options or no answer ({answer})")

# Add theory questions - combined into one entry per course
theory_order = ['CHM 001', 'CHM 002', 'CHM 003', 'CHM 004']
tid = 1
for course in theory_order:
    if course in combined_theory:
        theory_text_combined = '\n\n---\n\n'.join(combined_theory[course])
        output_lines.append('    {')
        output_lines.append(f'      id:"che-2025-t{tid:04d}",')
        output_lines.append('      subject:"chemistry",')
        output_lines.append('      year:2025,')
        output_lines.append('      category:"theory",')
        output_lines.append(f'      course:"{course}",')
        theory_escaped = theory_text_combined.replace('\\', '\\\\').replace('"', '\\"')
        # Keep newlines in the text
        output_lines.append(f'      question:`{theory_escaped}`,')
        output_lines.append('      difficulty:"medium"')
        output_lines.append('    },')
        tid += 1

# Add practical questions
if practical_text:
    output_lines.append('    {')
    output_lines.append('      id:"che-2025-p0001",')
    output_lines.append('      subject:"chemistry",')
    output_lines.append('      year:2025,')
    output_lines.append('      category:"practical",')
    practical_escaped = practical_text.replace('\\', '\\\\').replace('"', '\\"')
    output_lines.append(f'      question:`{practical_escaped}`,')
    output_lines.append('      difficulty:"medium"')
    output_lines.append('    },')

ts_output = '\n'.join(output_lines)

# Write to file
with open(r'C:\Users\HP\Downloads\chem_2025_generated.txt', 'w', encoding='utf-8') as f:
    f.write(ts_output)

print(f"Generated {len([l for l in output_lines if 'id:' in l])} entries")
print(f"MCQs parsed: {len(mcq_questions)}")
print(f"Theory sections: {len(combined_theory)}")
print(f"Practical: {'yes' if practical_text else 'no'}")

# Print summary
obj_count = sum(1 for l in output_lines if 'che-2025-obj-' in l)
theory_count = sum(1 for l in output_lines if 'che-2025-t' in l and l.strip().startswith('id:'))
prac_count = sum(1 for l in output_lines if 'che-2025-p' in l)
print(f"Objective: {obj_count}, Theory: {theory_count}, Practical: {prac_count}")
