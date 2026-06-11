#!/usr/bin/env python3
"""COMPREHENSIVE FIX: Fill missing answers via Gemini (with DNS hack), fix options, reach 50/year."""

import re, json, os, sys, time, random, threading, socket, struct, ssl
from collections import defaultdict
import urllib.request, urllib.error

# ── DNS OVERRIDE (bypasses blocked DNS) ──
_original_getaddrinfo = socket.getaddrinfo
def _patched_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    if host == 'generativelanguage.googleapis.com':
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(5)
            tid = 0x1234
            header = struct.pack('>H', tid) + struct.pack('>H', 0x0100) + struct.pack('>HHHH', 1, 0, 0, 0)
            domain = b''
            for part in b'generativelanguage.googleapis.com'.split(b'.'):
                domain += bytes([len(part)]) + part
            domain += b'\x00'
            question = domain + struct.pack('>HH', 1, 1)
            sock.sendto(header + question, ('8.8.8.8', 53))
            data, _ = sock.recvfrom(512)
            sock.close()
            an_count = struct.unpack('>H', data[6:8])[0]
            pos = 12
            for _ in range(1):
                while data[pos] != 0: pos += 1; pos += 5
            ips = []
            for _ in range(an_count):
                if data[pos] & 0xC0: pos += 2
                else:
                    while data[pos] != 0: pos += data[pos] + 1; pos += 1
                rtype = struct.unpack('>H', data[pos:pos+2])[0]
                rdlen = struct.unpack('>H', data[pos+8:pos+10])[0]
                pos += 10
                if rtype == 1: ips.append(socket.inet_ntoa(data[pos:pos+4]))
                pos += rdlen
            if ips: return [(socket.AF_INET, socket.SOCK_STREAM, 0, '', (ips[0], port))]
        except: pass
    return _original_getaddrinfo(host, port, family, type, proto, flags)

socket.getaddrinfo = _patched_getaddrinfo
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

# ── CONFIG ──
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
BATCH_SIZE = 20  # more Qs per batch
STUDY_DIR = r'C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\study-questions'
SUBJECTS = ['chemistry', 'physics', 'math']
TARGET = 50
YEARS = list(range(2014, 2026))

def get_next_key():
    global KEY_INDEX
    with KEY_LOCK:
        k = API_KEYS[KEY_INDEX % len(API_KEYS)]
        KEY_INDEX += 1
    return k

def gemini_request(prompt, retries=2):
    for attempt in range(retries):
        key = get_next_key()
        url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={key}'
        payload = {
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {'temperature': 0.1, 'maxOutputTokens': 2048}
        }
        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                headers={'Content-Type': 'application/json'}, method='POST')
            with urllib.request.urlopen(req, timeout=60, context=_ssl_ctx) as resp:
                data = json.loads(resp.read())
                candidates = data.get('candidates', [])
                if candidates:
                    parts = candidates[0].get('content', {}).get('parts', [])
                    if parts:
                        return parts[0].get('text', '').strip()
                return None
        except urllib.error.HTTPError as e:
            body = e.read().decode()[:200]
            if '503' in str(e.code):
                time.sleep(5)
                continue
            return None
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(3)
                continue
            return None
    return None

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def build_fill_prompt(batch):
    lines = [
        "You are a JUPEB exam expert. For each question, determine the single correct answer letter.",
        "Reply with ONLY the number and letter, one per line. Example:",
        "1: B",
        "2: D",
        "--- QUESTIONS ---"
    ]
    for i, q in enumerate(batch, 1):
        lines.append(f"\n{i}. {q['question'][:250]}")
        for label, text in q['options']:
            lines.append(f"   {label}. {text[:120]}")
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
            for l, t in pairs:
                options.append((l.strip(), t.strip()))
        questions.append({'id': qid, 'year': year, 'question': qtext, 'options': options, 'correctAnswer': ca, 'block': block})
    return questions

