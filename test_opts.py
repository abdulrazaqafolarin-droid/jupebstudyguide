#!/usr/bin/env python3
"""Diagnose option parsing on 2025 section."""
import re
import time

with open(r'C:\Users\HP\Downloads\Past questions main\chemistry 2014-2025.txt', 'r', encoding='utf-8', errors='replace') as f:
    text = f.read()

# Extract 2025 MCQ section
idx = text.find('MULTIPLE CHOICE QUESTIONS (OPTION D041)')
end_idx = text.find('## ESSAY QUESTIONS (2025)')
section = text[idx:end_idx]
print(f"Section length: {len(section)} chars")

# List all option-like lines
lines = section.split('\n')
for i, line in enumerate(lines):
    s = line.strip()
    if re.search(r'[A-D]\.\s', s) and len(s) > 5 and not s.startswith('**') and 'Answer' not in s:
        parts = re.split(r'(?=[A-D]\.\s)', s)
        print(f"Line {i}: {len(parts)} options: {s[:100]}")
