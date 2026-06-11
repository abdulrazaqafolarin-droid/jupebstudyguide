#!/usr/bin/env python3
"""Batch-fill TBD answers in extracted question TS files using Gemini API."""

import re
import json
import urllib.request
import urllib.error
import os
import sys
import time

# Gemini API keys (cycles through them for rate limiting)
API_KEYS = [
    'AQ.Ab8RN6LMs2O38kUqXbOLFMfjg35cENsHG7D5CQfzUDpU2MMwUg',
    'AQ.Ab8RN6LQjL8_iJv_xj3Bk-r6xoQ30_XnFTpMmtlg1KVL7Jt6pA',
    'AQ.Ab8RN6JveeweWgjL5fWcvQPjT1DDgaj7kLqYgwbdmnf2VGXwfA',
    'AQ.Ab8RN6KNkNY8gOLeGKfmmMU4F2wWlWGlI9OSOJmTMMYYI0mkmw',
    'AQ.Ab8RN6L_E8W6gzjXE0ccBKtJ3iwMsaSFrDNjkkL5KAqKlxN8_g',
    'AQ.Ab8RN6L9WGKo_NWFIQ-xd-1uMQCqxyuCnLvWgcMzRufHepHW7Q',
    'AQ.Ab8RN6LQ19sdfns_xq5V_6mXID0V5IHapOBQrLwaqEDdqwThCA',
    'AQ.Ab8RN6ICsUC6LBlfkx4w2WtfFk3ZC0srPqMq3yIm80xkqOjbgg',
]

MODEL = 'gemini-flash-latest'
BATCH_SIZE = 15
KEY_INDEX = 0

def gemini_request(prompt, api_key):
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={api_key}'
    payload = {
        'contents': [{'parts': [{'text': prompt}]}],
        'generationConfig': {'temperature': 0.1, 'maxOutputTokens': 2048}
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read())
            text = data['candidates'][0]['content']['parts'][0]['text']
            return text.strip()
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f'  HTTP {e.code}: {body[:200]}')
        return None
    except Exception as e:
        print(f'  Error: {e}')
        return None


def get_next_key():
    global KEY_INDEX
    key = API_KEYS[KEY_INDEX % len(API_KEYS)]
    KEY_INDEX += 1
    return key


def extract_tbd_questions(content):
    """Extract objective questions with TBD answers from TS content."""
    # Split by id: to get individual question entries
    blocks = re.split(r'(?=id:\s*")', content)
    
    questions = []
    for block in blocks:
        if not block.strip():
            continue
        
        # Must be objective
        if not re.search(r'category:\s*"objective"', block):
            continue
        
        # Must have TBD answer
        m = re.search(r'correctAnswer:\s*"(TBD|tbd|)"', block)
        if not m:
            continue
        
        # Extract fields
        qid_m = re.search(r'id:\s*"([^"]*)"', block)
        if not qid_m:
            continue
        qid = qid_m.group(1)
        
        # Get question text (backtick or double-quote)
        qtext = ''
        qm = re.search(r'question:\s*`([^`]*)`', block)
        if qm:
            qtext = qm.group(1).strip()
        if not qtext:
            qm = re.search(r'question:\s*"([^"]*)"', block)
            if qm:
                qtext = qm.group(1).strip()
        
        if not qtext:
            continue
        
        # Extract options
        options = []
        opt_m = re.search(r'options:\s*\[(.*?)\]', block, re.DOTALL)
        if opt_m:
            pairs = re.findall(r'label:\s*"([^"]*)"[^}]*?text:\s*`([^`]*)`', opt_m.group(1), re.DOTALL)
            if not pairs:
                pairs = re.findall(r'label:\s*"([^"]*)"[^}]*?text:\s*"([^"]*)"', opt_m.group(1), re.DOTALL)
            for label, text in pairs:
                options.append((label.strip(), text.strip()))
        
        old_answer = m.group(1) if m else 'TBD'
        
        questions.append({
            'id': qid,
            'question': qtext,
            'options': options,
            'block': block,
            'has_options': len(options) >= 2,
            'old_answer': old_answer,
            'new_answer': None,
        })
    
    return questions


def batch_questions(qs, batch_size):
    """Split into batches."""
    return [qs[i:i+batch_size] for i in range(0, len(qs), batch_size)]


def build_prompt(batch):
    """Build Gemini prompt for a batch of questions."""
    lines = [
        "You are a JUPEB exam expert. For each question, determine the correct answer from the options given.",
        "Reply with ONLY the question number and correct answer letter, one per line.",
        "Example format:",
        "1: A",
        "2: C",
        "3: B",
        "If you cannot determine the answer, write: 1: UNKNOWN",
        "",
        "--- QUESTIONS ---",
    ]
    
    for i, q in enumerate(batch, 1):
        qtext = q['question'][:200]  # Truncate very long questions
        lines.append(f"\n{i}. {qtext}")
        if q['options']:
            for label, text in q['options']:
                t = text[:100]
                lines.append(f"   {label}. {t}")
    
    return '\n'.join(lines)


