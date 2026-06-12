import json, re, sys

with open('C:/Users/HP/Downloads/physics 2014-2023/2022 theory OBJ.txt', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.split('\n')

# Find section boundaries
essay_start = None
practical_start = None

for i, line in enumerate(lines):
    if 'ESSAY QUESTIONS (2022) — ONE from each Course' in line:
        essay_start = i
        break

# Collect MCQ lines (from line 3 to essay_start)
mcq_raw = []
for i in range(3, essay_start):
    stripped = lines[i].strip()
    if stripped and not any(x in stripped for x in ['JUPEB', 'ESSAY', 'PRACTICAL']):
        mcq_raw.append(stripped)

# Parse MCQs
questions = []
current_q_parts = []

for line in mcq_raw:
    # Check if this line has options pattern
    has_options = bool(re.search(r'(?<![A-Z])[A-D]\.\s', line))
    
    if has_options:
        # Try to extract all options
        # First, check if line starts with an option
        if re.match(r'^[A-D]\.\s', line):
            # Pure options line - accumulate to previous question
            if current_q_parts:
                # Parse all options from this line
                opts = re.findall(r'([A-D])\.\s*(.*?)(?=\s+[A-D]\.\s|\s*$)', line)
                if opts:
                    question = ' '.join(current_q_parts)
                    q_opts = [{'label': o[0], 'text': o[1].strip()} for o in opts]
                    questions.append({'question': question, 'options': q_opts})
                    current_q_parts = []
        else:
            # Line has question text followed by options
            # Find where the first option starts
            match = re.search(r'\s([A-D])\.\s', line)
            if match:
                q_text = line[:match.start()].strip()
                opts_str = line[match.start()+1:]  # includes the first option marker
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

# Output
with open('C:/Users/HP/Downloads/chem_2022_obj_parsed.txt', 'w', encoding='utf-8') as out:
    for i, q in enumerate(questions):
        qtext = q['question'].replace('\\', '\\\\').replace('"', '\\"')
        out.write(f"    {{\n")
        out.write(f'      id: "che-2022-obj-{i+1:04d}",\n')
        out.write(f'      subject: "chemistry",\n')
        out.write(f'      year: 2022,\n')
        out.write(f'      category: "objective",\n')
        out.write(f'      question: "{qtext}",\n')
        out.write(f'      options: [\n')
        for opt in q['options']:
            optext = opt['text'].replace('\\', '\\\\').replace('"', '\\"')
            out.write(f'        {{ label: "{opt["label"]}", text: "{optext}" }},\n')
        out.write(f'      ],\n')
        out.write(f'      difficulty: "medium"\n')
        out.write(f'    }},\n')

print(f"Total MCQs parsed: {len(questions)}", file=sys.stderr)
