import json, os, urllib.request, re

SUPABASE_TOKEN = "sbp_4f03466f94898fd81acadcc51c9edfcb94c9af01"
PROJECT_REF = "gzyczowqqywesqhqqpdi"
BASE = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/functions"

HEADERS = {
    "Authorization": f"Bearer {SUPABASE_TOKEN}",
    "Content-Type": "application/json",
}

# Functions to deploy: (slug, filepath, verify_jwt)
FUNCTIONS = [
    ("get-active-key", "bundled-get-active-key.ts", False),
    ("admin-key-manager", "bundled-admin-key-manager.ts", False),
    ("chat-proxy", "bundled-chat-proxy.ts", False),
    ("ai-tutor", "bundled-ai-tutor.ts", False),
]

def read_clean(path):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    # Strip non-ASCII characters that might break the parser
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2013", "-").replace("\u2014", "--")
    text = text.replace("\u2026", "...")
    cleaned = "".join(c if ord(c) < 128 else " " for c in text)
    return cleaned

def deploy_function(slug, filepath, verify_jwt):
    body = read_clean(filepath)
    payload = json.dumps({
        "slug": slug,
        "name": slug,
        "body": body,
        "verify_jwt": verify_jwt,
    }).encode("utf-8")

    url = f"{BASE}/{slug}"
    req = urllib.request.Request(url, data=payload, method="PATCH", headers=HEADERS)
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
            print(f"  OK  {slug} v{result.get('version', '?')}")
            return True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            # Doesn't exist yet - create it
            url = BASE
            req = urllib.request.Request(url, data=payload, method="POST", headers=HEADERS)
            try:
                with urllib.request.urlopen(req) as resp:
                    result = json.loads(resp.read())
                    print(f"  OK  {slug} v{result.get('version', '?')} (new)")
                    return True
            except urllib.error.HTTPError as e2:
                print(f"  ERR {slug}: {e2.code} {e2.read().decode()}")
                return False
        else:
            print(f"  ERR {slug}: {e.code} {e.read().decode()}")
            return False

print("Deploying edge functions...")
for slug, filepath, verify_jwt in FUNCTIONS:
    print(f"  -> {slug}...")
    deploy_function(slug, filepath, verify_jwt)

print("Done.")
