import json
import re

# Read the JSON
with open('C:/Users/HP/Downloads/chemistry_extraction.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# NOTE: static question banks were archived to archive/study-questions/
# (the live question source of truth is the Supabase study_questions table).
with open('archive/study-questions/chemistry.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Parse each objective question from the raw_text
def parse_objective_q(raw_text):
    # Remove page markers
    text = re.sub(r'Alevelschool\.com\.ng\s*\n*\s*\d*', '', raw_text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()
    
    # Remove leading question number like "1. " or "1.\\n"
    text = re.sub(r'^\d+\.\s*', '', text)
    
    # Split into question and options
    parts = re.split(r'\n(?=[A-D]\.\s)', text, maxsplit=1)
    
    question_text = parts[0].strip()
    # Clean up extra whitespace
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
                text = match.group(2).strip()
                # Clean whitespace
                text = re.sub(r'\s+', ' ', text)
                # Remove trailing page markers
                text = re.sub(r'\s*Alevelschool\.com\.ng.*', '', text)
                options.append({"label": label, "text": text})
    
    return question_text, options

# Generate new objective question entries
new_qs = []
for i, q in enumerate(data['objective_questions']):
    q_text, opts = parse_objective_q(q['raw_text'])
    q_no = i + 1
    entry = f"""    {{
      id: "che-2015-obj-{q_no:04d}",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "{q_text}",
      options: ["""
    for opt in opts:
        entry += f"""
        {{ label: "{opt['label']}", text: "{opt['text']}" }},"""
    entry += """
      ],
      difficulty: "medium"
    },"""
    new_qs.append(entry)

new_obj_text = '\n'.join(new_qs)

# Build theory questions from essay section
essay = data['essay_section_raw']

theory_qs_raw = [
    ("CHM 001: GENERAL CHEMISTRY", essay),
    ("CHM 002: PHYSICAL CHEMISTRY", essay),
    ("CHM 003: INORGANIC CHEMISTRY", essay),
    ("CHM 004: ORGANIC CHEMISTRY", essay),
]

# Actually, let's extract subsections from essay
# The essay has sections for CHM 001-004
sections = re.split(r'(CHM \d+: .*?)(?=\n|\r)', essay)

theory_entries = []
theory_id = 1
for i in range(len(sections)):
    section = sections[i].strip()
    if section.startswith('CHM '):
        # Get the content after the heading
        content = ''
        if i + 1 < len(sections):
            content = sections[i + 1].strip()
        
        # Clean up the content
        content = re.sub(r'\n{4,}', '\n\n', content)
        content = re.sub(r'Alevelschool\.com\.ng.*', '', content)
        content = content.strip()
        
        # Escape special chars for JS string
        question_text = f"{section}\n\n{content}"
        question_text = question_text.replace('\\', '\\\\')
        question_text = question_text.replace('"', '\\"')
        question_text = question_text.replace('\n', '\\n')
        
        entry = f"""    {{
      id: "che-2015-t{theory_id:04d}",
      subject: "chemistry",
      year: 2015,
      category: "theory",
      question: "{question_text}",
      totalMarks: 10,
      difficulty: "medium"
    }},"""
        theory_entries.append(entry)
        theory_id += 1

theory_text = '\n'.join(theory_entries)

# Now find the old 2015 section in the content and replace it
# The old section starts at the weird entry before q0001 and continues to q0050
old_start_marker = '      question:"Increasing acidic strength of benzoic acid derivatives'
old_end_marker = '      difficulty:"medium"\n    },\n    {\n      id:"che-2017-q0001"'

# Find exact positions
start_pos = content.find(old_start_marker)
# Go back to find the opening {
obj_start = content.rfind('    {', 0, start_pos)

end_pos = content.find(old_end_marker)
# The end should be before the 2017 question starts
obj_end = content.rfind('    },', 0, end_pos) + 5

# Build replacement
replacement = new_obj_text + '\n\n' + theory_text + '\n    '

# Do the replacement
new_content = content[:obj_start] + '    ' + replacement + content[obj_end:]

with open('archive/study-questions/chemistry.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done! 2015 questions replaced.")
