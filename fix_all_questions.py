#!/usr/bin/env python3
"""COMPREHENSIVE: Fill missing answers, fix options, reach 50/year using 19 Gemini API keys."""

import re, json, urllib.request, urllib.error, os, sys, time, random, threading
from collections import defaultdict

API_KEYS = [
    'AQ.Ab8RN6K8-GWIeLzB48pPIGJI0DDnTmkMcfHpUrVzxxW6O2xJLA',
    'AQ.Ab8RN6Iq_vlsVVO0rEfWB0nfNtOdl2eqE5dlzI9sOdjMHCPJ7g',
    'AQ.Ab8RN6JHB7wu2MyiKtOXuUtYxKK1rqyMKZcKOmJilWytqMiS7w',
    'AQ.Ab8RN6IQI03QOPzGDICxgcctI4tIP4LBBFgW3Ht8KR2Y3jqz_A',
    'AQ.Ab8RN6Lw2EMl1BS9EpKVELbG8sHQ4u32XrUnYUgmVzSxmEkguA',
    'AQ.Ab8RN6KSThNHk2DR_ttSVJo7H8eWesEDP2Dur5208166HkkqeQ',
    'AQ.Ab8RN6J13WX6AJxLdxXLIr4QMkkbzLPD3hC-j30Bo-S3_SQeqQ',
    'AQ.Ab8RN6I4pXZkZ6kp_UgejBW0jLJYbzza2sxL-5Z0f-quPSErAA',
    'AQ.Ab8RN6IYe86cmGORKpeaFSTZGxAcVcjLAQTA1Nau19lMqT7P_A',
    'AQ.Ab8RN6LjOXBhIiAucqtkpB5kLW62YrwYVOB-JMuV3TNcfCC73Q',
    'AQ.Ab8RN6JcWVm5dlR3uZllW_s7x0Tz-jeTj4dVH-9cnhXbhMsnlw',
    'AQ.Ab8RN6LIS4p9FD6_bHP-hmfAmzIq5SaZpp3k8I6IxNSsybjjyA',
    'AQ.Ab8RN6JKkV-7d4WJt6ghX2zhEl7WOotTCYd0NGgVHcTtad9_2Q',
    'AQ.Ab8RN6I3FA1WF0NFNKWxXIVFmApt0MKaeLXY_owGvLovYikLPA',
    'AQ.Ab8RN6Jx_XPGzN8cKcWRDw8aDN7KbUXU-zIDDghP_LCxE71j8Q',
    'AQ.Ab8RN6JercfBIfCCFHrKSvVr__2snH7V6rBgCZjQCSrnSXUCQw',
    'AQ.Ab8RN6IKStlNUuvmfxa3faK7Ab2THwvMVVxn96Mby-ae8tFqFA',
    'AQ.Ab8RN6IQFbvlJjEYe_fXD4wdjLdbbyukvO2GzNLuLRo0DiAZgQ',
    'AQ.Ab8RN6IUihpkjN1buYPhN_ge_XPqcYjHtVCw4TAAUEBLR5N3hQ',
]
KEY_LOCK = threading.Lock()
KEY_INDEX = 0
MODEL = 'gemini-flash-latest'
BATCH_SIZE = 15
BASE_DIR = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\study-questions'
SUBJECTS = ['chemistry', 'physics', 'math']
TARGET_PER_YEAR = 50
YEARS = list(range(2014, 2026))

def get_next_key():
    global KEY_INDEX
    with KEY_LOCK:
        k = API_KEYS[KEY_INDEX % len(API_KEYS)]
        KEY_INDEX += 1
    return k

def gemini_request(prompt, api_key, retries=2):
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={api_key}'
    payload = {
        'contents': [{'parts': [{'text': prompt}]}],
        'generationConfig': {'temperature': 0.1, 'maxOutputTokens': 2048}
    }
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                         headers={'Content-Type': 'application/json'}, method='POST')
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = json.loads(resp.read())
                text = data['candidates'][0]['content']['parts'][0]['text']
                return text.strip()
        except urllib.error.HTTPError as e:
            body = e.read().decode()[:200]
            if attempt < retries - 1:
                time.sleep(3 * (attempt + 1))
                continue
            print(f'  HTTP {e.code}: {body}')
            return None
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(3)
                continue
            print(f'  Error: {e}')
            return None
    return None

