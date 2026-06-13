"""Fix multi-line question strings in chemistry_2019_generated.txt.
Replaces actual newlines inside question: "..." strings with escaped \n sequences.
"""
import re

with open(r'C:\Users\HP\Downloads\chemistry_2019_generated.txt', 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
result = []
question_lines = []
in_question = False
prefix = ''

for idx, line in enumerate(lines):
    # Check if line starts a question field
    m = re.match(r'^(\s*question:\s*")(.*)', line)
    if m and not line.rstrip().endswith('",') and not line.rstrip().endswith('"'):
        # Multi-line question starts
        in_question = True
        prefix = m.group(1)
        question_lines = [m.group(2)]
        continue
    elif in_question:
        if line.rstrip().endswith('",'):
            question_lines.append(line.rstrip()[:-2])
            # Join content with literal \n (backslash + n)
            joined = r'\n'.join(question_lines)
            result.append(prefix + joined + '",')
            in_question = False
            question_lines = []
            continue
        elif line.rstrip().endswith('"'):
            question_lines.append(line.rstrip()[:-1])
            joined = '\\n'.join(question_lines)
            result.append(prefix + joined + '",')
            in_question = False
            question_lines = []
            continue
        elif in_question:
            question_lines.append(line)
            continue
    
    result.append(line)

# Write fixed output
output = '\n'.join(result)
with open(r'C:\Users\HP\Downloads\chemistry_2019_fixed.txt', 'w', encoding='utf-8') as f:
    f.write(output)

# Verify
idx2 = output.find('theory-001')
if idx2 >= 0:
    chunk = output[idx2:idx2+300]
    # Check: count \n sequences vs actual newlines
    num_actual_newlines = chunk.count('\n')
    num_escaped = chunk.count('\\n')
    print(f"theory-001 area: {num_actual_newlines} actual newlines, {num_escaped} escaped \\n")
    lines_in_chunk = chunk.split('\n')
    print(f"Lines in chunk: {len(lines_in_chunk)}")
    # Show first 300 chars of repr
    if len(lines_in_chunk) <= 3:
        print("GOOD: Question is on one line")
    else:
        print(f"ISSUE: Question spans {len(lines_in_chunk)} lines")

print(f"Output written, {len(output)} chars")
