import re

with open(r'C:\Users\HP\Downloads\physics 2014-2023\2018 chemistry OBJ and theory.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find ESSAY section and ANSWERS section
essay_start = None
section_a_end = None
for i, line in enumerate(lines):
    if 'SECTION B: ESSAY QUESTIONS' in line:
        essay_start = i
    elif 'SECTION A: MULTIPLE CHOICE ANSWERS' in line:
        section_a_end = i

print("ESSAY at", essay_start, "ANSWERS at", section_a_end)

# --- PARSE MCQs ---
mcqs = []

# Handle Q1 (inline format on line 4, no number prefix, no spaces around option markers)
question1_raw = lines[3].strip()
if re.search(r'[A-D]\.', question1_raw) and not re.match(r'^\d+', question1_raw):
    q1_opts = {}
    # Find positions of A., B., C., D. markers
    a_pos = question1_raw.find('A.')
    b_pos = question1_raw.find('B.', a_pos + 1) if a_pos >= 0 else -1
    c_pos = question1_raw.find('C.', b_pos + 1) if b_pos >= 0 else -1
    d_pos = question1_raw.find('D.', c_pos + 1) if c_pos >= 0 else -1
    if a_pos > 0 and b_pos > 0 and c_pos > 0 and d_pos > 0:
        q_text = question1_raw[:a_pos].strip()
        q1_opts['A'] = question1_raw[a_pos+2:b_pos].strip()
        q1_opts['B'] = question1_raw[b_pos+2:c_pos].strip()
        q1_opts['C'] = question1_raw[c_pos+2:d_pos].strip()
        q1_opts['D'] = question1_raw[d_pos+2:].strip()
        mcqs.append({'num': 1, 'question': q_text, 'options': q1_opts})
        print("Parsed Q1 (inline, no-spacing format)")

# Parse Q2-Q50
i = 2
while i < essay_start:
    line = lines[i].strip()
    if not line:
        i += 1
        continue

    match = re.match(r'^(\d+)\.(.*)', line)
    if match:
        num = int(match.group(1))
        if num < 2 or num > 50:
            i += 1
            continue

        rest = match.group(2).strip()

        # Check for inline options on same line (A., B., C., D.)
        inline_match = re.search(
            r'\s+A\.\s+(.+?)\s+B\.\s+(.+?)\s+C\.\s+(.+?)\s+D\.\s+(.+)$',
            rest
        )

        if inline_match:
            q_text = rest[:inline_match.start()].strip()
            opts = {
                'A': inline_match.group(1),
                'B': inline_match.group(2),
                'C': inline_match.group(3),
                'D': inline_match.group(4),
            }
            mcqs.append({'num': num, 'question': q_text, 'options': opts})
            i += 1
        else:
            # Multi-line question text
            q_text = rest
            i += 1
            while i < essay_start:
                nl = lines[i].strip()
                if not nl:
                    i += 1
                    continue
                if re.match(r'^[A-D]\.\s', nl):
                    break
                # Detect next question: "N." followed by non-digit (so "1.5" doesn't match)
                if re.match(r'^\d+\.(?!\d)', nl):
                    break
                if 'SECTION' in nl:
                    break
                if 'Alevelschool' in nl:
                    i += 1
                    continue
                q_text += ' ' + nl
                i += 1

            # Multi-line options
            options = {}
            current_opt = None
            while i < essay_start:
                nl = lines[i].strip()

                # Skip empty lines
                if not nl:
                    i += 1
                    continue

                # Skip page markers
                if 'Alevelschool' in nl:
                    i += 1
                    continue

                # Check for new option marker (A., B., C., D., or E.)
                om = re.match(r'^([A-E])\.\s*(.*)', nl)
                if om:
                    # Save previous option
                    current_opt = om.group(1)
                    val = om.group(2)
                    options[current_opt] = val
                    i += 1
                    continue

                # Check for new question number (e.g., "16.Calculate...")
                if re.match(r'^\d+\.(?!\d)', nl):
                    break

                # Check for SECTION heading
                if 'SECTION' in nl:
                    break

                # Continuation of the current option
                if current_opt and current_opt in options:
                    options[current_opt] += ' ' + nl
                i += 1

            mcqs.append({'num': num, 'question': q_text, 'options': options})
    else:
        i += 1

print("MCQs:", len(mcqs))
for m in mcqs:
    if not m['options']:
        print("  WARN: Q{} has no options".format(m['num']))
    elif len(m['options']) < 4:
        print("  WARN: Q{} has {} options".format(m['num'], len(m['options'])))

# --- PARSE ESSAYS ---
essays = []
current_course = None
current_text = []
i = essay_start + 1
while i < section_a_end:
    line = lines[i].strip()
    if not line or 'Alevelschool' in line:
        i += 1
        continue
    if 'CHM' in line and ':' in line and len(line) < 80:
        if current_course:
            essays.append({'course': current_course, 'text': '\n'.join(current_text).strip()})
        current_course = line
        current_text = []
    elif current_course:
        current_text.append(line)
    i += 1

if current_course:
    essays.append({'course': current_course, 'text': '\n'.join(current_text).strip()})

print("Essays:", len(essays))

# --- GENERATE TS ---
ts = []
ts.append('    // === 2018 CHEMISTRY ===')

for mcq in mcqs:
    if mcq['num'] > 50:
        continue
    q = mcq['question']
    opts = mcq['options']
    if not opts:
        continue
    opt_lines = []
    for l in ['A', 'B', 'C', 'D']:
        if l in opts:
            val = opts[l].replace('\\', '\\\\').replace('"', '\\"').replace('\n', ' ')
            opt_lines.append('        {{ label: "{0}", text: "{1}" }}'.format(l, val))
    ot = ',\n'.join(opt_lines)
    qq = q.replace('\\', '\\\\').replace('"', '\\"').replace('\n', ' ')
    ts.append('    {')
    ts.append('      id: "che-2018-obj-{0:04d}",'.format(mcq['num']))
    ts.append('      subject: "chemistry",')
    ts.append('      year: 2018,')
    ts.append('      category: "objective",')
    ts.append('      question: "{0}",'.format(qq))
    ts.append('      options: [')
    ts.append(ot + ',')
    ts.append('      ],')
    ts.append('      difficulty: "medium"')
    ts.append('    },')

for i, sec in enumerate(essays):
    idx = i + 1
    text = (sec['course'] + '\\n\\n' + sec['text']).replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
    ts.append('    {')
    ts.append('      id: "che-2018-t{0:04d}",'.format(idx))
    ts.append('      subject: "chemistry",')
    ts.append('      year: 2018,')
    ts.append('      category: "theory",')
    ts.append('      question: "{0}",'.format(text))
    ts.append('      totalMarks: 10,')
    ts.append('      difficulty: "hard"')
    ts.append('    },')

output = '\n'.join(ts)
with open(r'C:\Users\HP\Downloads\2018_chemistry_parsed.txt', 'w', encoding='utf-8') as f:
    f.write(output)

print("Written to 2018_chemistry_parsed.txt, {} lines".format(len(ts)))
