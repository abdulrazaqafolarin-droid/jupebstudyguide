import http.client, json, random, string

PROJECT = "gzyczowqqywesqhqqpdi"
SUPABASE_URL = f"{PROJECT}.supabase.co"
ANON_KEY = "sb_publishable_GVQs-O9yijr0XIbB6cVvEw_pvQyFXbX"
SVC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM"
PAT = "sbp_6684aea8d5150698467be84d3f21c5f9d6f3f471"

test_email = f"adm_{''.join(random.choices(string.ascii_lowercase, k=5))}@example.com"
test_pass = "Test123456!"

def post(path, body, headers):
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
    conn.request("POST", path, body=json.dumps(body), headers=headers)
    resp = conn.getresponse()
    raw = resp.read().decode()
    conn.close()
    return resp.status, raw

def patch(path, body, headers):
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
    conn.request("PATCH", path, body=json.dumps(body), headers=headers)
    resp = conn.getresponse()
    raw = resp.read().decode()
    conn.close()
    return resp.status, raw

def delete(path, headers):
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
    conn.request("DELETE", path, headers=headers)
    resp = conn.getresponse()
    raw = resp.read().decode()
    conn.close()
    return resp.status, raw

def q(sql):
    conn = http.client.HTTPSConnection("api.supabase.com", timeout=15)
    conn.request("POST", f"/v1/projects/{PROJECT}/database/query",
        body=json.dumps({"query": sql}),
        headers={"Authorization": f"Bearer {PAT}", "Content-Type": "application/json"})
    resp = conn.getresponse()
    raw = resp.read().decode()
    conn.close()
    if resp.status == 201: return json.loads(raw)
    return None

# 1. Create user
s, raw = post("/auth/v1/admin/users",
    {"email": test_email, "password": test_pass, "email_confirm": True, "user_metadata": {"display_name": "admtest"}},
    {"apikey": SVC_KEY, "Authorization": f"Bearer {SVC_KEY}", "Content-Type": "application/json"})
print(f"1. Create user: {s}")
if s not in (200, 201):
    print(f"   FAILED: {raw[:200]}")
    exit(1)
new_id = json.loads(raw).get('id')
print(f"   ID: {new_id}")

# 2. Set admin
s, raw = patch(f"/rest/v1/profiles?user_id=eq.{new_id}",
    {"is_admin": True},
    {"apikey": SVC_KEY, "Authorization": f"Bearer {SVC_KEY}", "Content-Type": "application/json"})
print(f"2. Set admin: {s}")

# 3. Login
s, raw = post("/auth/v1/token?grant_type=password",
    {"email": test_email, "password": test_pass},
    {"apikey": ANON_KEY, "Content-Type": "application/json"})
print(f"3. Login: {s}")
if s != 200:
    print(f"   FAILED: {raw[:200]}")
    delete(f"/auth/v1/admin/users/{new_id}", {"apikey": SVC_KEY, "Authorization": f"Bearer {SVC_KEY}"})
    exit(1)
user_token = json.loads(raw).get('access_token', '')
print(f"   Token: {user_token[:30]}...")

# 4. Test dashboard RPC
s, raw = post("/rest/v1/rpc/get_admin_dashboard_stats",
    {},
    {"apikey": ANON_KEY, "Authorization": f"Bearer {user_token}", "Content-Type": "application/json"})
print(f"4. Dashboard RPC: {s}")
if s == 200:
    data = json.loads(raw)
    print(f"   total_users={data.get('total_users')}, activated={data.get('activated_users')}")
    print(f"   total_codes={data.get('total_codes')}, used={data.get('used_codes')}")
    print(f"   plans={data.get('plan_distribution')}")
else:
    print(f"   ERROR: {raw[:200]}")

# 5. Test generate RPC
s, raw = post("/rest/v1/rpc/generate_activation_codes",
    {"p_created_by": new_id, "p_count": 1, "p_plan_type": "basic"},
    {"apikey": ANON_KEY, "Authorization": f"Bearer {user_token}", "Content-Type": "application/json"})
print(f"5. Generate RPC: {s}")
if s == 200:
    codes = json.loads(raw)
    print(f"   Generated: {codes}")
    for c in codes:
        if c.get('code'):
            q(f"DELETE FROM public.activation_codes WHERE code = '{c['code']}'")
else:
    print(f"   ERROR: {raw[:300]}")

# 6. Cleanup
s, raw = delete(f"/auth/v1/admin/users/{new_id}",
    {"apikey": SVC_KEY, "Authorization": f"Bearer {SVC_KEY}"})
print(f"6. Cleanup: {s}")

print("\n=== DONE ===")
