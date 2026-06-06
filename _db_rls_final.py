"""Check RLS policies and handle_new_user trigger"""
import http.client, json

SVC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM"
SVC_HEADERS = {"apikey": SVC_KEY, "Authorization": f"Bearer {SVC_KEY}"}
PROJECT = "gzyczowqqywesqhqqpdi"
SUPABASE_URL = "gzyczowqqywesqhqqpdi.supabase.co"

# Use the Supabase Management API to run a SQL query via the SQL endpoint
PAT = "sbp_6684aea8d5150698467be84d3f21c5f9d6f3f471"

mgmt = http.client.HTTPSConnection("api.supabase.com", timeout=30)

# Step 1: Try the POST /v1/projects/{ref}/database/query endpoint
# This runs raw SQL on the project database
query = """
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('profiles', 'score_events', 'leaderboard_weeks')
ORDER BY tablename, policyname;
"""

payload = json.dumps({"query": query})
mgmt.request("POST", f"/v1/projects/{PROJECT}/database/query",
    body=payload,
    headers={
        "Authorization": f"Bearer {PAT}",
        "Content-Type": "application/json"
    })
resp = mgmt.getresponse()
raw = resp.read().decode()
print(f"=== Policies query ===")
print(f"Status: {resp.status}")
if resp.status == 200:
    data = json.loads(raw)
    if isinstance(data, list):
        for row in data:
            print(f"  {row.get('tablename',''):20s} {row.get('policyname',''):45s} cmd={row.get('cmd',''):8s} qual={str(row.get('qual',''))[:120]}")
    else:
        print(f"  Response type: {type(data).__name__}")
        print(f"  {str(data)[:500]}")
else:
    print(f"  Error: {raw[:300]}")
    # Try alternative endpoint
    # Try /v1/projects/{ref}/database/sql
    alt_payload = json.dumps({"query": query})
    try:
        mgmt2 = http.client.HTTPSConnection("api.supabase.com", timeout=30)
        mgmt2.request("POST", f"/v1/projects/{PROJECT}/database/sql",
            body=alt_payload,
            headers={
                "Authorization": f"Bearer {PAT}",
                "Content-Type": "application/json"
            })
        resp2 = mgmt2.getresponse()
        raw2 = resp2.read().decode()
        print(f"  Alt endpoint status: {resp2.status}")
        if resp2.status == 200:
            data2 = json.loads(raw2)
            if isinstance(data2, list):
                for row in data2:
                    print(f"    {row.get('tablename',''):20s} {row.get('policyname',''):45s} cmd={row.get('cmd',''):8s} qual={str(row.get('qual',''))[:120]}")
            else:
                print(f"    {str(data2)[:500]}")
        else:
            print(f"    Error: {raw2[:300]}")
        mgmt2.close()
    except Exception as e:
        print(f"    Exception: {e}")

# Check for handle_new_user function
func_query = "SELECT proname, prosrc FROM pg_proc WHERE proname LIKE '%handle_new_user%'"
try:
    mgmt3 = http.client.HTTPSConnection("api.supabase.com", timeout=30)
    mgmt3.request("POST", f"/v1/projects/{PROJECT}/database/query",
        body=json.dumps({"query": func_query}),
        headers={"Authorization": f"Bearer {PAT}", "Content-Type": "application/json"})
    resp3 = mgmt3.getresponse()
    raw3 = resp3.read().decode()
    print(f"\n=== handle_new_user function ===")
    print(f"Status: {resp3.status}")
    if resp3.status == 200:
        funcs = json.loads(raw3)
        if isinstance(funcs, list) and len(funcs) > 0:
            for f in funcs:
                src = f.get('prosrc', '')
                print(f"  EXISTS: {f.get('proname','')}, src_preview: {src[:100]}...")
        else:
            print(f"  NOT FOUND - handle_new_user function does not exist!")
    else:
        print(f"  Error: {raw3[:300]}")
    mgmt3.close()
except Exception as e:
    print(f"  Exception: {e}")

mgmt.close()
