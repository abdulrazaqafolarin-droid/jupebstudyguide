import re, sys

with open('C:/Users/HP/Downloads/2016 past question OBJ and theory.txt', 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')

# Find section boundaries
essay_start = None
practical_start = None

for i, line in enumerate(lines):
    if 'ESSAY QUESTIONS (2016)' in line:
        essay_start = i
    if 'PRACTICAL QUESTIONS' in line:
        practical_start = i

print(f"Essay at line: {essay_start}, Practical at: {practical_start}", file=sys.stderr)

# Parse MCQs (from line 3 to essay_start)
mcq_raw = []
for i in range(3, essay_start):
    stripped = lines[i].strip()
    if stripped:
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
                    questions.append({'question': q_text, 'options': [{'label': o[0], 'text': o[1].strip()} for o in opts]})
            else:
                current_q_parts.append(line)
    else:
        current_q_parts.append(line)

# Output objectives
out_lines = []
for i, q in enumerate(questions):
    qtext = q['question'].replace('\\', '\\\\').replace('"', '\\"')
    out_lines.append(f'    {{')
    out_lines.append(f'      id: "che-2016-obj-{i+1:04d}",')
    out_lines.append(f'      subject: "chemistry",')
    out_lines.append(f'      year: 2016,')
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

# Split by course headings
courses = re.split(r'\n(?=CHM \d+:)', essay_text)

t_no = 1
for course_block in courses:
    course_block = course_block.strip()
    if not course_block or not course_block.startswith('CHM'):
        continue
    
    first_nl = course_block.find('\n')
    if first_nl >= 0:
        course_name = course_block[:first_nl].strip()
        course_content = course_block[first_nl+1:].strip()
    else:
        continue
    
    combined = f"{course_name}\n\n{course_content}"
    combined = combined.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
    
    out_lines.append(f'    {{')
    out_lines.append(f'      id: "che-2016-t{t_no:04d}",')
    out_lines.append(f'      subject: "chemistry",')
    out_lines.append(f'      year: 2016,')
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
    out_lines.append(f'      id: "che-2016-p0001",')
    out_lines.append(f'      subject: "chemistry",')
    out_lines.append(f'      year: 2016,')
    out_lines.append(f'      category: "practical",')
    out_lines.append(f'      question: "{practical_text_esc}",')
    out_lines.append(f'      difficulty: "medium"')
    out_lines.append(f'    }},')

result = '\n'.join(out_lines)
with open('C:/Users/HP/Downloads/chem_2016_replacement.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f"Generated: {len(questions)} objectives, {t_no-1} theory, practical: {'yes' if practical_start else 'no'}", file=sys.stderr)