def extract_questions(content):
    """Extract all objective questions with their data."""
    blocks = re.split(r'(?=id:\s*")', content)
    questions = []
    for block in blocks:
        if not block.strip():
            continue
        if not re.search(r'category:\s*"objective"', block):
            continue
        qid_m = re.search(r'id:\s*"([^"]*)"', block)
        if not qid_m:
            continue
        qid = qid_m.group(1)
        yr_m = re.search(r'year:\s*(\d+)', block)
        year = int(yr_m.group(1)) if yr_m else 0
        qm = re.search(r'question:\s*`([^`]*)`', block)
        if not qm:
            qm = re.search(r'question:\s*"([^"]*)"', block)
        qtext = qm.group(1).strip()[:300] if qm else ''
        ca_m = re.search(r'correctAnswer:\s*"([^"]*)"', block)
        ca = ca_m.group(1) if ca_m else ''
        options = []
        opt_m = re.search(r'options:\s*\[(.*?)\]', block, re.DOTALL)
        if opt_m:
            pairs = re.findall(r'label:\s*"([A-D])"\s*,\s*text:\s*`([^`]*)`', opt_m.group(1), re.DOTALL)
            if not pairs:
                pairs = re.findall(r'label:\s*"([A-D])".*?text:\s*"([^"]*)"', opt_m.group(1), re.DOTALL)
            for label, text in pairs:
                options.append((label.strip(), text.strip()))
        questions.append({'id': qid, 'year': year, 'question': qtext, 'options': options, 'correctAnswer': ca, 'block': block})
    return questions

def build_fill_prompt(batch):
    lines = [
        "You are a JUPEB exam expert. For each question, determine the single correct letter answer.",
        "Reply with ONLY the question number and letter, one per line. Example:",
        "1: B",
        "2: D",
        "If truly unanswerable, write: 1: UNKNOWN",
        "--- QUESTIONS ---"
    ]
    for i, q in enumerate(batch, 1):
        lines.append(f"\n{i}. {q['question'][:200]}")
        for label, text in q['options']:
            lines.append(f"   {label}. {text[:100]}")
    return '\n'.join(lines)

def parse_fill_response(response, batch_size):
    answers = {}
    for line in response.split('\n'):
        line = line.strip()
        m = re.search(r'(?:Q(?:uestion)?\s*)?(\d+)\s*[:.\-)}]+\s*([A-D]|UNKNOWN|TBD)\b', line)
        if m:
            idx = int(m.group(1))
            if 1 <= idx <= batch_size:
                answers[idx] = m.group(2)
    return answers

def fill_missing_answers(content, subject):
    """Fill all empty correctAnswer in the content using Gemini."""
    questions = extract_questions(content)
    to_fill = [q for q in questions if not q['correctAnswer'] and len(q['options']) >= 2]
    if not to_fill:
        print(f'  No missing answers to fill for {subject}')
        return content
    
    print(f'  Need to fill {len(to_fill)} answers for {subject}')
    random.shuffle(to_fill)
    batches = [to_fill[i:i+BATCH_SIZE] for i in range(0, len(to_fill), BATCH_SIZE)]
    filled = 0
    
    for batch_idx, batch in enumerate(batches):
        prompt = build_fill_prompt(batch)
        api_key = get_next_key()
        sys.stdout.write(f'  Batch {batch_idx+1}/{len(batches)} ({len(batch)} Qs)... ')
        sys.stdout.flush()
        response = gemini_request(prompt, api_key)
        if not response:
            print('FAILED')
            continue
        answers = parse_fill_response(response, len(batch))
        print(f'Got {len(answers)}/{len(batch)} answers')
        
        for i, q in enumerate(batch, 1):
            if i in answers and answers[i] not in ('UNKNOWN', 'TBD'):
                # Find and replace in content
                id_pos = content.find(f'id: "{q["id"]}"')
                if id_pos < 0:
                    continue
                ca_pos = content.find('correctAnswer:', id_pos)
                if ca_pos < 0:
                    continue
                line_end = content.find('\n', ca_pos)
                if line_end < 0:
                    line_end = ca_pos + 60
                old_line = content[ca_pos:line_end]
                new_line = re.sub(r'correctAnswer:\s*"[^"]*"', f'correctAnswer: "{answers[i]}"', old_line)
                if old_line != new_line:
                    content = content[:ca_pos] + new_line + content[line_end:]
                    filled += 1
        
        time.sleep(0.5)
        sys.stdout.flush()
    
    print(f'  Filled {filled}/{len(to_fill)} answers for {subject}')
    return content

