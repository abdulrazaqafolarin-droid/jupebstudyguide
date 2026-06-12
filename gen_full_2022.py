import json, re, sys

with open('C:/Users/HP/Downloads/physics 2014-2023/2022 theory OBJ.txt', 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')

# Find section boundaries
essay_section = []
practical_section = []
answers_section = []
current_section = None

for i, line in enumerate(lines):
    stripped = line.strip()
    if 'ESSAY QUESTIONS (2022) — ONE from each Course' in line:
        current_section = 'essay'
        continue
    elif 'PRACTICAL QUESTIONS (2022)' in line:
        current_section = 'practical'
        continue
    elif stripped.startswith('ESSAY QUESTIONS') and 'CHM' in stripped:
        current_section = 'answers'
        continue
    
    if current_section == 'essay':
        essay_section.append(line)
    elif current_section == 'practical':
        practical_section.append(line)
    elif current_section == 'answers':
        answers_section.append(line)

# Parse essay section into course-based theory questions
essay_text = '\n'.join(essay_section)

# Split by course headings
course_pattern = r'(CHM \d+: .+?)(?=\n(?:CHM \d+:|$))'
courses = re.split(r'\n(?=CHM \d+:)', essay_text)

theory_entries = []
t_no = 1

for course_block in courses:
    course_block = course_block.strip()
    if not course_block:
        continue
    
    # Get course name from first line
    first_newline = course_block.find('\n')
    if first_newline >= 0:
        course_name = course_block[:first_newline].strip()
        course_content = course_block[first_newline+1:].strip()
    else:
        course_name = course_block
        course_content = ''
    
    if not course_name.startswith('CHM'):
        continue
    
    # Escape for TS string
    combined = f"{course_name}\n\n{course_content}"
    combined = combined.replace('\\', '\\\\')
    combined = combined.replace('"', '\\"')
    combined = combined.replace('\n', '\\n')
    
    theory_entries.append({
        'id': f'che-2022-t{t_no:04d}',
        'course': course_name,
        'text': combined
    })
    t_no += 1

# Parse practical section
practical_text = '\n'.join(practical_section).strip()
practical_text_esc = practical_text.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')

# Generate final output
with open('C:/Users/HP/Downloads/chem_2022_full_replacement.txt', 'w', encoding='utf-8') as out:
    # Read the existing objective entries from parsed file
    with open('C:/Users/HP/Downloads/chem_2022_obj_parsed.txt', 'r', encoding='utf-8') as obj_file:
        obj_content = obj_file.read()
    out.write(obj_content)
    out.write('\n')
    
    # Theory entries
    for t in theory_entries:
        out.write(f'    {{\n')
        out.write(f'      id: "{t["id"]}",\n')
        out.write(f'      subject: "chemistry",\n')
        out.write(f'      year: 2022,\n')
        out.write(f'      category: "theory",\n')
        out.write(f'      question: "{t["text"]}",\n')
        out.write(f'      totalMarks: 10,\n')
        out.write(f'      difficulty: "medium"\n')
        out.write(f'    }},\n')
    
    out.write('\n')
    # Practical entry
    out.write(f'    {{\n')
    out.write(f'      id: "che-2022-p0001",\n')
    out.write(f'      subject: "chemistry",\n')
    out.write(f'      year: 2022,\n')
    out.write(f'      category: "practical",\n')
    out.write(f'      question: "{practical_text_esc}",\n')
    out.write(f'      difficulty: "medium"\n')
    out.write(f'    }},\n')

print(f"Objectives: 47", file=sys.stderr)
print(f"Theory: {len(theory_entries)}", file=sys.stderr)
for t in theory_entries:
    print(f"  {t['id']}: {t['course']}", file=sys.stderr)
