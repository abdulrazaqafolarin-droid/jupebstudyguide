#!/usr/bin/env python3
"""Clean malformed/incomplete questions from extracted TS files."""

import re
import os
import shutil

EXTRACTED_DIR = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\extracted'


def find_question_blocks(content):
    """Find all top-level question objects by tracking brace depth from each '{'."""
    blocks = []
    i = 0
    while i < len(content):
        idx = content.find('{', i)
        if idx == -1:
            break
        
        # Determine if this starts a question object
        # A question starts with `{` that is preceded by `,` or `[` or newline+space+comma
        before = content[max(0, idx-20):idx].rstrip()
        is_start = (before.endswith(',') or before.endswith('[') or 
                    before.endswith('...allQuestions') or 
                    before.endswith('...chemistry_questions') or
                    before.endswith('...physics_questions') or
                    before.endswith('...math_questions') or
                    before.endswith('('))  # for [...chemistry_questions(...)]
        
        depth = 0
        j = idx
        while j < len(content):
            ch = content[j]
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    block_text = content[idx:j+1]
                    blocks.append({
                        'start': idx,
                        'end': j+1,
                        'text': block_text,
                        'is_start': is_start
                    })
                    i = j + 1
                    break
            elif ch == '"' or ch == '`':
                # Skip string content to avoid matching braces inside strings
                delim = ch
                j += 1
                while j < len(content):
                    if content[j] == '\\':
                        j += 2
                        continue
                    if content[j] == delim:
                        break
                    j += 1
            j += 1
        else:
            i = idx + 1
    
    return blocks


def parse_question(block):
    """Extract key fields from a question block."""
    qid = None
    m = re.search(r'id:\s*"([^"]*)"', block)
    if m:
        qid = m.group(1)
    
    question = ''
    m = re.search(r'question:\s*`([^`]*)`', block)
    if m:
        question = m.group(1)
    if not question:
        m = re.search(r'question:\s*"([^"]*)"', block)
        if m:
            question = m.group(1)
    
    year = None
    m = re.search(r'year:\s*(\d+)', block)
    if m:
        year = m.group(1)
    
    category = None
    m = re.search(r'category:\s*"([^"]*)"', block)
    if m:
        category = m.group(1)
    
    correct = ''
    m = re.search(r'correctAnswer:\s*"([^"]*)"', block)
    if m:
        correct = m.group(1)
    
    return {
        'id': qid,
        'question': question.strip(),
        'year': year,
        'category': category,
        'correctAnswer': correct
    }


def is_malformed(q):
    """Check if question is truly garbage."""
    qt = q['question']
    qid = q['id']
    
    if not qid:
        return True
    
    if not qt or len(qt) < 3:
        return True
    
    if re.match(r'^[A-D]\.\s*\w{0,10}$', qt):
        return True
    
    if re.match(r'^\d+[\.\?]?\s*$', qt):
        return True
    
    fragments = {
        'A', 'B', 'C', 'D', 'F f.', 'Material:', 'Theat h', 'An l iteh',
        'An N type', 'Intercept', 'Material', 'Option A', 'Option B',
        'Option C', 'Option D', 'Obain the', 'Rationli', 'dx',
        'Compounds', '48?', '300?', '30Q+20R', 'PHYSICAL CHEMISTRY',
        'MR=TR, MC=TC, V',
    }
    if qt.strip() in fragments:
        return True
    
    if qt.isupper() and len(qt) < 30 and not qt.endswith('?'):
        if not re.match(r'^[A-Z0-9=,+.\-/*()\[\]{} ]+$', qt):
            return True
    
    return False


def clean_file(filepath):
    """Remove malformed questions from a TS file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    blocks = find_question_blocks(content)
    print(f'  Found {len(blocks)} blocks total')
    
    # Identify BLOCK TYPES and ranges
    question_blocks = [b for b in blocks if b['is_start']]
    nested_blocks = [b for b in blocks if not b['is_start']]
    print(f'  Question blocks: {len(question_blocks)}, Nested blocks: {len(nested_blocks)}')
    
    # Classify each question block
    bad_indices = set()
    for i, b in enumerate(question_blocks):
        q = parse_question(b['text'])
        if is_malformed(q):
            bad_indices.add(i)
            print(f'    REMOVE: id={q["id"]}, q="{q["question"][:50]}"')
    
    if not bad_indices:
        print(f'  No malformed questions. Clean.')
        return
    
    # Build new content: keep non-question parts + only good question blocks
    result_parts = []
    last_pos = 0
    
    for i, b in enumerate(question_blocks):
        # Include content before this block
        if last_pos < b['start']:
            result_parts.append(content[last_pos:b['start']])
        
        if i in bad_indices:
            # Skip this question entirely
            last_pos = b['end']
        else:
            # Include this question and advance past it
            result_parts.append(b['text'])
            last_pos = b['end']
        
        # Handle everything AFTER the last question block
    if last_pos < len(content):
        result_parts.append(content[last_pos:])
    
    new_content = ''.join(result_parts)
    
    # Clean up: fix trailing commas and spacing
    new_content = re.sub(r',\s*,', ',', new_content)
    new_content = re.sub(r',\s*\]', '\n]', new_content)
    new_content = re.sub(r'\n{3,}', '\n\n', new_content)
    
    # Write backup
    bak = filepath + '.bak2'
    if not os.path.exists(bak):
        shutil.copy2(filepath, bak)
        print(f'  Backup: {bak}')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f'  Removed: {len(bad_indices)}, Written to: {filepath}')


def main():
    for fname in ['chemistry.ts', 'physics.ts', 'math.ts']:
        path = os.path.join(EXTRACTED_DIR, fname)
        if not os.path.exists(path):
            continue
        print(f'\n=== {fname} ===')
        clean_file(path)


if __name__ == '__main__':
    main()
