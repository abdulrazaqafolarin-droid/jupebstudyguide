import json, urllib.request, ssl, sys

with open(r'C:\Users\HP\Downloads\2015 math and bio.txt', 'r', encoding='utf-8') as f:
    text = f.read()

bio_idx = text.find('\n**BIOLOGY')
math_raw = text[text.find('{', text.find('MATH')):bio_idx].strip()
bio_part = text[bio_idx:]; bio_raw = bio_part[bio_part.find('{'):].strip()

def parse(section):
    objs = []
    for block in section.split('\n\n'):
        block = block.strip()
        if not block.startswith('{'): continue
        # JSON in the file has unescaped backslashes like \begin{vmatrix}
        # Valid JSON requires \\begin{vmatrix}
        fixed = block.replace(chr(92), chr(92) + chr(92))
        try:
            objs.append(json.loads(fixed))
        except:
            pass
    return objs

math_objs = parse(math_raw)
bio_objs = parse(bio_raw)
print(f"Math: {len(math_objs)}, Bio: {len(bio_objs)}")

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
BASE = "https://gzyczowqqywesqhqqpdi.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjQ0ODUsImV4cCI6MjA5NDQ0MDQ4NX0.8cz4O0Bh4eZNTGkqX11_OLgz8zwS4yTIWMJ4HbhxZ5c"
body = json.dumps({"email":"abdulrazaqafolarin@gmail.com","password":"folarin21","gotrue_meta_security":{}}).encode()
req = urllib.request.Request(f"{BASE}/auth/v1/token?grant_type=password", data=body, headers={"apikey":ANON_KEY,"Content-Type":"application/json"})
TOKEN = json.loads(urllib.request.urlopen(req, context=ctx).read().decode())['access_token']
def sg(p):
    req = urllib.request.Request(f"{BASE}{p}", headers={"Authorization":f"Bearer {TOKEN}","apikey":ANON_KEY})
    return json.loads(urllib.request.urlopen(req, context=ctx).read().decode())
def spatch(p, d):
    body = json.dumps(d).encode()
    req = urllib.request.Request(f"{BASE}{p}", data=body, method="PATCH", headers={"Authorization":f"Bearer {TOKEN}","apikey":ANON_KEY,"Content-Type":"application/json"})
    with urllib.request.urlopen(req, context=ctx) as r: return r.getcode()

math_db = sg("/rest/v1/study_questions?select=id,sort_order&subject=eq.math&year=eq.2015&category=eq.objective&order=sort_order.asc&limit=100")
bio_db = sg("/rest/v1/study_questions?select=id,sort_order&subject=eq.biology&year=eq.2015&category=eq.objective&order=sort_order.asc&limit=100")
print(f"DB: Math {len(math_db)}, Bio {len(bio_db)}")

ok = 0
for objs, db, label in [(math_objs, math_db, "Math"), (bio_objs, bio_db, "Bio")]:
    for i, item in enumerate(objs):
        if i >= len(db):
            print(f"\n{label} #{i+1} no DB row (only {len(db)} rows)")
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
                print(f"\nPATCH error #{i+1}: {e}")
        sys.stdout.write(f"\r{label} #{i+1}/{len(objs)} ({ok} total)")
        sys.stdout.flush()

print(f"\nTotal imported: {ok}")
