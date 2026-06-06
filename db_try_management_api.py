import http.client, json

PROJECT_REF = "gzyczowqqywesqhqqpdi"
PAT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM"

# Try the Management API SQL endpoint
conn = http.client.HTTPSConnection("api.supabase.com", timeout=10)
payload = json.dumps({"query": "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS achievements jsonb NOT NULL DEFAULT '[]'::jsonb;"})
conn.request("POST", f"/v1/projects/{PROJECT_REF}/database/query", body=payload, headers={
    "Authorization": f"Bearer {PAT}",
    "Content-Type": "application/json"
})
resp = conn.getresponse()
body = resp.read().decode()
print(f"Status: {resp.status}")
print(f"Body: {body[:500]}")
conn.close()
