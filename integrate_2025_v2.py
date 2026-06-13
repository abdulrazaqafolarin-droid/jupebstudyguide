import re

chem_path = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\study-questions\chemistry.ts'
gen_path = r'C:\Users\HP\Downloads\chem_2025_generated.txt'

# Read files as raw bytes to handle encoding issues
with open(chem_path, 'rb') as f:
    chem_bytes = f.read()

with open(gen_path, 'rb') as f:
    gen_bytes = f.read()

chem_text = chem_bytes.decode('utf-8', errors='replace')
gen_text = gen_bytes.decode('utf-8', errors='replace')

# Find the boundary: last 2024 entry closing "    },"
# Pattern: after the last line with "id: \"che-2024-" followed by "    },"
# The old 2025 section starts at "    {\n      id:\"che-2025-q0001\""

old_2025_start_marker = '    {\n      id:"che-2025-q0001"'
old_2025_end_marker = '];\n\nexport function getChemistryQuestions'

old_start = chem_text.find(old_2025_start_marker)
old_end = chem_text.find(old_2025_end_marker)

if old_start == -1:
    print("ERROR: Could not find old 2025 start marker")
else:
    print(f"Old 2025 section starts at position {old_start}")
    # The old section ends at old_end (which points to "];")
    # We want to keep the prefix (up to old_start) and suffix (from old_end)
    
    prefix = chem_text[:old_start]  # keeps "    },\n" from last 2024 entry
    suffix = chem_text[old_end:]    # "];\n\nexport function..."
    
    # Add a newline and the generated content
    new_content = prefix + '\n' + gen_text + '\n' + suffix
    
    # Write back
    with open(chem_path, 'wb') as f:
        f.write(new_content.encode('utf-8'))
    
    print(f"Done. Old 2025 section replaced.")
    print(f"File sizes: before={len(chem_bytes)}, after={len(new_content.encode('utf-8'))}")
