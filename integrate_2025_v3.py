import re

chem_path = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\study-questions\chemistry.ts'
gen_path = r'C:\Users\HP\Downloads\chem_2025_generated.txt'

# Read files as raw bytes
with open(chem_path, 'rb') as f:
    chem_bytes = f.read()

with open(gen_path, 'rb') as f:
    gen_bytes = f.read()

# The file uses CRLF (\r\n) line endings
old_2025_start_marker = b',\r\n    {\r\n      id:"che-2025-q0001"'
# The end marker: "];\n\nexport function" - but the file uses \r\n
old_2025_end_marker = b'];\r\n\r\nexport function getChemistryQuestions'

old_start = chem_bytes.find(old_2025_start_marker)
old_end = chem_bytes.find(b'];\r\n\r\nexport function')

if old_start == -1:
    print("ERROR: Could not find old 2025 start")
else:
    print(f"Old 2025 section starts at byte {old_start}")
    print(f"Array end marker at byte {old_end}")
    
    # The section to remove includes from the "," before the first 2025 entry
    # We want to keep everything up to and including the "," before the 2025 block
    # Actually, the old_start includes the ",\r\n    {" so we cut right at old_start
    # which keeps the trailing ",}\r\n    " from the last 2024 entry
    
    # Wait - old_start points to ",\r\n    {\r\n      id:..."
    # We want to remove everything from old_start (including the comma) 
    # up to old_end (which is the "];\r\n\r\nexport")
    
    # prefix = everything before the old 2025 section (includes the last 2024 entry closing)
    prefix = chem_bytes[:old_start]  # ends with the "    },\r\n" of last 2024 entry 
    # Actually wait, the marker starts with "," so prefix includes the "    }" without the trailing comma
    # Let me check: last entry ends with "    },\r\n    {\r\n      id:\"che-2025...\""
    # So old_start points to the "," after "    }"
    # We want prefix to include the "    }" (without the comma)
    # Actually, prefix without the comma will leave "    }\r\n" then we add new data
    
    # Let me just check what prefix ends with
    prefix = chem_bytes[:old_start]  # ends with "    }" (before the comma)
    
    # suffix = from the ]; 
    suffix = chem_bytes[old_end:]  # "];\r\n\r\nexport function..."
    
    # Convert gen_text to use CRLF like the rest of the file
    gen_text = gen_bytes.decode('utf-8')
    # Replace newlines in generated content to CRLF
    gen_text_crlf = gen_text.replace('\n', '\r\n')
    
    new_content = prefix + b',\r\n' + gen_text_crlf.encode('utf-8') + b'\r\n' + suffix
    
    with open(chem_path, 'wb') as f:
        f.write(new_content)
    
    print(f"Done. Replaced old 2025 section with new data.")
    print(f"File sizes: {len(chem_bytes)} -> {len(new_content)}")
