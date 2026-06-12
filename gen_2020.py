import re, sys

with open(r'C:\Users\HP\Downloads\chemistry 2020.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# === SECTION A: MCQs ===
# Find MCQ block - from "MULTIPLE CHOICE" to "ESSAY QUESTIONS" or blank line before essays
mcq_end = re.search(r'\n\n\nESSAY QUESTIONS', text) or re.search(r'\n\nESSAY QUESTIONS', text)
essay_match = re.search(r'ESSAY QUESTIONS', text)

mcq_block = text[:essay_match.start()]
# Remove header
mcq_block = re.sub(r'JUPEB 2020.*?\n', '', mcq_block)

mcq_lines = [l.strip() for l in mcq_block.split('\n') if l.strip() and not l.startswith('---')]

out_lines = []

# Parse: group lines into questions with options
# Pattern: a line ending with ? is the question, then lines with A./B./C./D. are options
i = 0
q_no = 0
while i < len(mcq_lines):
    line = mcq_lines[i]
    
    # Skip the header
    if 'MULTIPLE CHOICE' in line:
        i += 1
        continue
    
    # Check if this looks like a question (no A./B./C./D. at start)
    has_opts = bool(re.match(r'[A-D]\.', line))
    
    if not has_opts:
        q_text = line
        
        # Collect option lines
        opts_lines = []
        j = i + 1
        while j < len(mcq_lines):
            nl = mcq_lines[j]
            if re.match(r'[A-D]\.', nl):
                opts_lines.append(nl)
            else:
                break
            j += 1
        
        # Also check if options are inline on the same line (for format like "A. ... B. ...")
        if not opts_lines:
            # Check if the line itself has all 4 options
            inline_opts = re.findall(r'([A-D])\.\s+', line)
            if len(inline_opts) >= 2:
                # Split question from options
                parts = re.split(r'\s+([A-D])\.\s+', line, maxsplit=1)
                if len(parts) >= 2:
                    q_text = parts[0]
                    opts_str = line[len(q_text):]
                    opts = re.findall(r'([A-D])\.\s*(.*?)(?=\s+[A-D]\.\s|\s*$)', opts_str)
                    if opts:
                        q_no += 1
                        q_text_esc = q_text.strip().rstrip('?').strip()
                        q_text_esc = q_text_esc.replace('\\', '\\\\').replace('"', '\\"')
                        
                        out_lines.append(f'    {{')
                        out_lines.append(f'      id: "che-2020-obj-{q_no:04d}",')
                        out_lines.append(f'      subject: "chemistry",')
                        out_lines.append(f'      year: 2020,')
                        out_lines.append(f'      category: "objective",')
                        out_lines.append(f'      question: "{q_text_esc}",')
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
            i = j
            continue
        
        if opts_lines:
            q_no += 1
            opts_str = ' '.join(opts_lines)
            opts = re.findall(r'([A-D])\.\s*(.*?)(?=\s+[A-D]\.\s|\s*$)', opts_str)
            
            if opts:
                q_text = q_text.strip().rstrip('?').strip()
                q_text = q_text.replace('\\', '\\\\').replace('"', '\\"')
                
                out_lines.append(f'    {{')
                out_lines.append(f'      id: "che-2020-obj-{q_no:04d}",')
                out_lines.append(f'      subject: "chemistry",')
                out_lines.append(f'      year: 2020,')
                out_lines.append(f'      category: "objective",')
                out_lines.append(f'      question: "{q_text}",')
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
# Split by CHM course headings
essay_block = text[essay_match.start():]
practical_match = re.search(r'PRACTICAL CHEMISTRY', essay_block)
essay_text = essay_block[:practical_match.start()] if practical_match else essay_block
practical_text = essay_block[practical_match.start():] if practical_match else ''

# Find course headings - CHM 001, etc.
course_pattern = re.compile(r'CHM (\d+):.*?(?=\n|$)')
courses = list(course_pattern.finditer(essay_text))

t_no = 1
for idx, cm in enumerate(courses):
    # Find the full heading
    start_line = essay_text.rfind('\n', 0, cm.start())
    if start_line < 0:
        start_line = cm.start()
    heading_line = essay_text[start_line:].split('\n')[0].strip()
    heading_text = heading_line.strip('#').strip()
    
    # Content starts after heading
    content_start = cm.end()
    # Find CHM 002, CHM 003, CHM 004 or practical
    if idx + 1 < len(courses):
        # Find where next course heading starts
        next_heading_start = courses[idx + 1].start()
        # Go back to start of that line
        next_start = essay_text.rfind('\n', 0, next_heading_start)
        if next_start < 0:
            next_start = next_heading_start
        content_end = next_start
    else:
        content_end = len(essay_text) if not practical_match else practical_match.start()
    
    course_block = essay_text[content_start:content_end].strip()
    
    combined = f'{heading_text}\n\n{course_block}'
    combined = combined.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
    
    out_lines.append(f'    {{')
    out_lines.append(f'      id: "che-2020-t{t_no:04d}",')
    out_lines.append(f'      subject: "chemistry",')
    out_lines.append(f'      year: 2020,')
    out_lines.append(f'      category: "theory",')
    out_lines.append(f'      question: "{combined}",')
    out_lines.append(f'      totalMarks: 10,')
    out_lines.append(f'      difficulty: "medium"')
    out_lines.append(f'    }},')
    t_no += 1

# === PRACTICAL ===
if practical_text:
    practical_text = practical_text.strip()
    practical_text = practical_text.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
    
    out_lines.append(f'    {{')
    out_lines.append(f'      id: "che-2020-p0001",')
    out_lines.append(f'      subject: "chemistry",')
    out_lines.append(f'      year: 2020,')
    out_lines.append(f'      category: "practical",')
    out_lines.append(f'      question: "{practical_text}",')
    out_lines.append(f'      difficulty: "medium"')
    out_lines.append(f'    }},')

result = '\n'.join(out_lines)

obj_count = len([l for l in out_lines if 'che-2020-obj-' in l])
t_count = len([l for l in out_lines if 'che-2020-t0' in l])
p_count = len([l for l in out_lines if 'che-2020-p0' in l])

with open('C:/Users/HP/Downloads/chem_2020_replacement.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f'Generated: {obj_count} objectives, {t_count} theory, {p_count} practical', file=sys.stderr)
