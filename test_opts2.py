#!/usr/bin/env python3
"""Trace option extraction for a few questions."""
import re
import sys

with open(r'C:\Users\HP\Downloads\Past questions main\chemistry 2014-2025.txt', 'r', encoding='utf-8', errors='replace') as f:
    text = f.read()

# Extract first 10 questions from 2025 section
idx = text.find('MULTIPLE CHOICE QUESTIONS (OPTION D041)')
end_idx = text.find('## ESSAY QUESTIONS (2025)')
section = text[idx:end_idx]

def clean_text(t):
    return re.sub(r'\s+', ' ', t).strip()

def extract_options(block):
    opts = []
    
    # Method 3: All on one line
    for line in block.split('\n'):
        s = line.strip()
        parts = re.split(r'(?=[A-D]\.\s)', s)
        if len(parts) >= 4:
            for p in parts:
                m = re.match(r'^([A-D])[\.\)]\s*(.*)', p.strip())
                if m:
                    t = clean_text(m.group(2))
                    t = re.sub(r'\s*[B-D]\.\s.*$', '', t)
                    if t and len(t) > 1:
                        opts.append({"label": m.group(1), "text": t})
    return opts

# Parse questions in this section
q_num = None
buffer = []
results = []

section = re.sub(r'\*\*(\d+)\.\*\*', r'__Q__\1', section)
section = re.sub(r'\*\*Answer:?\s*([A-Da-d])[\.\)]?\s*(.*?)\*\*', r'__ANS__\1||\2||', section)

for line in section.split('\n'):
    qm = re.match(r'^__Q__(\d+)\s', line)
    if qm:
        if buffer and q_num is not None:
            block = '\n'.join(buffer)
            opts = extract_options(block)
            question_text = line  # simplified
            results.append((q_num, len(opts), [o['label']+':'+o['text'][:30] for o in opts]))
        q_num = int(qm.group(1))
        buffer = [line]
    elif q_num is not None:
        buffer.append(line)

if buffer and q_num is not None:
    block = '\n'.join(buffer)
    opts = extract_options(block)
    results.append((q_num, len(opts), [o['label']+':'+o['text'][:30] for o in opts]))

with open('C:/Users/HP/Downloads/opt_trace.txt', 'w', encoding='utf-8') as out:
    for num, nopts, opt_summary in results:
        out.write(f"Q{num}: {nopts} options\n")
        for os in opt_summary:
            out.write(f"  {os}\n")
        out.write("\n")

print(f"Parsed {len(results)} questions")
