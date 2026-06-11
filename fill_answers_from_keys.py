#!/usr/bin/env python3
"""Extract answer keys from text files and fill missing correctAnswer in TS data."""

import re, os, json
from collections import defaultdict

BASE = r'C:\Users\HP\Downloads'
PROJECT = os.path.join(BASE, 'jupebstudyguide-main', 'jupebstudyguide-main')
STUDY_DIR = os.path.join(PROJECT, 'src', 'data', 'study-questions')
SUBJECTS = ['chemistry', 'physics', 'math']

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def extract_keys_from_text(text, subject_year_hint=None):
    """Extract answer keys from raw text. Returns dict: {year: {qnum: letter}}"""
    results = {}
    
    # Split into sections by === or ## or page markers
    sections = re.split(r'\n(?:={3,}|#{3,})', text)
    
    for sec in sections:
        if not sec.strip():
            continue
        
        # Determine year
        yr_m = re.search(r'(20(?:1[4-9]|2[0-5]))', sec)
        if not yr_m:
            continue
        year = int(yr_m.group(1))
        
        # Skip if this section doesn't look like answer keys
        if not re.search(r'(?:ANSWER|MULTIPLE\s*CHOICE|MCQ)', sec, re.IGNORECASE):
            continue
        
        if year not in results:
            results[year] = {}
        
        # Find "N. X" patterns where X is A/B/C/D (but avoid matching question text)
        # Common patterns: "1. A", "1. A 2. C 3. B", "1. A — 2. B"
        for m in re.finditer(r'(?<!\d)(\d{1,2})\s*[.\-—)]+\s*([A-D])\b', sec):
            qnum = int(m.group(1))
            letter = m.group(2)
            if 1 <= qnum <= 60 and letter in 'ABCD':
                results[year][qnum] = letter
        
        # Bold patterns: "**N.** X" or "**N.*** X"
        for m in re.finditer(r'\*\*(\d{1,2})\*\*\.?\**\s*([A-D])\b', sec):
            qnum = int(m.group(1))
            letter = m.group(2)
            if 1 <= qnum <= 60 and letter in 'ABCD':
                results[year][qnum] = letter
        
        # Option X patterns: "Option A", "**(C)**"
        for m in re.finditer(r'(?:Option|Answer\s*[:=]?)\s*\(?([A-D])\)?', sec):
            letter = m.group(1)
            # Find the question number before this answer
            pre = sec[:m.start()]
            qm = re.findall(r'(\d{1,2})\s*[.\-—)]', pre)
            if qm:
                latest_q = int(qm[-1])
                if 1 <= latest_q <= 60:
                    results[year][latest_q] = letter
        
        # Numbered answer with explanation: "X. Y" where Y is a letter at the start of the line
        for m in re.finditer(r'^\s*(\d{1,2})\.\s+([A-D])\b', sec, re.MULTILINE):
            qnum = int(m.group(1))
            letter = m.group(2)
            if 1 <= qnum <= 60:
                results[year][qnum] = letter
    
    return results

def load_all_answer_keys():
    """Load answer keys from all available text files."""
    all_keys = defaultdict(dict)  # {subject: {year: {qnum: letter}}}
    
    # Look for answer key files in Downloads
    dl_files = [
        ('chemistry', r'chem_answer_keys.txt'),
        ('chemistry', r'chem_answers.txt'),
    ]
    
    # Check all chem_* files
    for f in os.listdir(BASE):
        fpath = os.path.join(BASE, f)
        if not os.path.isfile(fpath):
            continue
        if not f.endswith('.txt'):
            continue
        
        content = read_file(fpath)
        # Try to extract keys
        keys = extract_keys_from_text(content)
        
        # Determine subject from filename
        subject = None
        if f.startswith('chem') or 'chemistry' in content.lower()[:500]:
            subject = 'chemistry'
        elif f.startswith('phys') or 'physics' in content.lower()[:500]:
            subject = 'physics'
        elif f.startswith('math') or 'mathematics' in content.lower()[:500]:
            subject = 'math'
        
        if subject:
            for year, qs in keys.items():
                all_keys[subject][year].update(qs)
    
    # Also try the big text file
    big_file = os.path.join(BASE, 'JUPEB_All_PastQuestions (1).txt')
    if os.path.exists(big_file):
        content = read_file(big_file)
        
        # For each subject section, extract keys
        for subject, marker in [('chemistry', 'SECTION 1:'), ('physics', 'SECTION 2:'), ('math', 'SECTION 3:')]:
            pos = content.find(marker)
            if pos < 0:
                continue
            # Find section
            section = content[pos:]
            # Limit to this section
            for other_subj, other_marker in [('chemistry', 'SECTION 2:'), ('physics', 'SECTION 3:')]:
                if subject != other_subj:
                    op = section.find(other_marker)
                    if op > 0:
                        section = section[:op]
            
            # Find answer key blocks in this section
            for m in re.finditer(r'(ANSWERS?\s*TO\s*MULTIPLE\s*CHOICE|MCQ\s*ANSWERS|Suggested\s*Answers)', section, re.IGNORECASE):
                block_start = m.start()
                block_end = min(block_start + 2000, len(section))
                block = section[block_start:block_end]
                
                yr_m = re.search(r'(20(?:1[4-9]|2[0-5]))', block)
                if not yr_m:
                    continue
                year = int(yr_m.group(1))
                
                # Extract numbered answers
                for am in re.finditer(r'(?:\*\*|(?<=\s)|^|\()(\d{1,2})\)?\s*[.\-—)]+\s*([A-D])(?:\*\*|\s|$|\))', block):
                    qnum = int(am.group(1))
                    letter = am.group(2)
                    if 1 <= qnum <= 60 and letter in 'ABCD':
                        all_keys[subject][year][qnum] = letter
    
    return all_keys