def fix_options(content, subject):
    """Ensure every objective has exactly 4 options (pad if needed)."""
    blocks = re.split(r'(?=id:\s*")', content)
    fixed = 0
    for block in blocks:
        if not block.strip() or not re.search(r'category:\s*"objective"', block):
            continue
        qid_m = re.search(r'id:\s*"([^"]*)"', block)
        if not qid_m:
            continue
        qid = qid_m.group(1)
        # Count options
        opt_m = re.search(r'options:\s*\[(.*?)\]', block, re.DOTALL)
        if not opt_m:
            continue
        opt_text = opt_m.group(1)
        labels_in = re.findall(r'label:\s*"([A-D])"', opt_text)
        if len(labels_in) >= 4:
            continue
        
        # Need to pad options
        existing_opts = re.findall(r'\{\s*label:\s*"([A-D])"\s*,\s*text:\s*`([^`]*)`\s*\}', opt_text, re.DOTALL)
        if not existing_opts:
            existing_opts = re.findall(r'\{\s*label:\s*"([A-D])".*?text:\s*"([^"]*)"', opt_text, re.DOTALL)
        
        opt_dict = {l: t for l, t in existing_opts}
        all_labels = ['A', 'B', 'C', 'D']
        new_opts_lines = []
        for label in all_labels:
            if label in opt_dict:
                t = opt_dict[label].replace('`', '\\`').replace('${', '\\${')
                new_opts_lines.append(f'      {{ label: "{label}", text: `{t}` }}')
            else:
                new_opts_lines.append(f'      {{ label: "{label}", text: `Not provided` }}')
        
        new_opt_block = 'options: [\n' + ',\n'.join(new_opts_lines) + '\n    ]'
        # Replace old options block
        old_opt_block = block[block.find('options:'):block.find(']', block.find('options:')) + 1] if 'options:' in block else ''
        
        # Better: find the exact span
        start = content.find('options:', content.find(f'id: "{qid}"'))
        if start < 0:
            continue
        # Find the matching closing bracket for options
        depth = 0
        end = start
        for pos in range(start, len(content)):
            if content[pos] == '[':
                depth += 1
            elif content[pos] == ']':
                depth -= 1
                if depth == 0:
                    end = pos + 1
                    break
        
        content = content[:start] + new_opt_block + content[end:]
        fixed += 1
    
    if fixed:
        print(f'  Fixed {fixed} questions with <4 options for {subject}')
    return content

def remove_empty_questions(content, subject):
    """Remove questions with empty question text or no options."""
    blocks = re.split(r'(?=id:\s*")', content)
    removed = 0
    new_blocks = []
    for block in blocks:
        if not block.strip():
            continue
        if not re.search(r'category:\s*"objective"', block):
            new_blocks.append(block)
            continue
        qid_m = re.search(r'id:\s*"([^"]*)"', block)
        qid = qid_m.group(1) if qid_m else '?'
        qm = re.search(r'question:\s*`([^`]*)`', block)
        if not qm:
            qm = re.search(r'question:\s*"([^"]*)"', block)
        qtext = qm.group(1).strip() if qm else ''
        if not qtext or len(qtext) < 5:
            removed += 1
            continue
        opt_m = re.search(r'options:\s*\[(.*?)\]', block, re.DOTALL)
        if opt_m:
            labels = re.findall(r'label:\s*"([A-D])"', opt_m.group(1))
            if len(labels) < 2:
                removed += 1
                continue
        new_blocks.append(block)
    
    if removed:
        print(f'  Removed {removed} empty/illogical questions from {subject}')
    return ' '.join(new_blocks)

def count_per_year(content):
    """Count objective questions per year."""
    counts = defaultdict(int)
    for m in re.finditer(r'year:\s*(\d+).*?category:\s*"objective"', content, re.DOTALL):
        counts[int(m.group(1))] += 1
    return counts