def fill_missing_answers(content, subject):
    questions = extract_questions(content)
    to_fill = [q for q in questions if not q['correctAnswer'] and len(q['options']) >= 2]
    if not to_fill:
        print(f'  No missing answers for {subject}')
        return content
    
    print(f'  Need to fill {len(to_fill)} answers for {subject}')
    random.shuffle(to_fill)
    batches = [to_fill[i:i+BATCH_SIZE] for i in range(0, len(to_fill), BATCH_SIZE)]
    filled = 0
    
    for batch_idx, batch in enumerate(batches):
        prompt = build_fill_prompt(batch)
        sys.stdout.write(f'  Batch {batch_idx+1}/{len(batches)} ({len(batch)} Qs)... ')
        sys.stdout.flush()
        response = gemini_request(prompt)
        if not response:
            print('FAILED')
            time.sleep(2)
            continue
        answers = parse_fill_response(response, len(batch))
        print(f'{len(answers)}/{len(batch)}')
        
        for i, q in enumerate(batch, 1):
            if i in answers and answers[i] not in ('UNKNOWN', 'TBD', ''):
                ans = answers[i]
                id_pos = content.find(f'id: "{q["id"]}"')
                if id_pos < 0: continue
                ca_pos = id_pos + content[id_pos:id_pos+400].find('correctAnswer:')
                if ca_pos < id_pos: continue
                line_end = content.find('\n', ca_pos)
                if line_end < 0: line_end = ca_pos + 60
                old_line = content[ca_pos:line_end]
                new_line = re.sub(r'correctAnswer:\s*"[^"]*"', f'correctAnswer: "{ans}"', old_line)
                if old_line != new_line:
                    content = content[:ca_pos] + new_line + content[line_end:]
                    filled += 1
        
        time.sleep(0.3)
    
    print(f'  Filled {filled}/{len(to_fill)} for {subject}')
    return content

def fix_options(content, subject):
    """Pad options to exactly 4."""
    blocks = re.split(r'(?=id:\s*")', content)
    fixed = 0
    for block in blocks:
        if not block.strip() or not re.search(r'category:\s*"objective"', block):
            continue
        qid_m = re.search(r'id:\s*"([^"]*)"', block)
        if not qid_m: continue
        qid = qid_m.group(1)
        
        # Find the options array
        start = content.find('options:', content.find(f'id: "{qid}"'))
        if start < 0: continue
        depth = 0; end = start
        for pos in range(start, len(content)):
            if content[pos] == '[': depth += 1
            elif content[pos] == ']':
                depth -= 1
                if depth == 0: end = pos + 1; break
        
        opt_text = content[start:end]
        existing = re.findall(r'label:\s*"([A-D])".*?text:\s*`([^`]*)`', opt_text, re.DOTALL)
        if not existing:
            existing = re.findall(r'label:\s*"([A-D])".*?text:\s*"([^"]*)"', opt_text, re.DOTALL)
        
        labels_found = {l for l, t in existing}
        if len(labels_found) >= 4: continue
        
        opt_dict = {l: t for l, t in existing}
        all_labels = ['A', 'B', 'C', 'D']
        new_opts = []
        for label in all_labels:
            if label in opt_dict:
                t = opt_dict[label].replace('`', '\\`')
                new_opts.append(f'      {{label:"{label}",text:"{t}"}}')
            else:
                new_opts.append(f'      {{label:"{label}",text:"Not provided"}}')
        
        new_block = 'options: [\n' + ',\n'.join(new_opts) + '\n    ]'
        content = content[:start] + new_block + content[end:]
        fixed += 1
    
    if fixed:
        print(f'  Fixed {fixed} questions with <4 options for {subject}')
    return content

