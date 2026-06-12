import re, sys

with open(r'C:\Users\HP\Downloads\2017  past quetion chemistry.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# === SECTION A: MCQs ===
mcq_match = re.search(r'MULTIPLE CHOICE QUESTIONS.*?\n', text)
essay_match = re.search(r'SECTION B:', text)

mcq_block = text[mcq_match.end():essay_match.start()]
mcq_lines = [l.strip() for l in mcq_block.split('\n') if l.strip() and not l.startswith('---')]

out_lines = []

i = 0
while i < len(mcq_lines):
    line = mcq_lines[i]
    
    # Check if line starts a question
    m = re.match(r'^\d+[\.\)]\s+(.*)', line)
    if not m:
        i += 1
        continue
    
    num_match = re.match(r'^(\d+)[\.\)]', line)
    num = int(num_match.group(1))
    qtext = m.group(1).strip()
    
    # Next line(s) contain options
    opts_lines = []
    j = i + 1
    while j < len(mcq_lines):
        nl = mcq_lines[j]
        if re.match(r'^\d+[\.\)]', nl):
            break
        if re.search(r'[A-D]\.\s', nl):
            opts_lines.append(nl)
        j += 1
    
    if opts_lines:
        opts_str = ' '.join(opts_lines)
        opts = re.findall(r'([A-D])\.\s*(.*?)(?=\s+[A-D]\.\s|\s*$)', opts_str)
        
        if opts and len(opts) >= 2:
            qtext = qtext.replace('\\', '\\\\').replace('"', '\\"')
            
            out_lines.append(f'    {{')
            out_lines.append(f'      id: "che-2017-obj-{num:04d}",')
            out_lines.append(f'      subject: "chemistry",')
            out_lines.append(f'      year: 2017,')
            out_lines.append(f'      category: "objective",')
            out_lines.append(f'      question: "{qtext}",')
            out_lines.append(f'      options: [')
            for o in opts:
                optext = o[1].strip().rstrip(',').strip()
                optext = optext.replace('\\', '\\\\').replace('"', '\\"')
                out_lines.append(f'        {{ label: "{o[0]}", text: "{optext}" }},')
            out_lines.append(f'      ],')
            out_lines.append(f'      difficulty: "medium"')
            out_lines.append(f'    }},')
            
            i = j
            continue
    
    i += 1

# === SECTION B: ESSAY ===
essay_block = text[essay_match.start():]
practical_match = re.search(r'PRACTICAL CHEMISTRY', essay_block)
essay_text = essay_block[:practical_match.start()] if practical_match else essay_block
practical_text = essay_block[practical_match.start():] if practical_match else ''

course_pattern = re.compile(r'### (CHM \d+.*?)(?:\n|\Z)')
courses = list(course_pattern.finditer(essay_text))

t_no = 1
for idx, cm in enumerate(courses):
    start = cm.end()
    end = courses[idx + 1].start() if idx + 1 < len(courses) else len(essay_text)
    
    course_block = essay_text[start:end].strip()
    course_name = cm.group(1).strip()
    
    combined = f'{course_name}\n\n{course_block}'
    combined = combined.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
    
    out_lines.append(f'    {{')
    out_lines.append(f'      id: "che-2017-t{t_no:04d}",')
    out_lines.append(f'      subject: "chemistry",')
    out_lines.append(f'      year: 2017,')
    out_lines.append(f'      category: "theory",')
    out_lines.append(f'      question: "{combined}",')
    out_lines.append(f'      totalMarks: 10,')
    out_lines.append(f'      difficulty: "medium"')
    out_lines.append(f'    }},')
    t_no += 1

# === PRACTICAL ===
if practical_text:
    practical_text_clean = practical_text.strip()
    practical_text_clean = practical_text_clean.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
    
    out_lines.append(f'    {{')
    out_lines.append(f'      id: "che-2017-p0001",')
    out_lines.append(f'      subject: "chemistry",')
    out_lines.append(f'      year: 2017,')
    out_lines.append(f'      category: "practical",')
    out_lines.append(f'      question: "{practical_text_clean}",')
    out_lines.append(f'      difficulty: "medium"')
    out_lines.append(f'    }},')

result = '\n'.join(out_lines)

obj_count = len([l for l in out_lines if 'che-2017-obj-' in l])
t_count = len([l for l in out_lines if 'che-2017-t0' in l])
p_count = len([l for l in out_lines if 'che-2017-p0' in l])

with open('C:/Users/HP/Downloads/chem_2017_replacement.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f'Generated: {obj_count} objectives, {t_count} theory, {p_count} practical', file=sys.stderr)
