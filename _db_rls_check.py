import http.client, json

SUPABASE_URL = "gzyczowqqywesqhqqpdi.supabase.co"
ANON_KEY = "sb_publishable_jbVlP7sXJ3TmGM-njwZ2Jw_KN2yUEt1"
# Try anonymous-level access to check RLS
print("=== ANON KEY ACCESS ===")
conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=10)
HEADERS = {"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"}

# score_events
conn.request("GET", "/rest/v1/score_events?select=user_id,amount&limit=3", headers=HEADERS)
resp = conn.getresponse()
raw = resp.read().decode()
print(f"score_events anon: {resp.status}")
if resp.status == 200:
    d = json.loads(raw)
    print(f"  count={len(d)}")
else:
    print(f"  error: {raw[:100]}")

# profiles  
conn.request("GET", "/rest/v1/profiles?select=user_id,display_name,avatar_url&limit=3", headers=HEADERS)
resp = conn.getresponse()
raw = resp.read().decode()
print(f"profiles anon: {resp.status}")
if resp.status == 200:
    d = json.loads(raw)
    print(f"  count={len(d)}")
else:
    print(f"  error: {raw[:100]}")

conn.close()