def parse_response(response, batch_size):
    """Parse Gemini response into answer dict: {index: letter}."""
    answers = {}
    for line in response.split('\n'):
        line = line.strip()
        # Accept various formats: "1: A", "1. A", "Q1: A", "Question 1: A"
        m = re.search(r'(?:Q(?:uestion)?\s*)?(\d+)\s*[:.\-)}]+\s*([A-D]|UNKNOWN|TBD)\b', line)
        if m:
            idx = int(m.group(1))
            answer = m.group(2)
            if 1 <= idx <= batch_size:
                answers[idx] = answer
    return answers


def update_file_content(content, questions_with_answers):
    """Update TS content with new answers."""
    result = content
    
    for q in questions_with_answers:
        qid = q['id']
        answer = q['new_answer']
        if not answer or answer == 'UNKNOWN' or answer == 'TBD':
            continue
        
        # Find the correctAnswer field for this question
        # Use the block text to find exact position
        old_val = f'correctAnswer: "{q["old_answer"]}"'
        new_val = f'correctAnswer: "{answer}"'
        
        # Only replace the specific occurrence for this question
        # Find the question block by id
        id_pos = result.find(f'id: "{qid}"')
        if id_pos < 0:
            continue
        
        # Find correctAnswer after this id
        answer_pos = result.find('correctAnswer:', id_pos)
        if answer_pos < 0:
            continue
        
        # Calculate line end
        line_end = result.find('\n', answer_pos)
        if line_end < 0:
            line_end = answer_pos + 50
        
        old_line = result[answer_pos:line_end]
        # Replace just the value
        new_line = re.sub(r'correctAnswer:\s*"[^"]*"', f'correctAnswer: "{answer}"', old_line)
        
        if old_line != new_line:
            result = result[:answer_pos] + new_line + result[line_end:]
    
    return result


def count_variables(content):
    """Count specific variables in TS content."""
    ids = re.findall(r'id:\s*"([^"]*)"', content)
    tbds = re.findall(r'correctAnswer:\s*"TBD"', content)
    return len(ids), len(tbds)


def process_subject(filepath):
    """Process one subject file."""
    print(f'\n=== Processing {os.path.basename(filepath)} ===')
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    total_ids, tbds_before = count_variables(content)
    print(f'  Total questions: {total_ids}, TBD answers: {tbds_before}')
    
    questions = extract_tbd_questions(content)
    print(f'  Objective TBD questions with options: {sum(1 for q in questions if q["has_options"])}')
    print(f'  Objective TBD questions without options: {sum(1 for q in questions if not q["has_options"])}')
    
    # Only process questions with options (can't answer without options)
    processable = [q for q in questions if q['has_options']]
    if not processable:
        print('  No processable questions found.')
        return content
    
    batches = batch_questions(processable, BATCH_SIZE)
    print(f'  Batches: {len(batches)} (batch size: {BATCH_SIZE})')
    
    all_updated = []
    for batch_idx, batch in enumerate(batches):
        prompt = build_prompt(batch)
        api_key = get_next_key()
        
        print(f'  Batch {batch_idx+1}/{len(batches)} ({len(batch)} Qs)...', end=' ')
        sys.stdout.flush()
        
        response = gemini_request(prompt, api_key)
        if not response:
            print('FAILED (no response)')
            time.sleep(2)
            continue
        
        print(f'Got {len(response)} chars')
        
        answers = parse_response(response, len(batch))
        # Debug: show response
        print(f'    Response: {response[:150]}')
        print(f'    Parsed {len(answers)}/{len(batch)} answers')
        
        for i, q in enumerate(batch, 1):
            if i in answers:
                q['new_answer'] = answers[i]
                all_updated.append(q)
        
        # If 0 parsed, try harder - add to a retry list
        if len(answers) == 0:
            print(f'    FULL: {response[:500]}')
            # Retry with simpler prompt for this batch
            simple_lines = ['Determine the correct answer letter for each question.', '']
            for i, q in enumerate(batch, 1):
                simple_lines.append(f'{i}. {q["question"][:100]}')
                for label, text in q['options']:
                    simple_lines.append(f'   {label}. {text[:80]}')
            simple_lines.append('')
            simple_lines.append('Answer each with just the number and letter.')
            simple_prompt = '\n'.join(simple_lines)
            
            print('    Retrying with simpler prompt...')
            time.sleep(3)
            retry_resp = gemini_request(simple_prompt, get_next_key())
            if retry_resp:
                retry_answers = parse_response(retry_resp, len(batch))
                if retry_answers:
                    answers.update(retry_answers)
                    print(f'    Retry got: {retry_answers}')
        
        time.sleep(1.5)  # Rate limiting
    
    if all_updated:
        # Update the TS file
        new_content = update_file_content(content, all_updated)
        
        # Count remaining TBDs
        _, tbds_after = count_variables(new_content)
        answered = tbds_before - tbds_after
        
        print(f'\n  Answered: {answered}/{tbds_before} TBDs')
        
        return new_content
    
    return content


def main():
    d = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\extracted'
    
    for fname in ['chemistry.ts', 'physics.ts', 'math.ts']:
        path = os.path.join(d, fname)
        if not os.path.exists(path):
            continue
        
        new_content = process_subject(path)
        if new_content:
            # Backup
            bak = path + '.bak3'
            with open(path, 'r', encoding='utf-8') as f:
                old = f.read()
            with open(bak, 'w', encoding='utf-8') as f:
                f.write(old)
            print(f'  Backup: {bak}')
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'  Written: {path}')


if __name__ == '__main__':
    main()
