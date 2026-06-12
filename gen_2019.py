import re, sys

with open('C:/Users/HP/Downloads/2019 chemistry.txt', 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')

# Find section boundaries
mcq_end = None
essay_start = None
practical_start = None

for i, line in enumerate(lines):
    if 'SECTION B: ESSAY QUESTIONS' in line:
        essay_start = i
    elif 'PRACTICAL QUESTIONS' in line:
        practical_start = i

# Collect MCQ lines (from first question (line 7) to essay_start)
mcq_raw = []
for i in range(7, essay_start):
    stripped = lines[i].strip()
    if stripped and not stripped.startswith('---') and not stripped.startswith('## JUPEB'):
        mcq_raw.append(stripped)

# Parse MCQs
questions = []
current_q_parts = []

for line in mcq_raw:
    has_options = bool(re.search(r'(?<![A-Z])[A-D]\.\s', line))
    
    if has_options:
        if re.match(r'^[A-D]\.\s', line):
            if current_q_parts:
                opts = re.findall(r'([A-D])\.\s*(.*?)(?=\s+[A-D]\.\s|\s*$)', line)
                if opts:
                    question = ' '.join(current_q_parts)
                    questions.append({'question': question, 'options': [{'label': o[0], 'text': o[1].strip()} for o in opts]})
                    current_q_parts = []
        else:
            match = re.search(r'\s([A-D])\.\s', line)
            if match:
                q_text = line[:match.start()].strip()
                opts_str = line[match.start()+1:]
                if current_q_parts:
                    q_text = ' '.join(current_q_parts) + ' ' + q_text
                    current_q_parts = []
                opts = re.findall(r'([A-D])\.\s*(.*?)(?=\s+[A-D]\.\s|\s*$)', opts_str)
                if opts:
                    formatted_opts = [{'label': o[0], 'text': o[1].strip()} for o in opts]
                    # Deduplicate - sometimes OCR adds duplicate options
                    seen = set()
                    unique_opts = []
                    for o in formatted_opts:
                        key = o['label']
                        if key not in seen:
                            seen.add(key)
                            unique_opts.append(o)
                    questions.append({'question': q_text, 'options': unique_opts})
            else:
                current_q_parts.append(line)
    else:
        current_q_parts.append(line)

# Deduplicate final question list
seen_questions = set()
unique_questions = []
for q in questions:
    key = q['question'][:50]
    if key not in seen_questions:
        seen_questions.add(key)
        unique_questions.append(q)

# Output objectives
out_lines = []
for i, q in enumerate(unique_questions):
    qtext = q['question'].replace('\\', '\\\\').replace('"', '\\"')
    out_lines.append(f'    {{')
    out_lines.append(f'      id: "che-2019-obj-{i+1:04d}",')
    out_lines.append(f'      subject: "chemistry",')
    out_lines.append(f'      year: 2019,')
    out_lines.append(f'      category: "objective",')
    out_lines.append(f'      question: "{qtext}",')
    out_lines.append(f'      options: [')
    for opt in q['options']:
        optext = opt['text'].replace('\\', '\\\\').replace('"', '\\"')
        out_lines.append(f'        {{ label: "{opt["label"]}", text: "{optext}" }},')
    out_lines.append(f'      ],')
    out_lines.append(f'      difficulty: "medium"')
    out_lines.append(f'    }},')

# Parse essay section
essay_lines = lines[essay_start:practical_start] if practical_start else lines[essay_start:]
essay_text = '\n'.join(essay_lines)

# Split by course headings (CHM)
courses = re.split(r'\n(?=### CHM \d+:|CHM \d+:)', essay_text)

t_no = 1
for course_block in courses:
    course_block = course_block.strip()
    if not course_block:
        continue
    
    # Get course name
    lines_ = course_block.split('\n')
    course_name = ''
    for l in lines_:
        stripped = l.strip().strip('#').strip()
        if stripped.startswith('CHM'):
            course_name = stripped
            break
    
    if not course_name:
        continue
    
    combined = f"{course_name}\n\n{course_block}"
    combined = combined.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
    
    out_lines.append(f'    {{')
    out_lines.append(f'      id: "che-2019-t{t_no:04d}",')
    out_lines.append(f'      subject: "chemistry",')
    out_lines.append(f'      year: 2019,')
    out_lines.append(f'      category: "theory",')
    out_lines.append(f'      question: "{combined}",')
    out_lines.append(f'      totalMarks: 10,')
    out_lines.append(f'      difficulty: "medium"')
    out_lines.append(f'    }},')
    t_no += 1

# Parse practical
if practical_start:
    practical_text = '\n'.join(lines[practical_start:]).strip()
    practical_text_esc = practical_text.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
    out_lines.append(f'    {{')
    out_lines.append(f'      id: "che-2019-p0001",')
    out_lines.append(f'      subject: "chemistry",')
    out_lines.append(f'      year: 2019,')
    out_lines.append(f'      category: "practical",')
    out_lines.append(f'      question: "{practical_text_esc}",')
    out_lines.append(f'      difficulty: "medium"')
    out_lines.append(f'    }},')

result = '\n'.join(out_lines)
with open('C:/Users/HP/Downloads/chem_2019_replacement.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f"Generated: {len(unique_questions)} objectives, {t_no-1} theory, practical: {'yes' if practical_start else 'no'}", file=sys.stderr)
