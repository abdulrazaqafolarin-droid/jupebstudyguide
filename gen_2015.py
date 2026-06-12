import json
import re

with open('C:/Users/HP/Downloads/chemistry_extraction.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def parse_objective_q(raw_text):
    text = re.sub(r'Alevelschool\.com\.ng\s*\n*\s*\d*', '', raw_text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()
    text = re.sub(r'^\d+\.\s*', '', text)
    parts = re.split(r'\n(?=[A-D]\.\s)', text, maxsplit=1)
    question_text = parts[0].strip()
    question_text = re.sub(r'\s+', ' ', question_text)
    options = []
    if len(parts) > 1:
        opts_text = parts[1]
        opts = re.split(r'\n(?=[A-D]\.\s)', opts_text)
        for opt in opts:
            opt = opt.strip()
            match = re.match(r'([A-D])\.\s*(.*)', opt, re.DOTALL)
            if match:
                label = match.group(1)
                txt = match.group(2).strip()
                txt = re.sub(r'\s+', ' ', txt)
                txt = re.sub(r'\s*Alevelschool\.com\.ng.*', '', txt)
                options.append({"label": label, "text": txt})
    return question_text, options

# Generate objective entries
obj_lines = []
for i, q in enumerate(data['objective_questions']):
    q_text, opts = parse_objective_q(q['raw_text'])
    q_no = i + 1
    obj_lines.append(f'    {{')
    obj_lines.append(f'      id: "che-2015-obj-{q_no:04d}",')
    obj_lines.append(f'      subject: "chemistry",')
    obj_lines.append(f'      year: 2015,')
    obj_lines.append(f'      category: "objective",')
    obj_lines.append(f'      question: "{q_text}",')
    obj_lines.append(f'      options: [')
    for opt in opts:
        obj_lines.append(f'        {{ label: "{opt["label"]}", text: "{opt["text"]}" }},')
    obj_lines.append(f'      ],')
    obj_lines.append(f'      difficulty: "medium"')
    obj_lines.append(f'    }},')

# Generate theory entries from essay section
essay = data['essay_section_raw']

# Split on CHM headings
parts = re.split(r'(CHM \d+: .*?)(?=\n)', essay)

theory_lines = []
t_no = 1
for i, part in enumerate(parts):
    stripped = part.strip()
    if stripped.startswith('CHM '):
        content = ''
        if i + 1 < len(parts):
            content = parts[i + 1].strip()
        content = re.sub(r'\n{4,}', '\n\n', content)
        content = re.sub(r'Alevelschool\.com\.ng.*', '', content)
        content = content.strip()
        
        combined = f"{stripped}\n\n{content}"
        combined = combined.replace('\\', '\\\\')
        combined = combined.replace('"', '\\"')
        combined = combined.replace('\n', '\\n')
        
        theory_lines.append(f'    {{')
        theory_lines.append(f'      id: "che-2015-t{t_no:04d}",')
        theory_lines.append(f'      subject: "chemistry",')
        theory_lines.append(f'      year: 2015,')
        theory_lines.append(f'      category: "theory",')
        theory_lines.append(f'      question: "{combined}",')
        theory_lines.append(f'      totalMarks: 10,')
        theory_lines.append(f'      difficulty: "medium"')
        theory_lines.append(f'    }},')
        t_no += 1

all_lines = obj_lines + [''] + theory_lines
result = '\n'.join(all_lines)

with open('C:/Users/HP/Downloads/2015_replacement.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f"Generated {len(obj_lines)} obj lines + {len(theory_lines)} theory lines")
print(f"Total replacement size: {len(result)} chars")
