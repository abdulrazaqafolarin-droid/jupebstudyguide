"""Check handle_new_user trigger, RLS policies, and activation flow"""

import http.client
import json

PAT = "sbp_6684aea8d5150698467be84d3f21c5f9d6f3f471"
PROJECT = "gzyczowqqywesqhqqpdi"
SUPABASE_URL = "gzyczowqqywesqhqqpdi.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM"
SVC_HEADERS = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}

# 1. Check SQL functions and triggers via raw SQL endpoint
# Try to query pg_trigger directly
conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)

# Query all schemas for the handle_new_user function/trigger
sql_checks = [
    # Check if handle_new_user function exists
    ("SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_new_user'",
     "handle_new_user function"),
    # Check trigger on auth.users
    ("SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname = 'on_auth_user_created'",
     "on_auth_user_created trigger"),
    # Check RLS policies for profiles
    ("SELECT polname, polpermissive, polroles::text, polcmd, polqual::text, polwithcheck::text "
     "FROM pg_policy WHERE polrelid = 'profiles'::regclass ORDER BY polname",
     "profiles RLS policies"),
    # Check score_events RLS  
    ("SELECT polname, polpermissive, polroles::text, polcmd, polqual::text "
     "FROM pg_policy WHERE polrelid = 'score_events'::regclass ORDER BY polname",
     "score_events RLS"),
]

for sql, label in sql_checks:
    payload = {"query": sql.replace("'", "''")}  # not quite right for SQL literal escaping
    try:
        conn2 = http.client.HTTPSConnection(SUPABASE_URL, timeout=15)
        conn2.request("POST", "/rest/v1/rpc/",
            body=json.dumps(payload),
            headers={**SVC_HEADERS, "Content-Type": "application/json"})
        resp = conn2.getresponse()
        raw = resp.read().decode()
        if resp.status == 200 and raw.strip():
            print(f"✓ {label}: {raw[:300]}")
        else:
            print(f"✗ {label}: status={resp.status} {raw[:200]}")
        conn2.close()
    except Exception as e:
        print(f"✗ {label}: exception={e}")

conn.close()
