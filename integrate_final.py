"""Clean integration of 2025 data into chemistry.ts.
Replaces old 2025 entries (che-2025-q format, backtick issues) with clean
parsed data (che-2025-obj, che-2025-t, che-2025-p format, double-quoted strings)."""

import re

chem_path = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\study-questions\chemistry.ts'
gen_path = r'C:\Users\HP\Downloads\chem_2025_generated.txt'

with open(chem_path, 'rb') as f:
    chem = f.read()
with open(gen_path, 'rb') as f:
    gen = f.read()

ct = chem.decode('utf-8', errors='replace')
gt = gen.decode('utf-8', errors='replace')

# Find the exact boundary: the old 2025 section starts with "    {\n      id:\"che-2025-q0001\""
# and ends at "];\n\nexport function getChemistryQuestions"

# Locate old_2025 start
old_start_marker = '    {\n      id:"che-2025-q0001"'
old_start = ct.find(old_start_marker)

# Locate array close. The file uses \n (LF) line endings.
array_end_marker = '];\n\nexport function getChemistryQuestions'
array_end = ct.find(array_end_marker)

if old_start == -1:
    print("ERROR: old 2025 start not found")
    # Try alternative: find first che-2025-q
    alt_marker = 'id:"che-2025-q0001"'
    idx = ct.find(alt_marker)
    if idx != -1:
        # Go back to find the opening brace
        before = ct[:idx]
        last_brace = before.rfind('    {')
        old_start = last_brace
        print(f"Found alt start at {old_start}")
    else:
        exit(1)

if array_end == -1:
    print("ERROR: array end not found")
    exit(1)

print(f"Old 2025 section: bytes {old_start} to {array_end}")
print(f"Prefix ends: {repr(ct[old_start-30:old_start])}")
print(f"Suffix starts: {repr(ct[array_end:array_end+30])}")

# Everything before the old 2025 section
prefix = ct[:old_start]  # ends with the closing of last 2024 entry
# Everything from the array closing onward
suffix = ct[array_end:]  # "];\n\nexport function..."

# The generated data uses LF line endings
# Make sure the gen data is properly formatted
gt = gt.rstrip('\n') + '\n'  # ensure trailing newline

new_content = prefix + gt + '\n' + suffix

with open(chem_path, 'wb') as f:
    f.write(new_content.encode('utf-8'))

# Verify
with open(chem_path, 'rb') as f:
    result = f.read()
rt = result.decode('utf-8', errors='replace')

old_count = ct.count('che-2025-')
new_count = rt.count('che-2025-')
has_array_end = '];\n\nexport function getChemistryQuestions' in rt
has_no_old = 'che-2025-q0001' not in rt

print(f"Old 'che-2025-' count: {old_count}")
print(f"New 'che-2025-' count: {new_count}")
print(f"Array end intact: {has_array_end}")
print(f"No old q format: {has_no_old}")
print(f"File size: {len(chem)} -> {len(result)}")
