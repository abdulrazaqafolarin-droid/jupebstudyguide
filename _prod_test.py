import http.client, json

PROJECT = "gzyczowqqywesqhqqpdi"
SUPABASE_URL = f"{PROJECT}.supabase.co"
ANON_KEY = "sb_publishable_GVQs-O9yijr0XIbB6cVvEw_pvQyFXbX"
SVC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM"
PAT = "sbp_6684aea8d5150698467be84d3f21c5f9d6f3f471"
ADMIN_UID = "a85b42f0-4b7d-46d9-b409-57ec9b14062e"

def q(sql):
    conn = http.client.HTTPSConnection("api.supabase.com", timeout=30)
    conn.request("POST", f"/v1/projects/{PROJECT}/database/query",
        body=json.dumps({"query": sql}),
        headers={"Authorization": f"Bearer {PAT}", "Content-Type": "application/json"})
    resp = conn.getresponse()
    raw = resp.read().decode()
    conn.close()
    if resp.status == 201: return json.loads(raw)
    print(f"SQL ERROR({resp.status}): {raw[:200]}")
    return None

# Step 1: Reload PostgREST schema cache
print("=== STEP 1: Reload PostgREST schema cache ===")
q("NOTIFY pgrst, 'reload schema'")
print("  Schema cache reload triggered")

# Step 2: Verify all functions exist and have correct grants
print("\n=== STEP 2: Function grants ===")
grants = q("""
    SELECT n.nspname as schema, p.proname, 
           pg_catalog.pg_get_function_result(p.oid) as result_type,
           CASE WHEN p.prosecdef THEN 'SECURITY_DEFINER' ELSE 'SECURITY_INVOKER' END as security,
           (SELECT proconfig FROM pg_proc WHERE oid = p.oid) as config
    FROM pg_proc p 
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_admin_dashboard_stats', 'generate_activation_codes', 'consume_activation_code')
    ORDER BY p.proname
""")
for g in grants or []:
    config = g.get('config') or []
    print(f"  {g['proname']}: sec={g['security']} result={g['result_type']} cfg={config}")

# Step 3: Test as admin via REST with fresh bearer token
print("\n=== STEP 3: Test RPCs via REST as admin ===")
# Login
conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
conn.request("POST", "/auth/v1/token?grant_type=password",
    body=json.dumps({"email": "abdulrazaqafolarin@gmail.com", "password": "Godson0813?"}),
    headers={"apikey": ANON_KEY, "Content-Type": "application/json"})
resp = conn.getresponse()
raw = resp.read().decode()
conn.close()

if resp.status == 200:
    token = json.loads(raw).get('access_token', '')
    print(f"  Login OK, token prefix: {token[:20]}...")
    
    # Test get_admin_dashboard_stats
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
    conn.request("POST", "/rest/v1/rpc/get_admin_dashboard_stats",
        body="{}",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    resp = conn.getresponse()
    raw = resp.read().decode()
    conn.close()
    print(f"  get_admin_dashboard_stats: {resp.status}")
    if resp.status == 200:
        data = json.loads(raw)
        print(f"    total_users={data.get('total_users')}, activated={data.get('activated_users')}")
        print(f"    total_codes={data.get('total_codes')}, used={data.get('used_codes')}")
        print(f"    signups={len(data.get('recent_signups',[]))} days")
        print(f"    plans={data.get('plan_distribution')}")
    else:
        print(f"    ERROR: {raw[:200]}")
    
    # Test generate_activation_codes
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
    conn.request("POST", "/rest/v1/rpc/generate_activation_codes",
        body=json.dumps({"p_created_by": ADMIN_UID, "p_count": 1, "p_plan_type": "basic"}),
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    resp = conn.getresponse()
    raw = resp.read().decode()
    conn.close()
    print(f"  generate_activation_codes: {resp.status}")
    if resp.status == 200:
        codes = json.loads(raw)
        print(f"    Generated: {codes}")
        for c in codes:
            if c.get('code'):
                q(f"DELETE FROM public.activation_codes WHERE code = '{c['code']}'")
    else:
        print(f"    ERROR: {raw[:200]}")
else:
    print(f"  Login FAILED: {raw[:100]}")
    print("  (This means we don't know the admin password)")
    
    # Try with service key - just check if REST can find the function
    print("\n  Testing REST availability with service key:")
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
    conn.request("POST", "/rest/v1/rpc/get_admin_dashboard_stats",
        body="{}",
        headers={"apikey": SVC_KEY, "Authorization": f"Bearer {SVC_KEY}", "Content-Type": "application/json"})
    resp = conn.getresponse()
    raw = resp.read().decode()
    conn.close()
    print(f"    get_admin_dashboard_stats via service key: {resp.status}")
    if resp.status != 200:
        print(f"    ERROR: {raw[:200]}")
    
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
    conn.request("POST", "/rest/v1/rpc/generate_activation_codes",
        body=json.dumps({"p_created_by": ADMIN_UID, "p_count": 1, "p_plan_type": "basic"}),
        headers={"apikey": SVC_KEY, "Authorization": f"Bearer {SVC_KEY}", "Content-Type": "application/json"})
    resp = conn.getresponse()
    raw = resp.read().decode()
    conn.close()
    print(f"    generate_activation_codes via service key: {resp.status}")
    if resp.status == 200:
        codes = json.loads(raw)
        print(f"    Generated: {codes}")
        for c in codes:
            if c.get('code'):
                q(f"DELETE FROM public.activation_codes WHERE code = '{c['code']}'")
    else:
        print(f"    ERROR: {raw[:200]}")
