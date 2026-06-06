"""Check RLS policies and handle_new_user trigger - fixed parsing"""
import http.client, json

PAT = "sbp_6684aea8d5150698467be84d3f21c5f9d6f3f471"
PROJECT = "gzyczowqqywesqhqqpdi"

def run_sql(query, label):
    conn = http.client.HTTPSConnection("api.supabase.com", timeout=30)
    conn.request("POST", f"/v1/projects/{PROJECT}/database/query",
        body=json.dumps({"query": query}),
        headers={"Authorization": f"Bearer {PAT}", "Content-Type": "application/json"})
    resp = conn.getresponse()
    raw = resp.read().decode()
    conn.close()
    print(f"\n=== {label} ===")
    if resp.status in (200, 201):
        try:
            data = json.loads(raw)
            if isinstance(data, list):
                for row in data:
                    print(f"  {json.dumps(row)}")
            else:
                print(f"  {raw[:500]}")
        except:
            print(f"  Raw: {raw[:500]}")
    else:
        print(f"  Error {resp.status}: {raw[:300]}")
    return raw

# 1. RLS policies for all relevant tables
run_sql("""
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('profiles', 'score_events', 'leaderboard_weeks', 'achievements')
ORDER BY tablename, policyname
""", "ALL RLS POLICIES")

# 2. Check handle_new_user trigger exists
run_sql("""
SELECT tgname, tgrelid::regclass, tgtype::integer, tgenabled
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created'
""", "TRIGGER CHECK")

# 3. Check handle_new_user function (EXISTS checked)
# Check if auth.users has any triggers
run_sql("""
SELECT t.tgname, t.tgenabled 
FROM pg_catalog.pg_trigger t
JOIN pg_catalog.pg_class c ON t.tgrelid = c.oid
JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
""", "AUTH.USERS TRIGGERS")

# 4. Check if PG function works (simulate by checking if the function exists properly)
run_sql("""
SELECT n.nspname, p.proname, p.provolatile, p.prokind
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('handle_new_user', 'consume_activation_code', 'generate_activation_codes')
ORDER BY p.proname
""", "ALL RELEVANT FUNCTIONS")