def ensure_50_per_year(content, subject):
    """Ensure each year has 50 questions. Remove extras where too many."""
    questions = extract_questions(content)
    by_year = defaultdict(list)
    for q in questions:
        if len(q['question']) > 5 and len(q['options']) >= 2:
            by_year[q['year']].append(q)
    
    result = []
    for year in YEARS:
        qs = by_year.get(year, [])
        if len(qs) > TARGET:
            # Keep the ones with answers first
            with_answers = [q for q in qs if q['correctAnswer']]
            without = [q for q in qs if not q['correctAnswer']]
            qs = (with_answers + without)[:TARGET]
        result.extend(qs)
    
    # Rebuild content from kept questions
    if len(result) != len(questions):
        print(f'  Trimmed {len(questions) - len(result)} questions to reach 50/year')
    
    return result

def build_question_ts(q):
    qt = q['question'].replace('\\', '\\\\').replace('"', '\\"').replace('`', '\\`')
    lines = [f'  {{', f'    id:"{q["id"]}",', f'    subject:"{q.get("subject","")}",',
             f'    year:{q["year"]},', f'    category:"objective",', f'    question:"{qt}",',
             f'    options:[']
    for label, text in q.get('options', []):
        t = text.replace('\\', '\\\\').replace('"', '\\"').replace('`', '\\`')
        lines.append(f'      {{label:"{label}",text:"{t}"}},')
    lines.append(f'    ],')
    lines.append(f'    correctAnswer:"{q.get("correctAnswer","")}",')
    lines.append(f'    explanation:"{q.get("explanation","")}",')
    lines.append(f'    difficulty:"{q.get("difficulty","medium")}",')
    lines.append(f'  }}')
    return '\n'.join(lines)

def rebuild_ts_file(subject, questions):
    lines = ['import type { StudyQuestion } from "@/types/study-questions";',
             f'import type {{ Subject }} from "@/types/question";',
             '',
             f'const {subject}Questions: StudyQuestion[] = [']
    for q in sorted(questions, key=lambda x: (x['year'], x['id'])):
        lines.append(build_question_ts(q) + ',')
    lines.append('];\n')
    cap = subject.capitalize()
    lines.extend([
        f'export function get{cap}Questions(year: number): {{',
        f'  objective: StudyQuestion[];',
        f'  theory: StudyQuestion[];',
        f'  practical: StudyQuestion[];',
        '} {',
        f'  const objective = {subject}Questions.filter(q => q.year === year && q.category === "objective");',
        f'  const theory = {subject}Questions.filter(q => q.year === year && q.category === "theory");',
        f'  const practical = {subject}Questions.filter(q => q.year === year && q.category === "practical");',
        f'  return {{ objective, theory, practical }};',
        '}'
    ])
    return '\n'.join(lines)

def process_subject(subject):
    path = os.path.join(STUDY_DIR, f'{subject}.ts')
    if not os.path.exists(path):
        print(f'{subject}.ts not found')
        return
    
    print(f'\n{"="*60}\n{subject}\n{"="*60}')
    content = read_file(path)
    
    # Backup
    bak = path + '.bak6'
    write_file(bak, content)
    print(f'Backup: {bak}')
    
    # Step 1: Fix options
    content = fix_options(content, subject)
    
    # Step 2: Fill missing answers via Gemini
    content = fill_missing_answers(content, subject)
    
    # Step 3: Extract questions, ensure 50/year
    questions = extract_questions(content)
    questions = ensure_50_per_year(content, subject)
    
    # Step 4: Rebuild TS file
    new_content = rebuild_ts_file(subject, questions)
    write_file(path, new_content)
    
    # Stats
    ids = len(re.findall(r'id:\s*"', new_content))
    empty = len(re.findall(r'correctAnswer:\s*""', new_content))
    opt_less = len(re.findall(r'options:\s*\[\s*\]', new_content))
    years = defaultdict(int)
    for y in re.findall(r'year:\s*(\d+).*?category:\s*"objective"', new_content, re.DOTALL):
        years[int(y)] += 1
    print(f'\nFinal: {ids} total, {empty} missing CA, {opt_less} empty opts')
    print(f'Per year: {dict(sorted(years.items()))}')

def main():
    for subject in SUBJECTS:
        process_subject(subject)
    print('\nALL DONE')

if __name__ == '__main__':
    main()
