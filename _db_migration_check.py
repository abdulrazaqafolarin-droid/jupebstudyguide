"""Check which migrations were applied and verify RLS policies"""

import http.client
import json

SUPABASE_URL = "gzyczowqqywesqhqqpdi.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM"
HEADERS = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}

def get(path):
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=10)
    conn.request("GET", path, headers=HEADERS)
    resp = conn.getresponse()
    raw = resp.read().decode()
    conn.close()
    return resp.status, raw

# 1. Check if migrations table exists
for tbl in ["_migrations", "schema_migrations", "supabase_migrations", "_supabase_migrations"]:
    status, raw = get(f"/rest/v1/{tbl}?limit=1")
    found = status == 200
    print(f"[{'OK' if found else 'NO'}] {tbl}" + (f" data: {raw[:200]}" if found else ""))

# 2. Check columns that matter for the divergence
checks = [
    ("profiles.privacy_avatar", "/rest/v1/profiles?select=privacy_avatar&limit=1"),
    ("profiles.privacy_profile", "/rest/v1/profiles?select=privacy_profile&limit=1"),
    ("profiles.bio", "/rest/v1/profiles?select=bio&limit=1"),
    ("profiles.achievements", "/rest/v1/profiles?select=achievements&limit=1"),
    ("profiles.is_activated", "/rest/v1/profiles?select=is_activated&limit=1"),
    ("profiles.is_admin", "/rest/v1/profiles?select=is_admin&limit=1"),
    ("score_events user_id", "/rest/v1/score_events?select=user_id&limit=1"),
    ("score_events amount", "/rest/v1/score_events?select=amount&limit=1"),
    ("score_events reason", "/rest/v1/score_events?select=reason&limit=1"),
    ("score_events created_at", "/rest/v1/score_events?select=created_at&limit=1"),
    ("leaderboard_weeks", "/rest/v1/leaderboard_weeks?select=*&limit=1"),
    ("activation_codes", "/rest/v1/activation_codes?select=code&limit=1"),
]
print("\n=== Column/Table checks ===")
for label, path in checks:
    status, raw = get(path)
    print(f"  [{status}] {label}: {'OK' if status == 200 else raw[:80]}")

# 3. Check if activation RPC exists
def check_rpc(name, body):
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=10)
    conn.request("POST", f"/rest/v1/rpc/{name}",
        body=json.dumps(body),
        headers={**HEADERS, "Content-Type": "application/json"})
    resp = conn.getresponse()
    raw = resp.read().decode()
    conn.close()
    return resp.status, raw[:200]

print("\n=== RPC functions ===")
for name, body in [
    ("consume_activation_code", {"p_code": "TEST", "p_user_id": "00000000-0000-0000-0000-000000000000"}),
    ("generate_activation_codes", {"p_created_by": "00000000-0000-0000-0000-000000000000", "p_count": 1}),
    ("get_friends", {"user_id": "00000000-0000-0000-0000-000000000000"}),
    ("get_mutual_friends", {"user_a": "00000000-0000-0000-0000-000000000000", "user_b": "00000000-0000-0000-0000-000000000000"}),
]:
    status, raw = check_rpc(name, body)
    exists = status != 404
    print(f"  [{status}] {name}: {'EXISTS' if exists else 'MISSING'}" + (f" {raw}" if not exists else ""))

# 4. Check the current profile data for a reality check
print("\n=== Current profiles ===")
status, raw = get("/rest/v1/profiles?select=id,user_id,display_name,is_activated,is_admin&order=created_at.desc")
if status == 200:
    profiles = json.loads(raw)
    for p in profiles:
        print(f"  {p.get('display_name','?'):30s} activated={p.get('is_activated', '?')} admin={p.get('is_admin', '?')}")
else:
    print(f"  ERROR: {raw[:100]}")
