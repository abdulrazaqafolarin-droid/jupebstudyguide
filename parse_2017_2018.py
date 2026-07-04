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

# Find ALL ```json blocks - there should be 4
blocks = list(re.finditer(r'```json\s*([\s\S]*?)```', t))
print(f"Found {len(blocks)} code blocks")

sections_data = []
for m in blocks:
    raw = m.group(1).strip()
    # Fix backslashes globally
    out = []
    in_str = False; esc = False
    for c in raw:
        if esc:
            out.append('\u005c' + c); esc = False; continue
        if c == '\u005c' and in_str:
            esc = True; continue
        if c == '"':
            in_str = not in_str
        out.append(c)
    fixed = ''.join(out)
    try:
        data = json.loads(fixed)
        if isinstance(data, list):
            sections_data.append(data)
            print(f"  Parsed: {len(data)} items")
    except json.JSONDecodeError as e:
        print(f"  Parse error: {e}")

print(f"\nParsed {len(sections_data)} sections total")
for i, d in enumerate(sections_data):
    if d:
        print(f"  Section {i+1}: {len(d)} items, first topic: {d[0].get('topic','?')}")

# Map them by position: 2018 Math, 2018 Bio, 2017 Math, 2017 Bio
# But we only have 2 sections. Let me look at the file structure again.
# Actually the issue is the regex - the content between ```json and ``` might be split across multiple blocks
# due to some content containing ``` markers.
# Let me look at the raw text between sections

# Find what sections exist by looking for "**" headers
for line in t.split('\n'):
    s = line.strip().strip('*')
    if 'Objective' in s or s.startswith('Here is'):
        print(f"  Header: {line.strip()}")
PYEOF