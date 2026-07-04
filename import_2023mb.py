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

with open(r'C:\Users\HP\Downloads\fghjkl;.txt', 'r', encoding='utf-8') as f:
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
print(f"Total: {len(data)}")

mth = [i for i in data if i.get('topic','').startswith('mth-')]
bio = [i for i in data if i.get('topic','').startswith('bio-')]
print(f"Math: {len(mth)}, Bio: {len(bio)}")

ok = 0
for items, subject, year in [(mth, "math", 2023), (bio, "biology", 2023)]:
    db = sg(f"/rest/v1/study_questions?select=id,sort_order&subject=eq.{subject}&year=eq.{year}&category=eq.objective&order=sort_order.asc&limit=200")
    print(f"{year} {subject}: DB {len(db)} rows, file {len(items)} items")
    for i, item in enumerate(items):
        if i >= len(db):
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
        sys.stdout.write(f"\r{subject} #{i+1}/{len(items)} ({ok} total)")
        sys.stdout.flush()
print(f"\nTotal imported: {ok}")
