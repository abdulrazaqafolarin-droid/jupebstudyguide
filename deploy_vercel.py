import json, os, hashlib, urllib.request, urllib.error

WORK = r"C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main"
TOKEN = "vcp_360xFS0anzKP3RaTA6pD1IwivOlq3ONfkdBp7XkIXCz7vbxbSD3HpRqG"
TEAM_ID = "team_6ex5R4HbbOoHvNMMPQbRKbUA"

ignore_dirs = {"node_modules", ".git", "dist", ".vercel", ".next", "cache", "__pycache__"}
ignore_ext = {".log", ".pyc"}

files = []
for root, dirs, fnames in os.walk(WORK):
    dirs[:] = [d for d in dirs if d not in ignore_dirs and not d.startswith('.')]
    for fname in fnames:
        if fname.startswith('.') or fname in {".env", ".env.local", "package-lock.json"}:
            continue
        ext = os.path.splitext(fname)[1]
        if ext in ignore_ext:
            continue
        fpath = os.path.join(root, fname)
        relpath = os.path.relpath(fpath, WORK).replace(os.sep, '/')
        with open(fpath, 'rb') as f:
            content = f.read()
        files.append({
            "file": relpath,
            "data": content,
            "sha": hashlib.sha1(content).hexdigest(),
            "size": len(content)
        })

print(f"Collected {len(files)} files ({sum(f['size'] for f in files) / 1024 / 1024:.1f} MB)")

deployment = {
    "name": "jupebstudyguide-main",
    "project": "jupebstudyguide-main",
    "target": "production",
    "files": [{"file": f["file"], "sha": f["sha"], "size": f["size"]} for f in files],
    "projectSettings": {
        "framework": "vite",
        "buildCommand": "npm run build",
        "outputDirectory": "dist",
        "installCommand": "npm install"
    }
}

req = urllib.request.Request(
    f"https://api.vercel.com/v13/deployments?teamId={TEAM_ID}",
    data=json.dumps(deployment).encode(),
    headers={
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    },
    method="POST"
)

sha_map = {f["sha"]: f for f in files}

def upload_missing(missing):
    """Upload missing files, return number uploaded."""
    count = 0
    for sha in missing:
        if sha in sha_map:
            f = sha_map[sha]
            upload_req = urllib.request.Request(
                f"https://api.vercel.com/v13/deployments/files/{sha}?teamId={TEAM_ID}",
                data=f["data"],
                headers={
                    "Authorization": f"Bearer {TOKEN}",
                    "Content-Type": "application/octet-stream",
                },
                method="POST"
            )
            try:
                urllib.request.urlopen(upload_req, timeout=120)
                count += 1
                print(f"  Uploaded {f['file']}")
            except urllib.error.HTTPError as e:
                print(f"  Upload error for {f['file']}: {e.code}")
        else:
            print(f"  SHA {sha} not found in local files")
    return count

# Upload files in batches
all_shas = [f["sha"] for f in files]
print(f"Uploading {len(all_shas)} files first...")
upload_missing(all_shas)

print("Creating deployment...")
try:
    resp = urllib.request.urlopen(req, timeout=60)
    result = json.loads(resp.read())
    ready_state = result.get("readyState", "?")
    url = result.get("url", "?")
    deploy_id = result.get("id", "")
    print(f"Deployment: {url}")
    print(f"State: {ready_state}")
    print(f"ID: {deploy_id}")
    print(f"Deploy URL: https://{url}")
except urllib.error.HTTPError as e:
    body = e.read().decode()[:500]
    print(f"Error {e.code}: {body}")
except Exception as ex:
    print(f"Error: {str(ex)[:300]}")
