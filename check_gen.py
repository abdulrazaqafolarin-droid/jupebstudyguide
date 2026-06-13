import re
with open(r'C:\Users\HP\Downloads\chem_2025_generated.txt', 'rb') as f:
    d = f.read()
t = d.decode('utf-8', errors='replace')
print('Backticks:', t.count('`'))
print('Template expr:', t.count('${'))
qf = re.findall(r'question:"([^"]*)"', t)
print('Question fields:', len(qf))
lq = [q for q in qf if len(q) > 200]
print('Long fields (>200):', len(lq))
# Check no backticks in content
lines = t.split('\n')
for i, line in enumerate(lines, 1):
    if '`' in line:
        print(f'Line {i} has backtick: {line.strip()[:100]}')
