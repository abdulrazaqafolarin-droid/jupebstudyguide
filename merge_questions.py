#!/usr/bin/env python3
"""Merge extracted questions with existing data and generate clean TS files."""

import re
import json
import os
from collections import defaultdict

BASE_DIR = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main'
EXTRACTED_DIR = os.path.join(BASE_DIR, 'src', 'data', 'extracted')
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')

def clean_text(t):
    t = re.sub(r'\s+', ' ', t).strip()
    t = t.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
    return t

def read_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def read_ts(path):
    """Read existing TS file and return (header, questions_section, footer)."""
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def id_from_question(q):
    """Return a stable ID for dedup."""
    return q.get('id', '')

def merge(existing_ts, new_questions_json, subject, var_name="allQuestions",
          func_name="getChemistryQuestions"):
    """Merge existing TS with new questions."""
    
    # Read existing questions by parsing the TS
    existing_ids = set()
    existing_content = existing_ts
    
    # Extract existing question IDs
    id_pattern = re.compile(r'id:\s*"([^"]+)"')
    existing_ids = set(id_pattern.findall(existing_content))
    
    print(f"  Existing IDs: {len(existing_ids)}")
    
    # Read new questions and filter out duplicates
    new_questions = []
    added = 0
    skipped = 0
    for q in new_questions_json:
        qid = q.get('id', '')
        if qid and qid not in existing_ids:
            new_questions.append(q)
            added += 1
        elif qid in existing_ids:
            skipped += 1
    
    print(f"  New to add: {added}, Duplicates skipped: {skipped}")
    
    if not new_questions:
        print("  No new questions to add.")
        return existing_content
    
    # Build the new question entries as TS
    new_entries_lines = []
    for q in new_questions:
        lines = []
        lines.append('  {')
        lines.append(f'    id: "{q["id"]}",')
        
        # topic field (optional)
        if q.get('topic'):
            lines.append(f'    topic: "{q["topic"]}",')
        
        lines.append(f'    subject: "{q["subject"]}",')
        lines.append(f'    year: {q["year"]},')
        lines.append(f'    category: "{q["category"]}",')
        lines.append(f'    question: `{q["question"]}`,')
        lines.append(f'    difficulty: "{q.get("difficulty", "medium")}",')
        
        if q.get('tags'):
            tags = ', '.join(f'"{t}"' for t in q['tags'])
            lines.append(f'    tags: [{tags}],')
        
        if q.get('options') and len(q['options']) > 0:
            lines.append(f'    options: [')
            for opt in q['options']:
                ot = opt['text'].replace('`', '\\`').replace('${', '\\${')
                lines.append(f'      {{ label: "{opt["label"]}", text: `{ot}` }},')
            lines.append(f'    ],')
        
        lines.append(f'    correctAnswer: "{q.get("correctAnswer", "TBD")}",')
        
        if q.get('explanation'):
            e = q['explanation'].replace('`', '\\`').replace('${', '\\${')
            lines.append(f'    explanation: `{e}`,')
        if q.get('answerGuide'):
            g = q['answerGuide'].replace('`', '\\`').replace('${', '\\${')
            lines.append(f'    answerGuide: `{g}`,')
        
        lines.append('  },')
        new_entries_lines.append('\n'.join(lines))
    
    new_entries_block = '\n'.join(new_entries_lines)
    
    # Find array end: ]; followed by blank line and export function
    # This is the end of the allQuestions/physics_questions array, not the function return
    # Insert new entries BEFORE the ]; that closes the main array
    pat = re.compile(r'\];\s*\n\s*\n\s*export function')
    match = pat.search(existing_content)
    if match:
        arr_end = match.start()  # position of the ];
        merged = existing_content[:arr_end] + '\n' + new_entries_block + '\n' + existing_content[arr_end:]
        return merged
    
    # Fallback: find the last ]; that's NOT inside a return statement
    lines = existing_content.split('\n')
    result_lines = []
    inserted = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Check if this line is ]; that closes the main array
        if not inserted and stripped == '];':
            # Check if NEXT non-blank line is 'export function'
            next_nonblank = ''
            for j in range(i+1, min(i+5, len(lines))):
                if lines[j].strip():
                    next_nonblank = lines[j].strip()
                    break
            if next_nonblank.startswith('export function') or next_nonblank.startswith('export'):
                # Insert new entries BEFORE the ]; and keep the ]; 
                result_lines.append(new_entries_block)
                result_lines.append(line)
                inserted = True
                continue
        result_lines.append(line)
    
    if inserted:
        return '\n'.join(result_lines)
    else:
        print("  WARNING: Could not find array end marker. Appending to end.")
        return existing_content + '\n' + new_entries_block


def main():
    subjects = ['chemistry', 'physics', 'math']
    
    for subject in subjects:
        print(f"\n=== {subject} ===")
        
        # Determine file names
        subj_cap = subject.capitalize()
        var_name = f"{subject}_questions"
        func_name = f"get{subj_cap}Questions"
        
        existing_path = os.path.join(EXTRACTED_DIR, f"{subject}.ts")
        # Also check for extracted variant
        existing_extracted_path = os.path.join(EXTRACTED_DIR, f"{subject}-extracted.ts")
        
        if os.path.exists(existing_path):
            use_path = existing_path
        elif os.path.exists(existing_extracted_path):
            use_path = existing_extracted_path
        else:
            print(f"  No existing file found for {subject}")
            continue
        
        json_path = os.path.join(OUTPUT_DIR, f"{subject}.json")
        if not os.path.exists(json_path):
            print(f"  No extracted JSON at {json_path}")
            continue
        
        print(f"  Existing: {use_path}")
        
        existing_ts = read_ts(use_path)
        new_questions = read_json(json_path)
        
        merged = merge(existing_ts, new_questions, subject, var_name, func_name)
        
        # Write backup
        bak_path = use_path + '.bak'
        os.rename(use_path, bak_path)
        print(f"  Backup: {bak_path}")
        
        # Write merged
        with open(use_path, 'w', encoding='utf-8') as f:
            f.write(merged)
        
        # Count
        id_count = len(re.findall(r'id:\s*"', merged))
        print(f"  Written: {use_path} ({id_count} total questions)")


if __name__ == '__main__':
    main()
