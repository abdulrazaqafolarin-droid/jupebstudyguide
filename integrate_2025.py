import re

chem_path = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\study-questions\chemistry.ts'
gen_path = r'C:\Users\HP\Downloads\chem_2025_generated.txt'

with open(chem_path, 'r', encoding='utf-8') as f:
    chem_text = f.read()

with open(gen_path, 'r', encoding='utf-8') as f:
    gen_text = f.read()

# Find the 2025 section boundary
# The old 2025 section starts at:     {  (id:che-2025-q0001)
# Let's find the insertion point: right after the last 2024 entry's closing "},"
# And before the "];" at the end + getChemistryQuestions function

# Strategy: find the last entry before the "];" closing the array
# Look for "];" that closes the chemistryQuestions array

# Find: ...\n    },\n];\n\nexport function
pattern = r'(\n    },\n);\n\nexport function getChemistryQuestions'
last_entry_match = re.search(pattern, chem_text)
if last_entry_match:
    print(f"Found ]; at position {last_entry_match.start()}")
    # Everything before this },\n];\n\nexport function is the array content
    # The last entry before ]; is what we need to find
    # Actually, let's find the 2024 last entry
    
    # Find the last occurrence of "// 2024" and its section
    # Let's find the last 2024 entry by looking for che-2024-
    last_2024_match = re.search(r'id:"che-2024-p\d{4}"[^}]*\n    },', chem_text)
    if last_2024_match:
        print(f"Last 2024 entry: {last_2024_match.group()[:60]}...")
        last_2024_end = last_2024_match.end()
        
        # Now find where the 2025 section ends (where ]; is)
        array_end = last_entry_match.start()
        
        # Extract: everything before the old 2025 section + new data + everything from ]; onward
        prefix = chem_text[:last_2024_end]  # includes last "    },"
        suffix = chem_text[array_end:]  # "\n];\n\nexport function..."
        
        new_content = prefix + '\n' + gen_text + suffix
        
        with open(chem_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        old_len = len(chem_text)
        new_len = len(new_content)
        print(f"Old file: {old_len} chars, New file: {new_len} chars")
        print(f"Replaced old 2025 section with new parsed data")
    else:
        print("ERROR: Could not find last 2024 entry")
else:
    print("ERROR: Could not find ]; pattern")
    # Try alternative pattern
    pattern2 = r'(\n];\n\nexport function)'
    m2 = re.search(pattern2, chem_text)
    if m2:
        print(f"Found ]; with alternative pattern at position {m2.start()}")
        last_2024_match = re.search(r'id:"che-2024-p\d{4}"[^}]*\n    },', chem_text)
        if last_2024_match:
            last_2024_end = last_2024_match.end()
            prefix = chem_text[:last_2024_end]
            suffix = chem_text[m2.start():]
            new_content = prefix + '\n' + gen_text + suffix
            with open(chem_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Done. Old: {len(chem_text)} -> New: {len(new_content)}")
