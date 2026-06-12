"""
Parse 2017 Chemistry exam: 50 MCQs inline/multi-line options
"""
import re

with open(r'C:\Users\HP\Downloads\2017  past quetion chemistry.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Split into sections
# MCQs are from "1. Which" to "---\n\n## SECTION B: CHEMISTRY ESSAY QUESTIONS"
mcq_end = text.find('## SECTION B: CHEMISTRY ESSAY QUESTIONS')
mcq_start = text.find('1. Which')

mcq_text = text[mcq_start:mcq_end]
lines = mcq_text.split('\n')

# Find all question blocks
# Each block starts with "N." and continues until the next "N+1."
# Split by looking ahead
questions = []
i = 0
while i < len(lines):
    line = lines[i].strip()
    m = re.match(r'^(\d+)\.\s+(.*)', line)
    if m:
        q_num = int(m.group(1))
        q_lines = [line]
        i += 1
        # Collect until next question or end
        while i < len(lines):
            peek = lines[i].strip()
            if not peek:
                i += 1
                continue
            if re.match(r'^\d+\.\s', peek):
                break
            q_lines.append(peek)
            i += 1
        questions.append({'num': q_num, 'lines': q_lines})
    else:
        i += 1

print(f'Found {len(questions)} question blocks')

# Parse each block
mcq_questions = []
for q in questions:
    q_num = q['num']
    q_lines = q['lines']
    
    # Find where options start (first line starting with A. B. C. or D.)
    opt_start = None
    for idx, line in enumerate(q_lines):
        stripped = line.strip()
        if re.match(r'^[A-D]\.\s', stripped):
            opt_start = idx
            break
    
    if opt_start is None:
        print(f'Q{q_num}: No options found')
        continue
    
    # Question text = everything before option start
    q_text_parts = []
    for idx in range(opt_start):
        l = q_lines[idx]
        # Remove the "N." prefix from first line
        if idx == 0:
            l = re.sub(r'^\d+\.\s+', '', l)
        q_text_parts.append(l)
    q_text = ' '.join(q_text_parts).strip()
    
    # Options = lines from opt_start onwards
    opts = {'A': '', 'B': '', 'C': '', 'D': ''}
    
    # Check if inline (all on one line) or multi-line
    opt_line = ' '.join(q_lines[opt_start:])
    
    # Handle both inline "A. text B. text C. text D. text" and multi-line
    for label in ['A', 'B', 'C', 'D']:
        pattern = rf'\b{label}\.\s+(.*?)(?=\s*[B-D]\.\s|$)'
        # Find the text between this label and the next
        matches = list(re.finditer(rf'([A-D])\.\s+', opt_line))
        for j, m in enumerate(matches):
            if m.group(1) == label:
                start = m.end()
                if j + 1 < len(matches):
                    end = matches[j+1].start()
                else:
                    end = len(opt_line)
                opt_val = opt_line[start:end].strip().rstrip('.')
                if opt_val:
                    opts[label] = opt_val
                break
    
    filtered = {k: v for k, v in opts.items() if v.strip()}
    if len(q_text) > 5 and len(filtered) >= 2:
        mcq_questions.append({
            'num': q_num,
            'question': q_text,
            'options': filtered
        })
        if q_num <= 5 or q_num >= 48:
            print(f'Q{q_num}: OK ({len(filtered)} opts)')
    else:
        print(f'Q{q_num}: SKIP (q={len(q_text)}, opts={len(filtered)})')

print(f'\nTotal MCQs: {len(mcq_questions)}')
missing = [q for q in range(1, 51) if q not in [m['num'] for m in mcq_questions]]
if missing:
    print(f'Missing: {missing}')

# ---- Generate TS ----
REPLACEMENTS = {
    '×': 'x', '−': '-', '→': '->', '⇌': '<->',
    '≈': '~', '≤': '<=', '≥': '>=',
    '𝜋': 'pi', '𝜃': 'theta',
    '"': "'", '"': "'", "'": "'", '’': "'",
    '–': '-', '—': '--', '…': '...',
    '°': 'deg',
    '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6',
    '₇': '7', '₈': '8', '₉': '9', '₀': '0',
    '²': '2', '³': '3',
    '⁺': '+', '⁻': '-',
    '•': '.', '·': '.',
}
for i in range(26):
    REPLACEMENTS[chr(0x1D400 + i)] = chr(ord('A') + i)
for i in range(26):
    REPLACEMENTS[chr(0x1D41A + i)] = chr(ord('a') + i)
for i in range(26):
    REPLACEMENTS[chr(0x1D434 + i)] = chr(ord('A') + i)
for i in range(26):
    REPLACEMENTS[chr(0x1D44E + i)] = chr(ord('a') + i)
for i in range(26):
    REPLACEMENTS[chr(0x1D468 + i)] = chr(ord('A') + i)
for i in range(26):
    REPLACEMENTS[chr(0x1D482 + i)] = chr(ord('a') + i)

def esc(s):
    s = s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '').replace('\t', '\\t')
    result = []
    for c in s:
        if ord(c) < 128:
            result.append(c)
        else:
            result.append(REPLACEMENTS.get(c, ' '))
    return ''.join(result)

out_lines = []
for q in mcq_questions:
    q_text = esc(q['question'])
    opts = q['options']
    qnum = q['num']
    out_lines.append(f'''    {{
      id:"che-2017-q{qnum:04d}",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"{q_text}",
      options:[
            {{label:"A", text:"{esc(opts.get('A',''))}"}},
            {{label:"B", text:"{esc(opts.get('B',''))}"}},
            {{label:"C", text:"{esc(opts.get('C',''))}"}},
            {{label:"D", text:"{esc(opts.get('D',''))}"}},
          ],
      difficulty:"medium"
    }},''')

# Theory & Practical sections
for section_name, marker in [('theory', 'CHEMISTRY ESSAY QUESTIONS'), 
                               ('practical', 'PRACTICAL CHEMISTRY')]:
    section_start = text.find(marker)
    section_end = len(text)
    if section_name == 'theory':
        section_end = text.find('### PRACTICAL CHEMISTRY')
        if section_end == -1:
            section_end = len(text)
    
    if section_start >= 0:
        section_text = text[section_start:section_end].strip()
        section_text = section_text.replace('---', '').strip()
        if section_text:
            cat = 'theory' if section_name == 'theory' else 'practical'
            tid = 't0001' if cat == 'theory' else 'p0001'
            course_str = 'course:"CHM 001-004",' if cat == 'theory' else ''
            q_text = esc(section_text)
            entry_lines = [
                '    {',
                f'      id:"che-2017-{tid}",',
                '      subject:"chemistry",',
                '      year:2017,',
                f'      category:"{cat}",',
            ]
            if course_str:
                entry_lines.append(f'      {course_str}')
            entry_lines.append(f'      question:"{q_text}",')
            entry_lines.append('      difficulty:"medium"')
            entry_lines.append('    },')
            out_lines.append('\n'.join(entry_lines))
            print(f'Added {cat} section ({len(section_text)} chars)')

output = '\n'.join(out_lines)
print(f'\nGenerated {len(mcq_questions)} MCQs')

with open(r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\2017_chemistry_output.txt', 'w', encoding='utf-8') as f:
    f.write(output)

print('Saved to 2017_chemistry_output.txt')
