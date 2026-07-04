import json, re, urllib.request, ssl

with open(r'C:\Users\HP\Downloads\2015 math and bio.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Find preamble to get section headers
# Split into MATH and BIO sections
math_start = text.find('MATH OBJECTIVE')
if math_start < 0: math_start = text.find('Math')
bio_start = text.find('BIOLOGY OBJECTIVE')
if bio_start < 0: bio_start = text.find('Biology')

print(f"Math starts at: {math_start}, Bio starts at: {bio_start}")

# Get Math section (from first { after math_start to before Bio section)
math_section = ""
if math_start >= 0:
    first_brace = text.find('{', math_start)
    if bio_start > math_start:
        math_section = text[first_brace:bio_start]
    else:
        math_section = text[first_brace:]

bio_section = ""
if bio_start >= 0:
    first_brace = text.find('{', bio_start)
    bio_section = text[first_brace:]

print(f"Math section length: {len(math_section)}")
print(f"Bio section length: {len(bio_section)}")

def count_objects(s):
    depth = 0
    count = 0
    for ch in s:
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: count += 1
    return count

print(f"Math objects: {count_objects(math_section)}")
print(f"Bio objects: {count_objects(bio_section)}")

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

def extract_objs(section):
    objs = []
    pos = 0
    while pos < len(section):
        idx = section.find('{', pos)
        if idx < 0: break
        depth = 0
        in_str = False
        esc = False
        for end in range(idx, len(section)):
            ch = section[end]
            if esc: esc = False; continue
            if ch == chr(92) and in_str: esc = True; continue
            if ch == '"': in_str = not in_str; continue
            if in_str: continue
            if ch == '{': depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    raw = section[idx:end+1]
                    try:
                        objs.append(json.loads(raw))
                    except json.JSONDecodeError:
                        fixed = fix_json_string(raw)
                        try:
                            objs.append(json.loads(fixed))
                        except:
                            pass
                    pos = end + 1
                    break
        else:
            break
    return objs

math_objs = extract_objs(math_section)
bio_objs = extract_objs(bio_section)
print(f"\nExtracted: Math {len(math_objs)}, Bio {len(bio_objs)}")

if math_objs:
    print(f"Math first topic: {math_objs[0].get('topic','?')}")
    print(f"Math last topic: {math_objs[-1].get('topic','?')}")
if bio_objs:
    print(f"Bio first topic: {bio_objs[0].get('topic','?')}")
    print(f"Bio last topic: {bio_objs[-1].get('topic','?')}")

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

math_db = sg("/rest/v1/study_questions?select=id,sort_order&subject=eq.math&year=eq.2015&category=eq.objective&order=sort_order.asc&limit=100")
bio_db = sg("/rest/v1/study_questions?select=id,sort_order&subject=eq.biology&year=eq.2015&category=eq.objective&order=sort_order.asc&limit=100")
print(f"\nDB: Math obj {len(math_db)}, Bio obj {len(bio_db)}")

ok = 0
for items, db, label in [(math_objs, math_db, "Math"), (bio_objs, bio_db, "Bio")]:
    for i, item in enumerate(items):
        if i >= len(db): print(f"  SKIP {label} #{i+1}"); continue
        update = {}
        if item.get('katexFixed'): update['question'] = item['katexFixed']
        if item.get('optionsFixed') is not None:
            update['options'] = json.dumps(item['optionsFixed'], ensure_ascii=False)
        if item.get('correctAnswer'): update['correct_answer'] = item['correctAnswer']
        if item.get('topic'): update['course'] = item['topic']
        if item.get('explanation'): update['explanation'] = item['explanation']
        if update: spatch(f"/rest/v1/study_questions?id=eq.{db[i]['id']}", update); ok += 1

print(f"Total imported: {ok}")
