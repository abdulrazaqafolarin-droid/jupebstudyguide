import re

chem_path = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\study-questions\chemistry.ts'
gen_path = r'C:\Users\HP\Downloads\chem_2025_generated.txt'

# Read generated output
with open(gen_path, 'rb') as f:
    gen_bytes = f.read()
gen_text = gen_bytes.decode('utf-8', errors='replace')

# Read the current file
with open(chem_path, 'rb') as f:
    chem_bytes = f.read()

# The issue is backtick template literals in theory/practical questions
# containing markdown backtick code fences. Fix by converting backtick-quoted 
# question fields to double-quoted with escaped newlines.

# Find all backtick-quoted question fields and convert them
# Pattern: question:`CONTENT`,
# Replace with: question:"ESCAPED_CONTENT",

def convert_backtick_to_double_q(match):
    full = match.group(0)
    content = match.group(1)
    # Escape backslashes first (before other escaping)
    content = content.replace('\\', '\\\\')
    # Escape double quotes
    content = content.replace('"', '\\"')
    # Escape newlines
    content = content.replace('\n', '\\n')
    # Escape carriage returns
    content = content.replace('\r', '')
    return f'question:"{content}",'

# First, handle the theory questions (they're in backtick format)
# Pattern matches: question:` ... content ... `,
pattern = r'question:`([^`]*)`,'
gen_text_fixed = re.sub(pattern, convert_backtick_to_double_q, gen_text, flags=re.DOTALL)

# Also fix practical question if it uses backticks
# Check if there are any remaining backticks
if '`' in gen_text_fixed:
    print(f"WARNING: {gen_text_fixed.count('`')} backticks remaining after conversion!")
    # Replace any remaining single backticks
    gen_text_fixed = gen_text_fixed.replace('`', "'")

# Write fixed output
with open(gen_path, 'wb') as f:
    f.write(gen_text_fixed.encode('utf-8'))

print("Converted backtick template literals to double-quoted strings")
print(f"Before: {len(gen_bytes)} bytes, After: {len(gen_text_fixed.encode('utf-8'))} bytes")

# Now re-integrate: find old 2025 section and replace
old_2025_start_marker = b',\r\n    {\r\n      id:"che-2025-q0001"'
old_2025_end_marker = b'];\r\n\r\nexport function'

old_start = chem_bytes.find(old_2025_start_marker)
old_end = chem_bytes.find(old_2025_end_marker)

if old_start == -1:
    print("ERROR: Could not find old 2025 start (already replaced?)")
else:
    prefix = chem_bytes[:old_start]
    suffix = chem_bytes[old_end:]
    gen_bytes_fixed = gen_text_fixed.encode('utf-8')
    gen_text_crlf = gen_text_fixed.replace('\n', '\r\n')
    new_content = prefix + b',\r\n' + gen_text_crlf.encode('utf-8') + b'\r\n' + suffix
    
    with open(chem_path, 'wb') as f:
        f.write(new_content)
    
    print(f"Integrated. File sizes: {len(chem_bytes)} -> {len(new_content)}")
