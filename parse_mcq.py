import json, re, sys

with open('C:/Users/HP/Downloads/physics 2014-2023/2022 theory OBJ.txt', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.split('\n')

# Find section boundaries
essay_start = None
practical_start = None
mcq_end = None

for i, line in enumerate(lines):
    if 'ESSAY QUESTIONS' in line and essay_start is None:
        essay_start = i
    if 'PRACTICAL QUESTIONS' in line:
        practical_start = i

if essay_start is None:
    essay_start = len(lines)
mcq_end = essay_start if practical_start is None else min(essay_start, practical_start)

# Collect MCQ lines
mcq_raw = []
for i in range(1, mcq_end):
    stripped = lines[i].strip()
    if stripped and not stripped.startswith('JUPEB') and not stripped.startswith('[Diagram') and 'diagram' not in stripped.lower()[:20]:
        mcq_raw.append(stripped)

# Parse MCQs: each question ends when we hit a line with A. B. C. D. options
questions = []
current_q_parts = []

for line in mcq_raw:
    has_abcd = bool(re.search(r'\b[A-D]\.\s', line))
    
    if has_abcd:
        # This line contains options
        # Extract question part (before first option)
        parts = re.split(r'\s+(?=[A-D]\.\s)', line, maxsplit=1)
        if len(parts) == 2:
            q_text = parts[0].strip()
            opts_str = parts[1]
        else:
            q_text = ''
            opts_str = line
        
        if current_q_parts:
            q_text = ' '.join(current_q_parts) + (' ' + q_text if q_text else '')
            current_q_parts = []
        
        # Parse options: A. text B. text C. text D. text
        opts = []
        # Find all option groups
        opt_matches = re.findall(r'([A-D])\.\s*(.*?)(?=\s+[A-D]\.\s|\s*$)', opts_str)
        if opt_matches:
            for label, opt_text in opt_matches:
                opts.append({'label': label, 'text': opt_text.strip()})
        
        questions.append({'question': q_text.strip(), 'options': opts})
    else:
        current_q_parts.append(line)

# Generate TS entries
with open('C:/Users/HP/Downloads/chem_2022_obj_parsed.txt', 'w', encoding='utf-8') as out:
    for i, q in enumerate(questions):
        out.write(f"    {{\n")
        out.write(f'      id: "che-2022-obj-{i+1:04d}",\n')
        out.write(f'      subject: "chemistry",\n')
        out.write(f'      year: 2022,\n')
        out.write(f'      category: "objective",\n')
        # Escape question text
        qtext = q['question'].replace('\\', '\\\\').replace('"', '\\"')
        out.write(f'      question: "{qtext}",\n')
        out.write(f'      options: [\n')
        for opt in q['options']:
            optext = opt['text'].replace('\\', '\\\\').replace('"', '\\"')
            out.write(f'        {{ label: "{opt["label"]}", text: "{optext}" }},\n')
        out.write(f'      ],\n')
        out.write(f'      difficulty: "medium"\n')
        out.write(f'    }},\n')

print(f"Total MCQs parsed: {len(questions)}", file=sys.stderr)
