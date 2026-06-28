import json, os, re, subprocess, sys, tempfile

TOKEN = "sbp_6684aea8d5150698467be84d3f21c5f9d6f3f471"
PROJECT_REF = "gzyczowqqywesqhqqpdi"
WORK = r"C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main"
SHARED = os.path.join(WORK, "supabase", "functions", "_shared")

shared = {}
for fname in os.listdir(SHARED):
    if fname.endswith(".ts"):
        with open(os.path.join(SHARED, fname), "r", encoding="utf-8") as f:
            shared[fname] = f.read()

IMPORT_RE = re.compile(r"^\s*import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+[\'\"]([^\'\"]+)[\'\"]\s*;?\s*$")
NPM_IMPORT_RE = re.compile(r"^\s*import\s+\{([^}]+)\}\s+from\s+[\'\"]npm:@supabase/supabase-js@2[\'\"]\s*;?\s*$")
STAR_IMPORT_RE = re.compile(r"^\s*import\s+\*\s+as\s+(\w+)\s+from\s+[\'\"]npm:([^\'\"]+)[\'\"]\s*;?\s*$")
IMPORT_REMAIN_RE = re.compile(r"^\s*import\s+")

def inline_imports(source, seen=None, npm_seen=None):
    if seen is None:
        seen = set()
    if npm_seen is None:
        npm_seen = set()
    lines = source.split("\n")
    result = []
    for line in lines:
        m = IMPORT_RE.match(line)
        if m:
            path = m.group(2)
            fname = None
            if path.startswith("../_shared/"):
                fname = path.replace("../_shared/", "")
            elif path.startswith("./"):
                fname = path.replace("./", "")
            if fname and fname in shared and fname not in seen:
                seen.add(fname)
                result.append(f"// --- inlined from {fname} ---")
                inlined = inline_imports(shared[fname], seen, npm_seen)
                inlined = re.sub(r"^export\s+(async\s+)?function\s+", r"\1function ", inlined, flags=re.MULTILINE)
                inlined = re.sub(r"^export\s+\{[^}]+\}\s*;?\s*$", "", inlined, flags=re.MULTILINE)
                result.append(inlined)
                result.append(f"// --- end inlined from {fname} ---")
                continue
        
        npm_m = NPM_IMPORT_RE.match(line)
        if npm_m:
            var_name = npm_m.group(1).strip()
            if var_name not in npm_seen:
                npm_seen.add(var_name)
                result.append(f"const {{ {var_name} }} = await import(\"npm:@supabase/supabase-js@2\");")
            continue
        
        star_m = STAR_IMPORT_RE.match(line)
        if star_m:
            ns = star_m.group(1).strip()
            mod = star_m.group(2).strip()
            if ns not in npm_seen:
                npm_seen.add(ns)
                result.append(f"const {ns} = await import(\"npm:{mod}\");")
            continue
        
        if IMPORT_REMAIN_RE.match(line) and "import.meta" not in line:
            continue
        
        result.append(line)
    return "\n".join(result)

slug = sys.argv[1] if len(sys.argv) > 1 else "chat-proxy"
fn_path = os.path.join(WORK, "supabase", "functions", slug, "index.ts")
with open(fn_path, "r", encoding="utf-8") as f:
    source = f.read()

inlined = inline_imports(source)
print(f"Inlined: {len(inlined)} bytes")

# Clean non-ASCII
cleaned = ""
for c in inlined:
    if ord(c) >= 128:
        cleaned += " "
    else:
        cleaned += c
non_ascii_count = sum(1 for c in inlined if ord(c) >= 128)
print(f"Non-ASCII chars stripped: {non_ascii_count}")

# Write payload to temp file (cmd too long for inline)
payload = json.dumps({"slug": slug, "name": slug, "body": cleaned, "verify_jwt": False})
tmp = tempfile.NamedTemporaryFile(mode="wb", suffix=".json", delete=False)
tmp.write(payload.encode("utf-8"))
tmp.close()
print(f"Payload written: {len(payload)} bytes -> {tmp.name}")

r = subprocess.run(
    ["curl", "-s", "-X", "PATCH",
     f"https://api.supabase.com/v1/projects/{PROJECT_REF}/functions/{slug}",
     "-H", f"Authorization: Bearer {TOKEN}",
     "-H", "Content-Type: application/json",
     "--data-binary", f"@{tmp.name}"],
    capture_output=True, timeout=60
)

try:
    d = json.loads(r.stdout)
    print(f"Result: v{d.get('version','?')} | {d.get('status','?')}")
    if "error" in d:
        print(f"Error: {d['error']}")
        print(f"Message: {d.get('message','')}")
except Exception as e:
    print(f"Failed to parse: {r.stdout[:500]}")
    if r.stderr:
        print(f"Stderr: {r.stderr[:500]}")

os.unlink(tmp.name)
