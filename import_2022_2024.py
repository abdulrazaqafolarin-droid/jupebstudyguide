import json, re, sys
from urllib.request import Request, urlopen
import ssl

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

with open(r'C:\Users\HP\Downloads\2022 math and bio 2024 bio.txt', 'r', encoding='utf-8') as f:
    t = f.read()

m = re.search(r'```json\s*([\s\S]*?)```', t)
raw = m.group(1)
out = []; ins = False; esc = False
for c in raw:
    if esc:
        out.append('\\' + c); esc = False; continue
    if c == '\\' and ins:
        esc = True; continue
    if c == '"':
        ins = not ins
    out.append(c)
data = json.loads(''.join(out))

mth = [i for i in data if i.get('topic','').startswith('mth-')]
all_bio = [i for i in data if i.get('topic','').startswith('bio-')]

# First 45 bio = 2022, remaining = 2024
# Based on order in the JSON array
bio_positions = [i for i, item in enumerate(data) if item.get('topic','').startswith('bio-')]
mid = len(all_bio) // 2  # Try 50/20 split
# Actually check DB sizes
db_2022_bio = sg("/rest/v1/study_questions?select=id&subject=eq.biology&year=eq.2022&category=eq.objective&limit=200")
db_2024_bio = sg("/rest/v1/study_questions?select=id&subject=eq.biology&year=eq.2024&category=eq.objective&limit=200")
print(f"2022 Bio obj DB: {len(db_2022_bio)}, 2024 Bio obj DB: {len(db_2024_bio)}")

# Try all 70 bio as 2022 first (max 60), then see what's left for 2024
# Or try first N as 2022 and rest as 2024
# Let me just check: does the array put all bio items together or interleaved?

first_bio = next(i for i, item in enumerate(data) if item.get('topic','').startswith('bio-'))
last_bio = max(i for i, item in enumerate(data) if item.get('topic','').startswith('bio-'))
print(f"First bio at index {first_bio}, last at {last_bio}")

# Check what's before and after bio section
print(f"Items before first bio: {first_bio}")
print(f"Items after last bio: {len(data) - last_bio - 1}")

# It seems mth items are first (indices 0-44), then bio items (45-114)
# 70 bio items total
# 2022 bio obj = 50, 2024 bio obj = 50
# So 70 bio items could be: first 50 = 2022, last 20 = 2024 (partial)
bio_2022 = all_bio[:50]
bio_2024 = all_bio[50:]

print(f"Bio 2022: {len(bio_2022)}, Bio 2024: {len(bio_2024)}")

ok = 0
for items, subject, year in [(mth, "math", 2022), (bio_2022, "biology", 2022), (bio_2024, "biology", 2024)]:
    if not items: continue
    db = sg(f"/rest/v1/study_questions?select=id,sort_order&subject=eq.{subject}&year=eq.{year}&category=eq.objective&order=sort_order.asc&limit=200")
    print(f"\n{year} {subject}: DB {len(db)} rows, file {len(items)} items")
    for i, item in enumerate(items):
        if i >= len(db):
            print(f"\n  #{i+1} no DB row")
            continue
        update = {}
        if item.get('katexFixed'): update['question'] = item['katexFixed']
        if item.get('optionsFixed') is not None: update['options'] = json.dumps(item['optionsFixed'], ensure_ascii=False)
        if item.get('correctAnswer'): update['correct_answer'] = item['correctAnswer']
        if item.get('topic'): update['course'] = item['topic']
        if item.get('explanation'): update['explanation'] = item['explanation']
        if update:
            spatch(f"/rest/v1/study_questions?id=eq.{db[i]['id']}", update)
            ok += 1
        sys.stdout.write(f"\r{year} {subject} #{i+1}/{len(items)} ({ok} total)")
        sys.stdout.flush()

print(f"\nTotal imported: {ok}")
