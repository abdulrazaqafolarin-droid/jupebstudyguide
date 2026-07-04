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

with open(r'C:\Users\HP\Downloads\2020 2021 math and bio.txt', 'r', encoding='utf-8') as f:
    t = f.read()

blocks = re.findall(r'```json\s*([\s\S]*?)```', t)
print(f"Found {len(blocks)} JSON blocks")

all_items = []
for raw in blocks:
    raw = raw.strip()
    out = []; in_str = False; esc = False
    for c in raw:
        if esc:
            out.append('\\' + c); esc = False; continue
        if c == '\\' and in_str:
            esc = True; continue
        if c == '"':
            in_str = not in_str
        out.append(c)
    try:
        data = json.loads(''.join(out))
        if isinstance(data, list):
            all_items.extend(data)
            print(f"  Parsed {len(data)} items")
    except Exception as e:
        print(f"  Parse error: {e}")

print(f"Total items: {len(all_items)}")

# Separate by topic prefix
math_items = [i for i in all_items if i.get('topic','').startswith('mat-')]
bio_items = [i for i in all_items if i.get('topic','').startswith('bio-')]
print(f"Math: {len(math_items)}, Bio: {len(bio_items)}")

# The file only has 2020 Math + Bio (no 2021 despite filename)
# Let me check by looking at the content before the JSON block
pre = t[:t.find('```json')]
print(f"\nPre-JSON text: {pre[:300]}")

# Determine which years - look for year mentions
for yr in ['2020', '2021']:
    if yr in pre:
        print(f"Mentions {yr}")
