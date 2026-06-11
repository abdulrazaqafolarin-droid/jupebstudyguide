#!/usr/bin/env python3
"""Extract answer keys from chem_answer_keys.txt and apply to TS data files."""

import re, os, json
from collections import defaultdict

STUDY_DIR = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\study-questions'
KEYS_FILE = r'C:\Users\HP\Downloads\chem_answer_keys.txt'

def parse_keys_file():
    with open(KEYS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    keys_by_year = defaultdict(dict)
    
    # Split by year sections
    year_patterns = [
        (2025, r'2025\).*?ANSWER KEY SECTION', r'2025', r'ANSWERS TO MULTIPLE CHOICE.*?2025'),
        (2023, r'2023\)'),
        (2021, r'2021\)'),
        (2020, r'2020\)'),
        (2019, r'2019\)'),
        (2018, r'2018\)'),
        (2016, r'2016\)'),
    ]
    
    sections = re.split(r'=== ANSWER KEY SECTION ===', content)
    
    for section in sections:
        if not section.strip():
            continue
        
        year = None
        for y in range(2014, 2026):
            if str(y) in section[:200]:
                year = y
                break
        if not year:
            continue
        
        # Extract number: letter pairs
        # Pattern: "1. A", "1: A", "1 — A", "1) A", "1. C", "**1. A**"
        # Also "1. D — 2. A" (combined lines)
        
        # First, find all answer patterns
        # Handle: "1. A 2. C 3. B" inline format
        # Handle: "1. A" single format
        # Handle: "**1. A**" bold format
        
        # Split on sentence boundaries and extract
        # Pattern matches: number followed by punctuation, then letter
        pairs = re.findall(r'(?<!\d)(\d+)\s*[:.\-)}]+\s*\*{0,2}([A-D])\*{0,2}', section)
        
        for num, letter in pairs:
            n = int(num)
            if 1 <= n <= 70:
                keys_by_year[year][n] = letter
    
    return keys_by_year

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def extract_questions(content):
    blocks = re.split(r'(?=id:\s*")', content)
    questions = []
    for block in blocks:
        if not block.strip() or not re.search(r'category:\s*"objective"', block):
            continue
        qid_m = re.search(r'id:\s*"([^"]*)"', block)
        if not qid_m: continue
        qid = qid_m.group(1)
        yr_m = re.search(r'year:\s*(\d+)', block)
        year = int(yr_m.group(1)) if yr_m else 0
        ca_m = re.search(r'correctAnswer:\s*"([^"]*)"', block)
        ca = ca_m.group(1) if ca_m else ''
        questions.append({'id': qid, 'year': year, 'correctAnswer': ca, 'block': block})
    return questions

def apply_keys_to_subject(subject, keys_by_year):
    path = os.path.join(STUDY_DIR, f'{subject}.ts')
    content = read_file(path)
    
    # Apply chemistry keys only to chemistry
    if subject != 'chemistry':
        print(f'  No keys for {subject}, skipping')
        return content
    
    questions = extract_questions(content)
    
    # Get indices empty CA questions by year
    year_qs = defaultdict(list)
    for q in questions:
        if not q['correctAnswer'] and q['year'] in keys_by_year:
            year_qs[q['year']].append(q)
    
    filled = 0
    for year in sorted(year_qs.keys()):
        keys = keys_by_year.get(year, {})
        if not keys:
            continue
        
        # Sort questions by their sequential number from the ID
        qs = sorted(year_qs[year], key=lambda q: int(re.search(r'q(\d+)', q['id']).group(1)) if re.search(r'q(\d+)', q['id']) else 0)
        
        for q in qs:
            # Extract question number from ID (e.g., "che-2025-q0001" -> 1)
            num_m = re.search(r'q(\d+)', q['id'])
            if not num_m:
                continue
            qnum = int(num_m.group(1))
            
            if qnum in keys:
                letter = keys[qnum]
                # Find and replace in content
                id_pos = content.find(f'id: "{q["id"]}"')
                if id_pos < 0: continue
                ca_pos = content.find('correctAnswer:', id_pos)
                if ca_pos < 0: continue
                ca_end = content.find(',', ca_pos)
                if ca_end < 0: ca_end = ca_pos + 40
                
                old = content[ca_pos:ca_end]
                new = f'correctAnswer: "{letter}"'
                if old != new:
                    content = content[:ca_pos] + new + content[ca_end:]
                    filled += 1
    
    print(f'  Filled {filled} answers from keys for {subject}')
    write_file(path, content)
    return content

def main():
    keys = parse_keys_file()
    
    print("Parsed answer keys:")
    for year in sorted(keys):
        print(f'  {year}: {len(keys[year])} answers')
    
    for subject in ['chemistry']:
        print(f'\n{subject}:')
        apply_keys_to_subject(subject, keys)
    
    print('\nDone')

if __name__ == '__main__':
    main()