def generate_new_questions(content, subject):
    """For years below TARGET_PER_YEAR, generate new questions using Gemini."""
    counts = count_per_year(content)
    needs = {y: TARGET_PER_YEAR - counts.get(y, 0) for y in YEARS if counts.get(y, 0) < TARGET_PER_YEAR}
    total_needed = sum(needs.values())
    if total_needed <= 0:
        print(f'  All years at {TARGET_PER_YEAR}+ for {subject}')
        return content
    
    print(f'  Need {total_needed} more questions across {len(needs)} years for {subject}')
    
    # Find the position to insert new questions (before the ];
    arr_end = content.rfind('];')
    if arr_end < 0:
        print('  Cannot find array end marker')
        return content
    
    new_entries = []
    for year, needed in sorted(needs.items()):
        if needed <= 0:
            continue
        existing_ids = set(re.findall(r'id:\s*"([^"]*)"', content))
        
        # Generate in batches of 10 per year
        batch_size = min(needed, 10)
        for batch_start in range(0, needed, batch_size):
            actual_batch = min(batch_size, needed - batch_start)
            prompt = f"""You are a JUPEB {subject} exam expert. Generate {actual_batch} new JUPEB-style multiple choice questions for year {year}.
Each must have exactly 4 options (A-D) and be appropriate for JUPEB level examination.
Reply with this EXACT format for each question, one after another:

Q: [question text]
A: [option text]
B: [option text]
C: [option text]
D: [option text]
CA: [correct letter A/B/C/D]

Topics should cover: {subject} syllabus for JUPEB."""
            
            api_key = get_next_key()
            print(f'    Generating {actual_batch} Qs for {year}...', end=' ')
            response = gemini_request(prompt, api_key)
            if not response:
                print('FAILED')
                continue
            
            # Parse generated questions
            q_blocks = re.split(r'\n\s*(?=Q:\s*)', response)
            parsed = 0
            for qb in q_blocks:
                qm = re.search(r'Q:\s*(.*?)(?:\n|$)', qb)
                am = re.search(r'A:\s*(.*?)(?:\n|$)', qb)
                bm = re.search(r'B:\s*(.*?)(?:\n|$)', qb)
                cm = re.search(r'C:\s*(.*?)(?:\n|$)', qb)
                dm = re.search(r'D:\s*(.*?)(?:\n|$)', qb)
                cam = re.search(r'CA:\s*([A-D])', qb)
                if not (qm and am and bm and cm and dm and cam):
                    continue
                
                qt = qm.group(1).strip()
                if len(qt) < 10:
                    continue
                
                # Generate a unique ID
                existing_nums = [int(x.split('-q')[-1]) for x in existing_ids if f'{subject[:3]}-{year}-q' in x]
                next_num = max(existing_nums) + 1 if existing_nums else 1
                qid = f'{subject[:3]}-{year}-q{next_num:04d}'
                while qid in existing_ids:
                    next_num += 1
                    qid = f'{subject[:3]}-{year}-q{next_num:04d}'
                existing_ids.add(qid)
                
                entry = f"""  {{
    id:"{qid}",
    subject:"{subject}",
    year:{year},
    category:"objective",
    question:"{qt.replace('"', '\\"')}",
    options:[
      {{label:"A",text:"{am.group(1).strip().replace('"', '\\"')}"}},
      {{label:"B",text:"{bm.group(1).strip().replace('"', '\\"')}"}},
      {{label:"C",text:"{cm.group(1).strip().replace('"', '\\"')}"}},
      {{label:"D",text:"{dm.group(1).strip().replace('"', '\\"')}"}},
    ],
    correctAnswer:"{cam.group(1)}",
    explanation:"",
    difficulty:"medium",
  }}"""
                new_entries.append(entry)
                parsed += 1
            
            print(f'got {parsed}')
            time.sleep(1)
    
    if new_entries:
        insert_pos = arr_end
        content = content[:insert_pos] + '\n' + '\n'.join(new_entries) + '\n' + content[insert_pos:]
        print(f'  Added {len(new_entries)} new questions total')
    
    return content

def process_subject(subject):
    path = os.path.join(BASE_DIR, f'{subject}.ts')
    if not os.path.exists(path):
        print(f'File not found: {path}')
        return
    
    print(f'\n{"="*60}')
    print(f'Processing {subject}.ts')
    print(f'{"="*60}')
    
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Backup
    bak = path + '.bak4'
    with open(bak, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Backup: {bak}')
    
    # Step 1: Remove empty questions
    content = remove_empty_questions(content, subject)
    
    # Step 2: Fix options to 4
    content = fix_options(content, subject)
    
    # Step 3: Fill missing answers
    content = fill_missing_answers(content, subject)
    
    # Step 4: Generate new questions to reach 50/year
    content = generate_new_questions(content, subject)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Final stats
    ids = len(re.findall(r'id:\s*"', content))
    empty = len(re.findall(r'correctAnswer:\s*""', content))
    opt_blocks = re.findall(r'options:\s*\[(.*?)\]', content, re.DOTALL)
    fewer_4 = sum(1 for ob in opt_blocks if len(re.findall(r'label:\s*"([A-D])"', ob)) < 4)
    years = defaultdict(int)
    for y in re.findall(r'year:\s*(\d+).*?category:\s*"objective"', content, re.DOTALL):
        years[int(y)] += 1
    print(f'\nFinal: {ids} total, {empty} empty CA, {fewer_4} <4 opts')
    print(f'Years: {dict(sorted(years.items()))}')

def main():
    for subject in SUBJECTS:
        process_subject(subject)
    print('\nALL DONE')

if __name__ == '__main__':
    main()
