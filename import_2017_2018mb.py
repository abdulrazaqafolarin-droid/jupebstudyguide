import json, re, sys
from urllib.request import Request, urlopen
import urllib.request, ssl

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
BASE = "https://gzyczowqqywesqhqqpdi.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjQ0ODUsImV4cCI6MjA5NDQ0MDQ4NX0.8cz4O0Bh4eZNTGkqX11_OLgz8zwS4yTIWMJ4HbhxZ5c"
body = json.dumps({"email":"abdulrazaqafolarin@gmail.com","password":"folarin21","gotrue_meta_security":{}}).encode()
req = Request(f"{BASE}/auth/v1/token?grant_type=password", data=body, headers={"apikey":ANON_KEY,"Content-Type":"application/json"})
TOKEN = json.loads(urlopen(req, context=ctx).read().decode())['access_token']
def sg(p):
    req = Request(f"{BASE}{p}", headers={"Authorization":f"Bearer {TOKEN}","apikey":ANON_KEY})
    return json.loads(urlopen(req, context=ctx).read().decode())
def spatch(p, d):
    body = json.dumps(d).encode()
    req = Request(f"{BASE}{p}", data=body, method="PATCH", headers={"Authorization":f"Bearer {TOKEN}","apikey":ANON_KEY,"Content-Type":"application/json"})
    with urlopen(req, context=ctx) as r: return r.getcode()

with open(r'C:\Users\HP\Downloads\2017 2018 phy and chem.txt', 'r', encoding='utf-8') as f:
    t = f.read()

# Find ALL text between section headers and extract JSON
# Strategy: find each section and extract all individual JSON objects
sections = [
    ("2018 Math", "2018 Math Objective"),
    ("2018 Bio", "2018 Biology Objective"),
    ("2017 Math", "2017 Math Objective"),
    ("2017 Bio", "2017 Biology Objective"),
]

all_sections = {}
for label, header in sections:
    idx = t.find(header)
    if idx < 0: continue
    # Find first { after this header
    start = t.find('{', idx)
    if start < 0: continue
    # Find end - next major section or end of meaningful content
    # Look for next section header
    next_idx = len(t)
    for _, h2 in sections:
        if h2 == header: continue
        hidx = t.find(h2, idx + 10)
        if hidx > 0 and hidx < next_idx:
            next_idx = hidx
    content = t[start:next_idx].strip()
    
    # Extract individual JSON objects
    objs = []
    for block in content.split('\n\n'):
        block = block.strip()
        if not block.startswith('{'): continue
        # Fix backslashes 
        fixed = block.replace('\u005c', '\u005c\u005c')
        try:
            objs.append(json.loads(fixed))
        except:
            pass
    all_sections[label] = objs
    print(f"{label}: {len(objs)} items")

# Map to DB subjects/years
mapping = [
    ("2018 Math", "math", 2018),
    ("2018 Bio", "biology", 2018),
    ("2017 Math", "math", 2017),
    ("2017 Bio", "biology", 2017),
]

ok = 0
for skey, subject, year in mapping:
    objs = all_sections.get(skey, [])
    if not objs: continue
    
    db = sg(f"/rest/v1/study_questions?select=id,sort_order&subject=eq.{subject}&year=eq.{year}&category=eq.objective&order=sort_order.asc&limit=200")
    print(f"\n{year} {subject}: DB has {len(db)} rows, file has {len(objs)} items")
    
    for i, item in enumerate(objs):
        if i >= len(db):
            print(f"  ** {i+1} no DB row")
            continue
        update = {}
        if item.get('katexFixed'): update['question'] = item['katexFixed']
        if item.get('optionsFixed') is not None: update['options'] = json.dumps(item['optionsFixed'], ensure_ascii=False)
        if item.get('correctAnswer'): update['correct_answer'] = item['correctAnswer']
        if item.get('topic'): update['course'] = item['topic']
        if item.get('explanation'): update['explanation'] = item['explanation']
        if update:
            try:
                spatch(f"/rest/v1/study_questions?id=eq.{db[i]['id']}", update)
                ok += 1
            except Exception as e:
                print(f"  PATCH error #{i+1}: {e}")
        sys.stdout.write(f"\r  {skey} #{i+1}/{len(objs)} ({ok} total)")
        sys.stdout.flush()

print(f"\nTotal imported: {ok}")