def apply_keys_to_subject(subject, all_keys):
    """Apply extracted answer keys to fill missing correctAnswer."""
    path = os.path.join(STUDY_DIR, f'{subject}.ts')
    if not os.path.exists(path):
        print(f'{subject}.ts not found')
        return
    
    content = read_file(path)
    keys = all_keys.get(subject, {})
    
    if not keys:
        print(f'No answer keys found for {subject}')
        return content
    
    # Parse all questions to find year+number -> id mapping
    # Questions have IDs like: che-2025-q0001 (subject-year-qNumber)
    filled = 0
    total_missing = 0
    year_counts = defaultdict(int)
    
    for m in re.finditer(r'id:\s*"([^"]+)".*?year:\s*(\d+).*?correctAnswer:\s*"([^"]*)"', content, re.DOTALL):
        qid = m.group(1)
        year = int(m.group(2))
        current_ca = m.group(3)
        
        # Extract question number from ID
        num_m = re.search(r'-q(\d+)', qid)
        if not num_m:
            continue
        qnum = int(num_m.group(1))
        
        if current_ca:
            continue  # already has answer
        
        total_missing += 1
        
        if year in keys and qnum in keys[year]:
            new_ca = keys[year][qnum]
            if new_ca in 'ABCD':
                # Find and replace in content
                id_pos = content.find(f'id: "{qid}"')
                if id_pos >= 0:
                    ca_block = content[id_pos:id_pos+400]
                    ca_pos = id_pos + ca_block.find('correctAnswer:')
                    if ca_pos >= id_pos:
                        line_end = content.find('\n', ca_pos)
                        if line_end < 0:
                            line_end = ca_pos + 60
                        old_line = content[ca_pos:line_end]
                        new_line = re.sub(r'correctAnswer:\s*"[^"]*"', f'correctAnswer: "{new_ca}"', old_line)
                        if old_line != new_line:
                            content = content[:ca_pos] + new_line + content[line_end:]
                            filled += 1
                            year_counts[year] += 1
    
    print(f'  {subject}: filled {filled}/{total_missing} missing answers')
    for yr in sorted(year_counts):
        print(f'    {yr}: {year_counts[yr]} filled')
    
    write_file(path, content)
    return content

def main():
    print('Loading answer keys...')
    all_keys = load_all_answer_keys()
    
    for subject in SUBJECTS:
        ks = all_keys.get(subject, {})
        total = sum(len(v) for v in ks.values())
        print(f'\n{subject}: {total} answer keys across {len(ks)} years')
        for yr in sorted(ks):
            print(f'  {yr}: {len(ks[yr])} keys - {sorted(ks[yr].items())[:5]}')
    
    print('\nApplying keys...')
    for subject in SUBJECTS:
        apply_keys_to_subject(subject, all_keys)
    
    # Final stats
    print('\nFinal stats:')
    for subject in SUBJECTS:
        path = os.path.join(STUDY_DIR, f'{subject}.ts')
        content = read_file(path)
        ids = re.findall(r'id:\s*"', content) 
        empty = re.findall(r'correctAnswer:\s*""', content)
        # Count by year
        years = defaultdict(int)
        for y in re.findall(r'year:\s*(\d+).*?category:\s*"objective"', content, re.DOTALL):
            years[int(y)] += 1
        print(f'  {subject}: {len(ids)} total, {len(empty)} missing CA')
        print(f'    Per year: {dict(sorted(years.items()))}')

if __name__ == '__main__':
    main()
