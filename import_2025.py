import json, re, urllib.request, ssl

with open(r'C:\Users\HP\Downloads\2025 chem.txt', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('{')
json_text = text[start:]

# Find all top-level objects by counting braces
depth = 0
obj_ends = []
for i, ch in enumerate(json_text):
    if ch == '{': depth += 1
    elif ch == '}':
        depth -= 1
        if depth == 0:
            obj_ends.append(i)

# Fix invalid JSON escapes (backslashes before LaTeX commands)
def fix_json_string(s):
    result = []
    in_str = False
    esc = False
    i = 0
    while i < len(s):
        ch = s[i]
        if esc:
            if ch in '"\\/bfnrtu':
                result.append(chr(92) + ch)
            elif ch == 'u' and i + 4 < len(s):
                result.append(chr(92) + 'u' + s[i+1:i+5])
                i += 4
            else:
                result.append(chr(92) + chr(92) + ch)
            esc = False
            i += 1
            continue
        if ch == chr(92) and in_str:
            esc = True
            i += 1
            continue
        if ch == '"':
            in_str = not in_str
        result.append(ch)
        i += 1
    return ''.join(result)

objs = []
prev = 0
failures = 0
for end in obj_ends:
    raw = json_text[prev:end+1]
    try:
        objs.append(json.loads(raw))
    except json.JSONDecodeError:
        fixed = fix_json_string(raw)
        try:
            objs.append(json.loads(fixed))
        except json.JSONDecodeError as e:
            failures += 1
    prev = end + 1

print(f"Parsed: {len(objs)} items, {failures} failures")
if objs:
    print(f"First: {(objs[0].get('katexFixed') or '')[:60]}")
    print(f"Last: {(objs[-1].get('katexFixed') or '')[:60]}")

# Import
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
BASE = "https://gzyczowqqywesqhqqpdi.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjQ0ODUsImV4cCI6MjA5NDQ0MDQ4NX0.8cz4O0Bh4eZNTGkqX11_OLgz8zwS4yTIWMJ4HbhxZ5c"
def sp(p, d):
    body = json.dumps(d).encode()
    req = urllib.request.Request(f"{BASE}{p}", data=body, headers={"apikey":ANON_KEY,"Content-Type":"application/json"})
    return json.loads(urllib.request.urlopen(req, context=ctx).read().decode())
TOKEN = sp("/auth/v1/token?grant_type=password", {"email":"abdulrazaqafolarin@gmail.com","password":"folarin21","gotrue_meta_security":{}})['access_token']
def sg(p):
    req = urllib.request.Request(f"{BASE}{p}", headers={"Authorization":f"Bearer {TOKEN}","apikey":ANON_KEY})
    return json.loads(urllib.request.urlopen(req, context=ctx).read().decode())
def spatch(p, d):
    body = json.dumps(d).encode()
    req = urllib.request.Request(f"{BASE}{p}", data=body, method="PATCH", headers={"Authorization":f"Bearer {TOKEN}","apikey":ANON_KEY,"Content-Type":"application/json"})
    with urllib.request.urlopen(req, context=ctx) as r: return r.getcode()

chm_db = sg("/rest/v1/study_questions?select=id,sort_order&subject=eq.chemistry&year=eq.2025&category=eq.objective&order=sort_order.asc&limit=100")
print(f"DB CHM obj: {len(chm_db)}")

ok = 0
for i, item in enumerate(objs):
    if i >= len(chm_db): print(f"  SKIP #{i+1}"); continue
    update = {}
    if item.get('katexFixed'): update['question'] = item['katexFixed']
    if item.get('optionsFixed') is not None:
        update['options'] = json.dumps(item['optionsFixed'], ensure_ascii=False)
    if item.get('correctAnswer'): update['correct_answer'] = item['correctAnswer']
    if item.get('topic'): update['course'] = item['topic']
    if item.get('explanation'): update['explanation'] = item['explanation']
    if update: spatch(f"/rest/v1/study_questions?id=eq.{chm_db[i]['id']}", update); ok += 1

print(f"Imported: {ok}")
