"""Final integration: replace old 2025 section with clean data."""

chem_path = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\study-questions\chemistry.ts'
gen_path = r'C:\Users\HP\Downloads\chem_2025_generated.txt'

with open(chem_path, 'rb') as f:
    data = f.read()

with open(gen_path, 'rb') as f:
    gen = f.read()

# Positions (verified):
# Transition: 521960 (    },\r\n    {\r\n      id:"che-2025-q0001")
# Prefix ends: 521967 (right after the closing },
# Array end: 581363 (];\r\n\r\nexport function...)

prefix = data[:521967]  # includes last 2024 entry closing },
suffix = data[581363:]  # ];\r\n\r\nexport function...

# Convert gen to CRLF
gt = gen.decode('utf-8')
gt_crlf = gt.replace('\n', '\r\n')

new_content = prefix + b'\r\n' + gt_crlf.encode('utf-8') + b'\r\n' + suffix

with open(chem_path, 'wb') as f:
    f.write(new_content)

print(f"Old size: {len(data)}, New size: {len(new_content)}")
print(f"Reduction: {len(data) - len(new_content)} bytes")

# Quick validation
with open(chem_path, 'rb') as f:
    result = f.read()

rt = result.decode('utf-8', errors='replace')
print(f"che-2025- entries: {rt.count('che-2025-')}")
print(f"Old format (q0001): {'che-2025-q0001' in rt}")
print(f"New format (obj-0001): {'che-2025-obj-0001' in rt}")
print(f"Ends correctly: {rt.rstrip().endswith('}')}")
