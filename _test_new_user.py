"""Create a new test user and simulate their experience"""
import http.client, json

SUPABASE_URL = "gzyczowqqywesqhqqpdi.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjQ0ODUsImV4cCI6MjA5NDQ0MDQ4NX0.mUAhX9W99_qU-s8V2gCvkmBhGwxIdwEdk7a5QGRmLgg"
SVC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM"
ANON_HEADERS = {"apikey": ANON_KEY, "Content-Type": "application/json"}
SVC_HEADERS = {"apikey": SVC_KEY, "Authorization": f"Bearer {SVC_KEY}", "Content-Type": "application/json"}

import random, string
email = f"test_{''.join(random.choices(string.ascii_lowercase, k=6))}@example.com"
password = "Test123456!"

print(f"Creating user: {email} / {password}")

# Step 1: Sign up
conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=30)
signup_body = json.dumps({
    "email": email,
    "password": password,
    "data": {"display_name": email.split('@')[0]}
})
conn.request("POST", "/auth/v1/signup", body=signup_body, headers=ANON_HEADERS)
resp = conn.getresponse()
signup_raw = resp.read().decode()
print(f"\n=== Step 1: Sign Up ===")
print(f"Status: {resp.status}")
print(f"Response: {signup_raw[:300]}")
signup_data = json.loads(signup_raw)
conn.close()

# Get the access token if auto-confirmed
access_token = signup_data.get("access_token", None)
user_id = signup_data.get("user", {}).get("id", None)
print(f"User ID: {user_id}")
print(f"Access Token: {access_token[:80] if access_token else 'NONE'}...")

if not access_token:
    print("\nEmail confirmation required. Need to get token via sign-in.")
    # Sign in
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=30)
    conn.request("POST", "/auth/v1/token?grant_type=password",
        body=json.dumps({"email": email, "password": password}),
        headers=ANON_HEADERS)
    resp = conn.getresponse()
    token_raw = resp.read().decode()
    print(f"\n=== Sign In ===")
    print(f"Status: {resp.status}")
    print(f"Response: {token_raw[:300]}")
    if resp.status == 200:
        token_data = json.loads(token_raw)
        access_token = token_data.get("access_token")
        user_id = token_data.get("user", {}).get("id")
        print(f"Got token via sign-in, user_id: {user_id}")
    conn.close()

if access_token and user_id:
    AUTH_HEADERS = {"apikey": ANON_KEY, "Authorization": f"Bearer {access_token}"}
    
    # Step 2: Check profile
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=10)
    conn.request("GET", f"/rest/v1/profiles?select=*&user_id=eq.{user_id}",
        headers={**AUTH_HEADERS, "Content-Type": "application/json"})
    resp = conn.getresponse()
    profile_raw = resp.read().decode()
    print(f"\n=== Step 2: Check Profile ===")
    print(f"Status: {resp.status}")
    print(f"Profile: {profile_raw[:500]}")
    conn.close()

    # Step 3: Check activation status
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=10)
    conn.request("GET", f"/rest/v1/profiles?select=is_activated,is_admin&user_id=eq.{user_id}",
        headers={**AUTH_HEADERS, "Content-Type": "application/json"})
    resp = conn.getresponse()
    act_raw = resp.read().decode()
    print(f"\n=== Step 3: Activation Status ===")
    print(f"Status: {resp.status}")
    print(f"Response: {act_raw[:200]}")
    conn.close()

    # Step 4: Check the leaderboard query
    print(f"\n=== Step 4: Leaderboard Query ===")
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=10)
    conn.request("GET", "/rest/v1/score_events?select=user_id,amount&limit=5",
        headers={**AUTH_HEADERS, "Content-Type": "application/json"})
    resp = conn.getresponse()
    scores_raw = resp.read().decode()
    print(f"Status: {resp.status}")
    try:
        scores = json.loads(scores_raw)
        print(f"Score events count: {len(scores) if isinstance(scores, list) else 'error'}")
        if isinstance(scores, list):
            print(f"First 3: {scores[:3]}")
    except:
        print(f"Raw: {scores_raw[:200]}")
    conn.close()

    # Step 5: Check profiles query (leaderboard profiles fetch)
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=10)
    conn.request("GET", "/rest/v1/profiles?select=user_id,display_name,avatar_url,achievements&limit=5",
        headers={**AUTH_HEADERS, "Content-Type": "application/json"})
    resp = conn.getresponse()
    profs_raw = resp.read().decode()
    print(f"\n=== Step 5: Leaderboard Profiles Query ===")
    print(f"Status: {resp.status}")
    print(f"Response: {profs_raw[:300]}")
    conn.close()

    # Step 6: Full query like the client does it
    print(f"\n=== Step 6: Full client-style query ===")
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=10)
    conn.request("GET", "/rest/v1/profiles?select=id,user_id,display_name,avatar_url,bio,privacy_avatar,privacy_profile,achievements&limit=1",
        headers={**AUTH_HEADERS, "Content-Type": "application/json"})
    resp = conn.getresponse()
    full_raw = resp.read().decode()
    print(f"Status: {resp.status}")
    if resp.status == 200:
        print(f"Full profile query OK: {full_raw[:200]}")
    else:
        print(f"FULL PROFILE QUERY FAILED: {full_raw[:300]}")
    conn.close()

    # Step 7: Try activation with a known code
    print(f"\n=== Step 7: Try activation ===")
    # First, list available codes (using service key to get a valid one)
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=10)
    conn.request("GET", "/rest/v1/activation_codes?select=code&is_used=eq.false&limit=1",
        headers={**SVC_HEADERS})
    resp = conn.getresponse()
    codes_raw = resp.read().decode()
    print(f"Available codes: {codes_raw[:200]}")
    conn.close()

    if codes_raw and codes_raw != "[]":
        try:
            codes_data = json.loads(codes_raw)
            if isinstance(codes_data, list) and len(codes_data) > 0:
                code = codes_data[0].get("code", "")
                conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=10)
                conn.request("POST", "/rest/v1/rpc/consume_activation_code",
                    body=json.dumps({"p_code": code, "p_user_id": user_id}),
                    headers={**SVC_HEADERS})
                resp = conn.getresponse()
                act_raw = resp.read().decode()
                print(f"Activation result: {act_raw[:200]}")
                conn.close()
        except:
            pass

    # Step 8: Wrap up - clean up the test user
    print(f"\n=== STEP 8: TEST RESULTS ===")
    print(f"Test user: {email}")
    print(f"Password: {password}")
    print(f"User ID: {user_id}")
    
    # Check if user has a profile
    conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=10)
    conn.request("GET", f"/rest/v1/profiles?select=*&user_id=eq.{user_id}",
        headers={**SVC_HEADERS})
    resp = conn.getresponse()
    final_raw = resp.read().decode()
    print(f"Final profile check: {final_raw[:300]}")
    conn.close()

print("\n\n=== DIAGNOSIS ===")

# List activation codes count
conn = http.client.HTTPSConnection(SUPABASE_URL, timeout=10)
conn.request("GET", "/rest/v1/activation_codes?select=code,is_used,plan_type&is_used=eq.false&limit=10",
    headers={**SVC_HEADERS})
resp = conn.getresponse()
codes_raw = resp.read().decode()
print(f"\nAvailable activation codes: {codes_raw[:500]}")
conn.close()
