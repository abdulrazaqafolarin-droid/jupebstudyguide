import re, json

with open(r'C:\Users\HP\Downloads\2014chem.txt', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.split('\n')

# Find main sections
mcq_start = None
essay_start = None
prac_start = None
for i, line in enumerate(lines):
    if 'MULTIPLE CHOICE QUESTIONS' in line:
        mcq_start = i + 2  # skip header + blank line
    elif 'ESSAY QUESTIONS' in line:
        essay_start = i
    elif 'PRACTICAL QUESTIONS' in line:
        prac_start = i

print(f"MCQ start: {mcq_start}, Essay: {essay_start}, Practical: {prac_start}")

# ---- PARSE MCQs ----
# Strategy: find numbered questions (N. or N) and extract text + options
mcq_text = '\n'.join(lines[mcq_start:essay_start]).strip()

# Split by question number patterns
# Questions are numbered 1-50, pattern like "1. " or "1. " at start of line
mcq_entries = []
current_q = None
current_lines = []

for line in lines[mcq_start:essay_start]:
    stripped = line.strip()
    if not stripped:
        if current_q is not None:
            current_lines.append('')
        continue
    
    # Check if this starts a new question
    match = re.match(r'^(\d+)\.\s*(.*)', stripped)
    if match:
        # Save previous question
        if current_q is not None:
            mcq_entries.append({'num': current_q, 'text': '\n'.join(current_lines).strip()})
        
        current_q = int(match.group(1))
        current_lines = [match.group(2)]
    elif current_q is not None:
        current_lines.append(stripped)

# Don't forget last question
if current_q is not None:
    mcq_entries.append({'num': current_q, 'text': '\n'.join(current_lines).strip()})

print(f"Found {len(mcq_entries)} MCQ questions")

# Now parse each question to extract question text and options
def parse_mcq(entry):
    """Extract question text and options from raw text"""
    text = entry['text']
    
    # Find options: pattern like "A. ... B. ... C. ... D. ..." or multi-line
    options = {}
    
    # Try single-line format first: A. ... B. ... C. ... D. ...
    opt_pattern = re.compile(r'([A-D])\.\s*(.*?)(?=\s+[A-D]\.\s|$)', re.DOTALL)
    
    # Extract question part (everything before first A. or A)
    # Find position of the option labels
    opt_positions = []
    for letter in ['A', 'B', 'C', 'D']:
        # Look for patterns like "A." or "A " at start of line
        for m in re.finditer(rf'(?<!\w){letter}[\.\)]\s*', text):
            opt_positions.append((m.start(), letter, m.end()))
    
    if not opt_positions:
        # Try looking for options on separate lines
        raw_lines = text.split('\n')
        opt_text = []
        q_text_lines = []
        in_opts = False
        for line in raw_lines:
            stripped = line.strip()
            opt_match = re.match(r'^([A-D])[\.\)]\s*(.*)', stripped)
            if opt_match:
                in_opts = True
                opt_text.append(stripped)
            elif in_opts and re.match(r'^[A-D][\.\)]', stripped):
                opt_text.append(stripped)
            elif not in_opts:
                q_text_lines.append(stripped)
        
        question = ' '.join(q_text_lines).strip()
        
        # Parse the option text
        for ot in opt_text:
            om = re.match(r'^([A-D])[\.\)]\s*(.*)', ot)
            if om:
                options[om.group(1)] = om.group(2).strip()
    else:
        # Sort by position
        opt_positions.sort()
        
        # Check if options are inline (same line as each other)
        first_opt_line = text[opt_positions[0][0]:].split('\n')[0]
        has_inline = bool(re.search(r'[A-D]\.\s', first_opt_line[3:]))
        
        if has_inline or len(opt_positions) >= 4:
            # Extract question (before first option)
            question = text[:opt_positions[0][0]].strip()
            
            # Extract each option
            for i, (pos, letter, end) in enumerate(opt_positions):
                if i < len(opt_positions) - 1:
                    opt_text = text[end:opt_positions[i+1][0]].strip()
                else:
                    opt_text = text[end:].strip()
                # Clean up - remove trailing options of next question if any
                opt_text = re.split(r'\s+(?=\d+\.\s)', opt_text)[0]
                options[letter] = opt_text
        else:
            # Multi-line format - options are on separate lines
            question = text[:opt_positions[0][0]].strip()
            for i, (pos, letter, end) in enumerate(opt_positions):
                if i < len(opt_positions) - 1:
                    opt_text = text[end:opt_positions[i+1][0]].strip()
                else:
                    opt_text = text[end:].strip()
                options[letter] = opt_text
    
    # Clean up question - remove trailing "A." etc leftovers
    question = re.sub(r'\s*[A-D][\.\)]\s*$', '', question).strip()
    
    # Clean options
    for k in list(options.keys()):
        v = options[k]
        # Remove trailing junk
        v = re.sub(r'\s*[A-D][\.\)].*$', '', v).strip()
        # Remove leading "A." etc if present
        v = re.sub(r'^[A-D][\.\)]\s*', '', v).strip()
        options[k] = v
    
    return {
        'num': entry['num'],
        'question': question,
        'options': options
    }

# Parse all MCQs
parsed_mcqs = []
for entry in mcq_entries:
    if entry['num'] <= 50:
        parsed = parse_mcq(entry)
        parsed_mcqs.append(parsed)
        if entry['num'] <= 3:
            safe = parsed['question'][:60].encode('ascii', 'replace').decode('ascii')
            print(f"Q{entry['num']}: {safe}... opts={list(parsed['options'].keys())}")

# Skip debug prints - just generate output

# Now generate TS
def escape_ts(s):
    return s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')

ts_lines = []
ts_lines.append('    // === 2014 CHEMISTRY ===')

for i, mcq in enumerate(parsed_mcqs):
    if mcq['num'] > 50:
        break
    idx = i + 1
    question = mcq['question']
    opts = mcq['options']
    
    # Skip if no options found
    if not opts:
        print(f"WARNING: Q{mcq['num']} has no options, skipping")
        continue
    
    opts_ts = ',\n'.join(f'        {{ label: "{l}", text: "{escape_ts(opts.get(l, ""))}" }}' for l in ['A','B','C','D'] if l in opts)
    
    ts_lines.append('    {')
    ts_lines.append(f'      id: "che-2014-obj-{idx:04d}",')
    ts_lines.append('      subject: "chemistry",')
    ts_lines.append('      year: 2014,')
    ts_lines.append('      category: "objective",')
    ts_lines.append(f'      question: "{escape_ts(question)}",')
    ts_lines.append('      options: [')
    ts_lines.append(f'{opts_ts},')
    ts_lines.append('      ],')
    ts_lines.append('      difficulty: "medium"')
    ts_lines.append('    },')

# ---- PARSE THEORY ----
# Theory section between essay_start and prac_start
theory_sections = []
current_course = None
current_text = []

for line in lines[essay_start:prac_start]:
    stripped = line.strip()
    if stripped.startswith('### '):
        if current_course:
            theory_sections.append({'course': current_course, 'text': '\n'.join(current_text).strip()})
        current_course = stripped.replace('### ', '').strip()
        current_text = []
    elif stripped.startswith('## '):
        continue
    else:
        current_text.append(stripped)

if current_course:
    theory_sections.append({'course': current_course, 'text': '\n'.join(current_text).strip()})

print(f"\nFound {len(theory_sections)} theory courses")

for i, section in enumerate(theory_sections):
    idx = i + 1
    ts_lines.append('    {')
    ts_lines.append(f'      id: "che-2014-t{idx:04d}",')
    ts_lines.append('      subject: "chemistry",')
    ts_lines.append('      year: 2014,')
    ts_lines.append('      category: "theory",')
    ts_lines.append(f'      question: "{escape_ts(section["course"] + "\\n\\n" + section["text"])}",')
    ts_lines.append('      totalMarks: 10,')
    ts_lines.append('      difficulty: "hard"')
    ts_lines.append('    },')

# ---- PARSE PRACTICAL ----
prac_sections = []
current_prac = None
current_prac_text = []

for line in lines[prac_start:]:
    stripped = line.strip()
    if stripped.startswith('### '):
        if current_prac:
            prac_sections.append({'title': current_prac, 'text': '\n'.join(current_prac_text).strip()})
        current_prac = stripped.replace('### ', '').strip()
        current_prac_text = []
    elif stripped.startswith('## '):
        continue
    else:
        current_prac_text.append(stripped)

if current_prac:
    prac_sections.append({'title': current_prac, 'text': '\n'.join(current_prac_text).strip()})

print(f"Found {len(prac_sections)} practical sections")

for i, section in enumerate(prac_sections):
    idx = i + 1
    ts_lines.append('    {')
    ts_lines.append(f'      id: "che-2014-p{idx:04d}",')
    ts_lines.append('      subject: "chemistry",')
    ts_lines.append('      year: 2014,')
    ts_lines.append('      category: "practical",')
    ts_lines.append(f'      question: "{escape_ts(section["title"] + "\\n\\n" + section["text"])}",')
    ts_lines.append('      difficulty: "medium"')
    ts_lines.append('    },')

# Write output
output = '\n'.join(ts_lines)
with open('generated_2014.txt', 'w', encoding='utf-8') as f:
    f.write(output)

print(f"\nGenerated {len(parsed_mcqs)} MCQs, {len(theory_sections)} theory, {len(prac_sections)} practical")
print("Written to generated_2014.txt")
