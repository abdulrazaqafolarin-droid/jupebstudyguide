import re, json

with open(r"C:\Users\HP\Downloads\2020 chemistry new.txt", "r", encoding="utf-8") as f:
    text = f.read()

lines = text.split("\n")

# ---- ANSWER KEY ----
answer_key = {}
for line in lines:
    nums = re.findall(r'(\d+)\.([A-D])', line)
    for n, letter in nums:
        answer_key[int(n)] = letter

print(f"Answer key: {len(answer_key)} entries")

# ---- PARSE MCQs (Q1-Q50) ----
# Split by MCQ section boundaries
# The MCQs are in the section between "MULTIPLE CHOICE QUESTIONS" and "---\n\n**Answer Key"
mcq_section = text.split("MULTIPLE CHOICE QUESTIONS")[1].split("Answer Key")[0] if "MULTIPLE CHOICE QUESTIONS" in text else ""

mcqs = []
# Find all numbered questions
# Pattern: **N.** question text followed by - A. ... - B. ... - C. ... - D. ...
blocks = re.split(r'\*{1,2}(\d+)\.\*{1,2}\s+', mcq_section)
# blocks[0] is empty or intro text
# Then alternating: number, question text
i = 1
while i < len(blocks) - 1:
    num = int(blocks[i])
    if num > 50:
        i += 2
        continue
    question_text = blocks[i+1].strip()
    # Split by newlines to find options
    # Options start with "- A." or "- B." etc
    opt_lines = []
    remaining = question_text
    # The question text might include the options
    # Let's find the options in the remaining text
    parts = re.split(r'\n- ', question_text)
    if len(parts) >= 2:
        q_text = parts[0]
        opts_raw = ['- ' + p for p in parts[1:]]
    else:
        q_text = question_text
        opts_raw = []
    
    # Clean options
    options = []
    for opt_line in opts_raw:
        m = re.match(r'-\s+\*{0,2}([A-D])\.\*{0,2}\s+(.*)', opt_line)
        if m:
            opt_text = m.group(2).strip()
            # Strip trailing bold markers and checkmarks
            opt_text = re.sub(r'\s*\*{0,2}\s*[✓]*\s*$', '', opt_text)
            opt_text = opt_text.strip()
            options.append({'label': m.group(1), 'text': opt_text})
    
    if len(options) == 4:
        mcqs.append({
            'num': num,
            'question': q_text.strip(),
            'options': options,
            'answer': answer_key.get(num, '')
        })
    
    i += 2

print(f"Parsed {len(mcqs)} MCQs")

# ---- THEORY ----
theory_start = text.find("ESSAY / THEORY QUESTIONS")
practical_start = text.find("PRACTICAL QUESTIONS")
if practical_start < 0:
    practical_start = len(text)

theory_text = text[theory_start:practical_start].strip() if theory_start >= 0 else ""
practical_text = text[practical_start:].strip() if practical_start >= 0 and practical_start < len(text) else ""

# ---- BUILD TS BLOCKS ----
def escape_ts(s):
    s = s.replace("\\", "\\\\")
    s = s.replace('"', '\\"')
    s = s.replace("\n", "\\n")
    return s

ts_blocks = []

for i, mq in enumerate(mcqs):
    opts_lines = []
    for opt in mq['options']:
        opts_lines.append(f'        {{ label: "{opt["label"]}", text: "{escape_ts(opt["text"])}" }}')
    
    block = f"""  {{
    id: "che-2020-obj-{i+1:04d}",
    subject: "chemistry",
    year: 2020,
    category: "objective",
    question: "{escape_ts(mq['question'])}",
    options: [
{',\n'.join(opts_lines)}
    ],
    answer: "{mq['answer']}",
    difficulty: "medium"
  }}"""
    ts_blocks.append(block)

# Theory block - combine intro + content into question field
theory_full = theory_text
ts_blocks.append(f"""  {{
    id: "che-2020-t0001",
    subject: "chemistry",
    year: 2020,
    category: "theory",
    question: "{escape_ts(theory_full)}",
    difficulty: "hard"
  }}""")

# Practical block - combine into question field
ts_blocks.append(f"""  {{
    id: "che-2020-p0001",
    subject: "chemistry",
    year: 2020,
    category: "practical",
    question: "{escape_ts(practical_text)}",
    difficulty: "hard"
  }}""")

output = ",\n".join(ts_blocks)

bad = [mq for mq in mcqs if not mq['answer']]
if bad:
    print(f"WARNING: {len(bad)} MCQs without answers: {[b['num'] for b in bad]}")

print(f"Total: {len(ts_blocks)} blocks ({len(mcqs)} MCQs + 1 theory + 1 practical)")

with open(r"C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\2020_parsed_blocks.txt", "w", encoding="utf-8") as f:
    f.write(output)

print(f"Written to 2020_parsed_blocks.txt ({len(output)} chars)")
