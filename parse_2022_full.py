import json
import re

with open('C:/Users/HP/Downloads/physics 2014-2023/2022 theory OBJ.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Split into sections
lines = text.split('\n')

# Find where MCQs end and essay begins
essay_start = None
practical_start = None
answers_start = None

for i, line in enumerate(lines):
    if 'ESSAY QUESTIONS (2022)' in line:
        essay_start = i
    elif 'PRACTICAL QUESTIONS (2022)' in line:
        practical_start = i
    elif line.strip().startswith('ESSAY QUESTIONS (2022)') and i != essay_start:
        answers_start = i

print(f"Essay starts at line: {essay_start}")
print(f"Practical starts at line: {practical_start}")
print(f"Answers start at line: {answers_start}")

# Extract MCQ section (after the header until essay)
mcq_lines = []
in_mcq = False
for i, line in enumerate(lines):
    if 'MULTIPLE CHOICE QUESTIONS' in line:
        in_mcq = True
        continue
    if in_mcq:
        if 'ESSAY QUESTIONS' in line:
            break
        stripped = line.strip()
        if stripped:
            mcq_lines.append(stripped)

print(f"\nMCQ lines: {len(mcq_lines)}")
for l in mcq_lines[:10]:
    print(f"  {l}")
print("...")
for l in mcq_lines[-5:]:
    print(f"  {l}")

# Try to identify question-option pairs
# Find all lines that look like "Question text"
# Options are typically on the same line or next line with A. B. C. D.
questions = []
current_q = None

# Better approach: find lines ending with ? or : as question starters
# Then look for lines with A. B. C. D.

for line in mcq_lines:
    # Check if this is an options line
    has_options = bool(re.search(r'[A-D]\.\s', line))
    
    if has_options:
        # This line has options, so the current question ends here
        # First, extract options
        opts = re.findall(r'([A-D])\.\s*([^A-D]*(?:\([^)]*\))?[^A-D]*?)(?=\s+[A-D]\.|$)', line)
        if opts:
            if current_q:
                questions.append({'question': current_q, 'options': opts})
            else:
                questions.append({'question': 'See options', 'options': opts})
            current_q = None
        else:
            # Try simpler split on A. B. C. D. patterns
            parts = re.split(r'\s+(?=[A-D]\.\s)', line)
            if len(parts) >= 2:
                q_text = parts[0].strip()
                opts_text = ' '.join(parts[1:])
                opts = re.findall(r'([A-D])\.\s*([^A-D]+?)(?=\s+[A-D]\.|$)', opts_text)
                if not opts:
                    # Last option might have no trailing
                    opts = re.findall(r'([A-D])\.\s*([^A-D]*)', opts_text)
                if opts:
                    questions.append({'question': q_text, 'options': opts})
                    current_q = None
                else:
                    if current_q:
                        current_q += ' ' + line
                    else:
                        current_q = line
            else:
                if current_q:
                    current_q += ' ' + line
                else:
                    current_q = line
    else:
        # No options, this continues the question
        if current_q:
            current_q += ' ' + line
        else:
            current_q = line

print(f"\nTotal questions found: {len(questions)}")
for i, q in enumerate(questions):
    print(f"Q{i+1}: {q['question'][:80]}...")
    for opt in q['options']:
        print(f"  {opt[0]}. {opt[1][:60]}...")
    print()
