import json

with open('C:/Users/HP/Downloads/chem_2022.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Generate objective entries
obj_lines = []
for i, q in enumerate(data['mcq']):
    q_no = i + 1
    obj_lines.append(f'    {{')
    obj_lines.append(f'      id: "che-2022-obj-{q_no:04d}",')
    obj_lines.append(f'      subject: "chemistry",')
    obj_lines.append(f'      year: 2022,')
    obj_lines.append(f'      category: "objective",')
    obj_lines.append(f'      question: "{q["question"]}",')
    obj_lines.append(f'      options: [')
    for label in ['A', 'B', 'C', 'D']:
        if label in q['options']:
            obj_lines.append(f'        {{ label: "{label}", text: "{q["options"][label]}" }},')
    obj_lines.append(f'      ],')
    obj_lines.append(f'      difficulty: "medium"')
    obj_lines.append(f'    }},')

# Generate theory entries
theory_lines = []
t_no = 1
for essay in data['essay']:
    parts_text_parts = []
    for part in essay['parts']:
        marks = part['marks']
        text = part['text']
        parts_text_parts.append(f"({part['label']}) [{marks} Marks] {text}")
    
    course = essay['course']
    parts_text = '\n\n'.join(parts_text_parts)
    combined = f"Question {essay['number']}: {course}\n\n{parts_text}"
    
    # Escape for TS string
    combined = combined.replace('\\', '\\\\')
    combined = combined.replace('"', '\\"')
    combined = combined.replace('\n', '\\n')
    
    theory_lines.append(f'    {{')
    theory_lines.append(f'      id: "che-2022-t{t_no:04d}",')
    theory_lines.append(f'      subject: "chemistry",')
    theory_lines.append(f'      year: 2022,')
    theory_lines.append(f'      category: "theory",')
    theory_lines.append(f'      question: "{combined}",')
    theory_lines.append(f'      totalMarks: 10,')
    theory_lines.append(f'      difficulty: "medium"')
    theory_lines.append(f'    }},')
    t_no += 1

all_lines = obj_lines + [''] + theory_lines
result = '\n'.join(all_lines)

with open('C:/Users/HP/Downloads/chem_2022_replacement.txt', 'w', encoding='utf-8') as f:
    f.write(result)

print(f"Generated {len(obj_lines)} obj lines ({len(data['mcq'])} questions) + {len(theory_lines)} theory lines ({len(data['essay'])} essays)")
print(f"Total replacement size: {len(result)} chars")
