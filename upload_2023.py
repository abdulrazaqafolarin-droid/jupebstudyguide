import json, re, subprocess

with open('2023_math_wrapped.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Clean up remaining issues
for q in data:
    n = q['number']
    
    # Q28: incomplete source — use placeholder
    if n == 28:
        q['question'] = 'Given the table (insufficient data)'
        q['options'] = [{'label': 'A', 'text': ''}, {'label': 'B', 'text': ''}, {'label': 'C', 'text': ''}, {'label': 'D', 'text': ''}]
        q['correct_answer'] = 'A'
        continue
    
    # Clean option text for known issues
    for o in q['options']:
        # Remove trailing notes in parentheses like *(Note: ...)*
        o['text'] = re.sub(r'\s*\*?\(Note:.*', '', o['text']).strip()
        # Remove trailing --- markers
        o['text'] = re.sub(r'\s*---.*', '', o['text']).strip()
        # Remove stray markdown markers
        o['text'] = o['text'].rstrip('*').strip()
        
        # If after cleaning, the option is now a pure number, wrap in $...$
        if not (o['text'].startswith('$') and o['text'].endswith('$')):
            clean = o['text'].strip().strip('.,;:!?')
            if re.match(r'^-?[\d.,\s/]+$', clean):
                o['text'] = '$' + clean + '$'

token = 'sbp_ba1d83d867ec6847b0f65e9658ae83cb3d5f77d2'
api = 'https://api.supabase.com/v1/projects/gzyczowqqywesqhqqpdi/database/query'

# DELETE old 2023 records
sql = "DELETE FROM study_questions WHERE subject = 'math' AND year = 2023 AND category = 'objective';"
result = subprocess.run(['curl', '-s', api,
    '-H', f'Authorization: Bearer {token}',
    '-H', 'Content-Type: application/json',
    '-d', json.dumps({'query': sql})
], capture_output=True, text=True, timeout=15)
print(f'DELETE: {result.stdout[:50]}')

# Build INSERT values
values = []
for q in data:
    qid = q['id']
    question = q['question'].replace("'", "''")
    opts_json = json.dumps(q['options']).replace("'", "''")
    correct = q['correct_answer'].replace("'", "''")
    v = f"('{qid}', 'math', 2023, 'objective', '{question}', '{opts_json}'::jsonb, '{correct}', 'medium', 0, false, '')"
    values.append(v)

# Insert in batches
for i in range(0, len(values), 25):
    chunk = values[i:i+25]
    sql = 'INSERT INTO study_questions (id, subject, year, category, question, options, correct_answer, difficulty, sort_order, hidden, explanation) VALUES ' + ','.join(chunk) + ';'
    result = subprocess.run(['curl', '-s', api,
        '-H', f'Authorization: Bearer {token}',
        '-H', 'Content-Type: application/json',
        '-d', json.dumps({'query': sql})
    ], capture_output=True, text=True, timeout=30)
    out = result.stdout.strip()
    print(f'Batch {i//25+1}: {"OK" if out == "[]" else out[:80]}')

# Verify
import urllib.request, ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjQ0ODUsImV4cCI6MjA5NDQ0MDQ4NX0.8cz4O0Bh4eZNTGkqX11_OLgz8zwS4yTIWMJ4HbhxZ5c'
req = urllib.request.Request(
    f'https://gzyczowqqywesqhqqpdi.supabase.co/rest/v1/study_questions?subject=eq.math&year=eq.2023&select=id',
    headers={'apikey': anon_key, 'Authorization': f'Bearer {anon_key}'}
)
with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
    result = json.loads(resp.read().decode())
    print(f'Verified: {len(result)} records in Supabase')
