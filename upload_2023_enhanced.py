import json, re, subprocess, sys

with open('2023_math_wrapped.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# LaTeX conversion values — these are Python strings with *one* backslash
# (which json.dumps will escape to two backslashes in JSON output)
UNICODE_MAP = {
    '\u00B2': '^{2}',
    '\u00B3': '^{3}',
    '\u00B9': '^{1}',
    '\u00BD': '\\frac{1}{2}',
    '\u00BE': '\\frac{3}{4}',
    '\u00BC': '\\frac{1}{4}',
    '\u2229': '\\cap',
    '\u222A': '\\cup',
    '\u2264': '\\leq',
    '\u2265': '\\geq',
    '\u2260': '\\neq',
    '\u2248': '\\approx',
    '\u00D7': '\\times',
    '\u00F7': '\\div',
    '\u00B1': '\\pm',
    '\u03C0': '\\pi',
    '\u03B8': '\\theta',
    '\u0394': '\\Delta',
    '\u03A3': '\\Sigma',
    '\u221E': '\\infty',
}
U_PAT = '|'.join(re.escape(c) for c in UNICODE_MAP)

def convert_inside(text):
    """Convert Unicode math and fractions inside a $...$ block."""
    # Convert Unicode to LaTeX
    text = re.sub(U_PAT, lambda m: UNICODE_MAP[m.group(0)], text)
    # Convert digit/digit to \frac{digit}{digit} using lambda to avoid escaping issues
    text = re.sub(r'(\d+)/(\d+)', lambda m: '\\frac{' + m.group(1) + '}{' + m.group(2) + '}', text)
    return text

converted = 0
for q in data:
    for o in q['options']:
        txt = o['text']
        if not (txt.startswith('$') and txt.endswith('$') and len(txt) > 2):
            continue
        inner = txt[1:-1]
        inner_new = convert_inside(inner)
        # Check if anything changed AND new content has LaTeX commands (to trigger alreadyProcessed)
        if inner_new != inner:
            o['text'] = '$' + inner_new + '$'
            converted += 1

print(f'Enhanced {converted} options')

# Show a few samples
for q in data[:3]:
    for o in q['options']:
        print(f"  {q['number']}{o['label']}: {o['text'][:80]}")

# Upload
token = 'sbp_ba1d83d867ec6847b0f65e9658ae83cb3d5f77d2'
api = 'https://api.supabase.com/v1/projects/gzyczowqqywesqhqqpdi/database/query'

subprocess.run(['curl', '-s', api, '-H', f'Authorization: Bearer {token}', '-H', 'Content-Type: application/json',
    '-d', json.dumps({'query': "DELETE FROM study_questions WHERE subject = 'math' AND year = 2023 AND category = 'objective';"})], timeout=30)

for i in range(0, len(data), 25):
    chunk = data[i:i+25]
    rows = []
    for q in chunk:
        qid = q['id']
        qtext = q['question'].replace("'", "''")
        opts = json.dumps(q['options'], ensure_ascii=False).replace("'", "''")
        correct = q['correct_answer'].replace("'", "''")
        rows.append(f"('{qid}', 'math', 2023, 'objective', '{qtext}', '{opts}'::jsonb, '{correct}', 'medium', 0, false, '')")
    sql = 'INSERT INTO study_questions (id, subject, year, category, question, options, correct_answer, difficulty, sort_order, hidden, explanation) VALUES ' + ','.join(rows)
    result = subprocess.run(['curl', '-s', api, '-H', f'Authorization: Bearer {token}', '-H', 'Content-Type: application/json',
        '-d', json.dumps({'query': sql})], capture_output=True, text=True, timeout=30)
    out = result.stdout.strip()
    print(f'Batch {i//25+1}: {"OK" if not out or out == "[]" else out[:60]}')

# Verify
sql = "SELECT id, options FROM study_questions WHERE subject = 'math' AND year = 2023 ORDER BY sort_order LIMIT 5;"
result = subprocess.run(['curl', '-s', api, '-H', f'Authorization: Bearer {token}', '-H', 'Content-Type: application/json',
    '-d', json.dumps({'query': sql})], capture_output=True, text=True, timeout=30)
db = json.loads(result.stdout)
need_latex = {'\\\\', '^', '{'}
for q in db:
    opts = [o['text'] for o in q['options']]
    has = any(any(c in o for c in need_latex) for o in opts)
    print(f"  {q['id']}: latex_inside={has} opts={opts[:2]}")
print(f'Total: {len(db)} records updated')
