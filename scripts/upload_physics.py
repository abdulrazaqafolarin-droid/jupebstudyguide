import json, requests, sys

SUPABASE_URL = "https://gzyczowqqywesqhqqpdi.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM"

headers = {
    "Content-Type": "application/json",
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
}

# First, get existing physics IDs
print("Fetching existing physics IDs...")
r = requests.get(
    f"{SUPABASE_URL}/rest/v1/study_questions",
    headers=headers,
    params={"subject": "eq.physics", "select": "id"},
)
existing_ids = set()
if r.status_code == 200:
    existing_ids = {row["id"] for row in r.json()}
print(f"Found {len(existing_ids)} existing physics questions")

# Load source
with open("output/physics.json", encoding="utf-8") as f:
    questions = json.load(f)

# Filter to only new ones
new_rows = []
for q in questions:
    if q["id"] not in existing_ids:
        new_rows.append({
            "id": q["id"],
            "subject": q["subject"],
            "year": q["year"],
            "category": q["category"],
            "question": q["question"],
            "options": json.dumps(q.get("options", [])) if q.get("options") else None,
            "correct_answer": q.get("correctAnswer") or None,
            "explanation": q.get("explanation") or None,
            "difficulty": q.get("difficulty", "medium"),
            "course": q.get("tags", [None])[0] if q.get("tags") else None,
        })

print(f"Need to upload: {len(new_rows)} (skipping {len(questions) - len(new_rows)} existing)")

# Upload in batches
BATCH = 50
total = 0
for i in range(0, len(new_rows), BATCH):
    batch = new_rows[i:i+BATCH]
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/study_questions",
        headers=headers,
        json=batch,
    )
    if r.status_code in (200, 201):
        total += len(batch)
        print(f"Uploaded {total}/{len(new_rows)}")
    else:
        print(f"Error at batch {i}: {r.status_code} {r.text[:200]}")
        sys.exit(1)

print(f"Done. {total} physics questions uploaded.")
