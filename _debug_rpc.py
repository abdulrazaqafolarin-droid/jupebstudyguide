import http.client, json

PROJECT = "gzyczowqqywesqhqqpdi"
SUPABASE_URL = f"{PROJECT}.supabase.co"
ANON_KEY = "sb_publishable_GVQs-O9yijr0XIbB6cVvEw_pvQyFXbX"
SVC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM"
PAT = "sbp_6684aea8d5150698467be84d3f21c5f9d6f3f471"
ADMIN_UID = "a85b42f0-4b7d-46d9-b409-57ec9b14062e"
ADMIN_EMAIL = "abdulrazaqafolarin@gmail.com"

# 1. Force reload PostgREST schema via management API
print("=== FORCE SCHEMA CACHE RELOAD ===")
conn = http.client.HTTPSConnection("api.supabase.com", timeout=30)
conn.request("POST", f"/v1/projects/{PROJECT}/database/schema-cache",
    body="{}",
    headers={"Authorization": f"Bearer {PAT}", "Content-Type": "application/json"})
resp = conn.getresponse()
raw = resp.read().decode()
conn.close()
print(f"  Schema cache reload: {resp.status}")

# 2. Check OpenAPI for available RPCs
print("\n=== CHECK OPENAPI FOR RPCs ===")
conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
conn.request("GET", "/rest/v1/rpc/",
    headers={"apikey": ANON_KEY, "Accept": "application/json"})
resp = conn.getresponse()
raw = resp.read().decode()
conn.close()
if resp.status == 200:
    data = json.loads(raw)
    rpcs = [k for k in data.keys() if k in ('get_admin_dashboard_stats', 'generate_activation_codes', 'consume_activation_code')]
    print(f"  RPCs found in OpenAPI: {rpcs}")
else:
    print(f"  OpenAPI check: {resp.status}")

# 3. Try calling as anon (should fail - needs auth)
print("\n=== CALL AS ANON (expect failure) ===")
conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
conn.request("POST", "/rest/v1/rpc/get_admin_dashboard_stats",
    body="{}",
    headers={"apikey": ANON_KEY, "Content-Type": "application/json"})
resp = conn.getresponse()
raw = resp.read().decode()
conn.close()
print(f"  Anon get_admin_dashboard_stats: {resp.status} - {raw[:100]}")

# 4. Try with a VALID JWT - create a temp user, set admin, test
print("\n=== CREATE TEMP ADMIN USER & TEST ===")
import random, string
test_email = f"admt_{''.join(random.choices(string.ascii_lowercase, k=5))}@example.com"
test_pass = "TestPass123!"

# Create user via admin API
conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
conn.request("POST", "/auth/v1/admin/users",
    body=json.dumps({"email": test_email, "password": test_pass, "email_confirm": True, "user_metadata": {"display_name": "tempadmin"}}),
    headers={"apikey": SVC_KEY, "Authorization": f"Bearer {SVC_KEY}", "Content-Type": "application/json"})
resp = conn.getresponse()
raw = resp.read().decode()
conn.close()
print(f"  Create temp user: {resp.status}")

if resp.status in (200, 201):
    new_id = json.loads(raw).get('id')
    print(f"  New user ID: {new_id}")
    
    # Set as admin in profiles
    # Check if profile was created by handle_new_user trigger
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
    conn.request("GET", f"/rest/v1/profiles?select=user_id,is_admin,display_name&user_id=eq.{new_id}",
        headers={"apikey": SVC_KEY, "Authorization": f"Bearer {SVC_KEY}"})
    resp = conn.getresponse()
    raw = resp.read().decode()
    conn.close()
    print(f"  Profile check: {resp.status} - {raw[:200]}")
    
    if resp.status == 200:
        prof = json.loads(raw)
        print(f"  Profile: {prof}")
        
        if len(prof) == 0:
            print("  NO PROFILE - creating one manually")
            conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
            conn.request("POST", "/rest/v1/profiles",
                body=json.dumps({"user_id": new_id, "display_name": "tempadmin", "is_admin": True}),
                headers={"apikey": SVC_KEY, "Authorization": f"Bearer {SVC_KEY}", "Content-Type": "application/json"})
            resp = conn.getresponse()
            raw = resp.read().decode()
            conn.close()
            print(f"  Manual profile create: {resp.status}")
        else:
            # Update to admin
            if not prof[0].get('is_admin'):
                conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
                conn.request("PATCH", f"/rest/v1/profiles?user_id=eq.{new_id}",
                    body=json.dumps({"is_admin": True}),
                    headers={"apikey": SVC_KEY, "Authorization": f"Bearer {SVC_KEY}", "Content-Type": "application/json"})
                resp = conn.getresponse()
                raw = resp.read().decode()
                conn.close()
                print(f"  Set admin: {resp.status}")
    
    # Now login as this user
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
    conn.request("POST", "/auth/v1/token?grant_type=password",
        body=json.dumps({"email": test_email, "password": test_pass}),
        headers={"apikey": ANON_KEY, "Content-Type": "application/json"})
    resp = conn.getresponse()
    raw = conn.read().decode()
    conn.close()
    
    if resp.status == 200:
        user_token = json.loads(raw).get('access_token', '')
        print(f"  Logged in, token: {user_token[:20]}...")
        
        # Test get_admin_dashboard_stats
        conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
        conn.request("POST", "/rest/v1/rpc/get_admin_dashboard_stats",
            body="{}",
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {user_token}", "Content-Type": "application/json"})
        resp = conn.getresponse()
        raw = resp.read().decode()
        conn.close()
        print(f"  Dashboard RPC: {resp.status}")
        if resp.status == 200:
            data = json.loads(raw)
            print(f"    total_users={data.get('total_users')}, codes={data.get('total_codes')}")
        else:
            print(f"    ERROR: {raw[:200]}")
        
        # Test generate_activation_codes
        conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
        conn.request("POST", "/rest/v1/rpc/generate_activation_codes",
            body=json.dumps({"p_created_by": new_id, "p_count": 1, "p_plan_type": "basic"}),
            headers={"apikey": ANON_KEY, "Authorization": f"Bearer {user_token}", "Content-Type": "application/json"})
        resp = conn.getresponse()
        raw = resp.read().decode()
        conn.close()
        print(f"  Generate RPC: {resp.status}")
        if resp.status == 200:
            codes = json.loads(raw)
            print(f"    Generated: {codes}")
        else:
            print(f"    ERROR: {raw[:200]}")
    else:
        print(f"  Login failed: {raw[:100]}")
    
    # Cleanup user
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
    conn.request("DELETE", f"/auth/v1/admin/users/{new_id}",
        headers={"apikey": SVC_KEY, "Authorization": f"Bearer {SVC_KEY}"})
    conn.close()
    print("  Temp user cleaned up")
else:
    print(f"  Failed to create user: {raw[:200]}")
