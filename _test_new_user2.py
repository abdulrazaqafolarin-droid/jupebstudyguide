"""Test new user flow with CORRECT anon key"""
import http.client, json

PROJECT = "gzyczowqqywesqhqqpdi"
SUPABASE_URL = f"{PROJECT}.supabase.co"
ANON_KEY = "sb_publishable_GVQs-O9yijr0XIbB6cVvEw_pvQyFXbX"
SVC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM"
ANON_HEADERS = {"apikey": ANON_KEY, "Content-Type": "application/json"}
SVC_HEADERS = {"apikey": SVC_KEY, "Authorization": f"Bearer {SVC_KEY}", "Content-Type": "application/json"}

# Verify anon key
conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=10)
conn.request("GET", "/rest/v1/profiles?select=count&limit=0",
    headers={"apikey": ANON_KEY, "Authorization": f"Bearer {ANON_KEY}"})
resp = conn.getresponse()
raw = resp.read().decode()
print(f"Anon key test: {resp.status} {raw[:200]}")
conn.close()

import random, string
email = f"test_{''.join(random.choices(string.ascii_lowercase, k=6))}@example.com"
password = "Test123456!"
print(f"\nCreating user: {email} / {password}")

conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=30)
conn.request("POST", "/auth/v1/signup",
    body=json.dumps({"email": email, "password": password, "data": {"display_name": email.split('@')[0]}}),
    headers=ANON_HEADERS)
resp = conn.getresponse()
raw = resp.read().decode()
print(f"Signup: {resp.status} {raw[:300]}")
conn.close()

data = json.loads(raw)
access_token = data.get("access_token")
user_id = data.get("user", {}).get("id")

if access_token and user_id:
    AUTH = {"apikey": ANON_KEY, "Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    tests = [
        ("Profile query (useProfile)", "/rest/v1/profiles?select=id,user_id,display_name,avatar_url,bio,privacy_avatar,privacy_profile,achievements&user_id=eq." + user_id),
        ("Activation check", "/rest/v1/profiles?select=is_activated,is_admin&user_id=eq." + user_id),
        ("Score events", "/rest/v1/score_events?select=user_id,amount&limit=5"),
        ("Leaderboard profiles", "/rest/v1/profiles?select=user_id,display_name,avatar_url,achievements&limit=5"),
        ("Leaderboard weeks", "/rest/v1/leaderboard_weeks?select=*&limit=1"),
    ]
    for label, path in tests:
        conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=10)
        conn.request("GET", path, headers=AUTH)
        resp = conn.getresponse()
        raw = resp.read().decode()
        preview = raw[:150]
        print(f"  [{resp.status}] {label}: {preview}")
        conn.close()

    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=10)
    conn.request("POST", "/rest/v1/rpc/consume_activation_code",
        body=json.dumps({"p_code": "7C84-411D-38C1", "p_user_id": user_id}),
        headers={"apikey": ANON_KEY, "Content-Type": "application/json"})
    resp = conn.getresponse()
    raw = resp.read().decode()
    print(f"  Activation (no auth): {resp.status} {raw[:200]}")
    conn.close()

    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=10)
    conn.request("POST", "/rest/v1/rpc/consume_activation_code",
        body=json.dumps({"p_code": "7C84-411D-38C1", "p_user_id": user_id}),
        headers={**AUTH})
    resp = conn.getresponse()
    raw = resp.read().decode()
    print(f"  Activation (auth): {resp.status} {raw[:200]}")
    conn.close()

print(f"\nTest user: {email} / {password}")
