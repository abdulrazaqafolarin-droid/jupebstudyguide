import re, json

with open(r'C:\Users\HP\Downloads\physics 2014-2023\2018 chemistry OBJ and theory.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Split objective from theory
parts = text.split('SECTION B: ESSAY QUESTIONS')
obj_part = parts[0]

# Extract objective questions - find where questions start after "Answer ALL Questions"
start = obj_part.find('Answer ALL Questions')
if start >= 0:
    obj_part = obj_part[start:]
else:
    start = obj_part.find('Alevelschool.com.ng 1')
    if start >= 0:
        obj_part = obj_part[start:]

# Remove the header line
lines = obj_part.split('\n')

# Parse question blocks (each starts with number.)
questions = []
i = 0
while i < len(lines):
    line = lines[i].strip()
    # Check if this line starts a new question
    m = re.match(r'^(\d+)\.\s*(.*)', line)
    if m:
        qnum = int(m.group(1))
        qtext = m.group(2)
        # If question text is empty, collect from next lines
        if not qtext:
            i += 1
            while i < len(lines) and not re.match(r'^\d+\.', lines[i].strip()) and 'SECTION' not in lines[i].strip().upper() and 'Alevelschool' not in lines[i]:
                if lines[i].strip():
                    qtext += ' ' + lines[i].strip()
                i += 1
            continue
        
        qtext_clean = qtext
        options = []
        
        # Collect options (A., B., C., D.)
        i += 1
        while i < len(lines):
            opt_line = lines[i].strip()
            if re.match(r'^[A-D]\.', opt_line):
                opt_text = opt_line[2:].strip()
                # Continue collecting if next line continues the option
                opt_full = opt_text
                i += 1
                while i < len(lines):
                    nxt = lines[i].strip()
                    if re.match(r'^[A-D]\.', nxt) or re.match(r'^\d+\.', nxt) or not nxt:
                        break
                    opt_full += ' ' + nxt
                    i += 1
                
                label_match = re.match(r'^([A-D])[.)\s]+', opt_line)
                label = label_match.group(1) if label_match else chr(65 + len(options))
                options.append({'label': label, 'text': opt_full})
            elif re.match(r'^\d+\.', opt_line):
                break
            elif 'SECTION B' in opt_line.upper() or 'Alevelschool' in opt_line:
                break
            else:
                i += 1
            
            if len(options) >= 4:
                break
        
        if qnum <= 50:
            questions.append({
                'id': f'che-2018-obj-{qnum:04d}',
                'subject': 'chemistry',
                'year': 2018,
                'category': 'objective',
                'question': qtext_clean,
                'options': options,
                'difficulty': 'medium'
            })
    else:
        i += 1

print(f'Found {len(questions)} objective questions')

# Generate output
output = []
for q in questions:
    output.append('    {')
    output.append(f'      id: "{q["id"]}",')
    output.append(f'      subject: "{q["subject"]}",')
    output.append(f'      year: {q["year"]},')
    output.append(f'      category: "{q["category"]}",')
    output.append(f'      question: "{q["question"]}",')
    output.append('      options: [')
    for opt in q['options']:
        output.append(f'        {{ label: "{opt["label"]}", text: "{opt["text"]}" }},')
    output.append('      ],')
    output.append(f'      difficulty: "{q["difficulty"]}"')
    output.append('    },')

result = '\n'.join(output)
with open('chemistry_2018_obj_output.txt', 'w', encoding='utf-8') as f:
    f.write(result)
print('Written to chemistry_2018_obj_output.txt')
