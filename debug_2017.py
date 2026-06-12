import re

with open(r'C:\Users\HP\Downloads\2017  past quetion chemistry.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Find MCQ block
mcq_match = re.search(r'MULTIPLE CHOICE QUESTIONS.*?\n', text)
essay_match = re.search(r'SECTION B:', text)

print(f"MCQ match: {mcq_match}")
print(f"Essay match: {essay_match}")

mcq_block = text[mcq_match.end():essay_match.start()]
mcq_lines = [l.strip() for l in mcq_block.split('\n') if l.strip() and not l.startswith('---')]

print(f"MCQ lines count: {len(mcq_lines)}")
for i, line in enumerate(mcq_lines[:5]):
    print(f"  Line {i}: [{repr(line[:80])}]")

# Check regex
for i, line in enumerate(mcq_lines):
    m = re.match(r'^(\d+)\.\s+(.*)', line)
    m2 = re.match(r'^(\d+)\)\s+(.*)', line)
    if m:
        print(f"  Matched question {m.group(1)} at line {i}: [{m.group(2)[:50]}]")
        break
    if m2:
        print(f"  Matched bracket q {m2.group(1)} at line {i}: [{m2.group(2)[:50]}]")
        break
else:
    print("  NO MATCH for any question!")
    # Print first 20 lines
    for i, line in enumerate(mcq_lines[:20]):
        print(f"  {i}: {repr(line[:80])}")
