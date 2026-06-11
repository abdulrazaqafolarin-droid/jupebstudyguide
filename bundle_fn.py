import re, os, json, sys, subprocess

SHARED_DIR = "supabase/functions/_shared"
FUNCTIONS_DIR = "supabase/functions"

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def bundle_function(entry_file, function_slug):
    entry_abs = os.path.normpath(os.path.join(FUNCTIONS_DIR, function_slug, entry_file))
    
    # Collect all files in dependency order
    visited = set()
    ordered = []
    
    def collect(filepath):
        if filepath in visited:
            return
        visited.add(filepath)
        content = read_file(filepath)
        dirname = os.path.dirname(filepath)
        # Find local imports
        for m in re.finditer(r'(?:from\s+["\']|import\s+["\'])(\.\.?\/[^"\']+)(["\'])', content):
            imp = m.group(1)
            resolved = os.path.normpath(os.path.join(dirname, imp))
            if os.path.exists(resolved):
                collect(resolved)
        ordered.append(filepath)
    
    collect(entry_abs)
    
    # Collect npm imports
    npm_imports = []
    for fp in ordered:
        content = read_file(fp)
        for m in re.finditer(r'^import\s+.*?from\s+["\'](npm:[^"\']+)["\']', content, re.MULTILINE):
            imp = m.group(0)
            if imp not in npm_imports:
                npm_imports.append(imp)
    
    # Build bundled output
    parts = []
    parts.append('// Bundled edge function - all local imports inlined')
    parts.append('// @ts-nocheck')
    parts.append('')
    for imp in npm_imports:
        parts.append(imp)
    parts.append('')
    
    # Add shared modules (everything except entry)
    deps = [f for f in ordered if f != entry_abs]
    for fp in deps:
        content = read_file(fp)
        lines = []
        for line in content.split('\n'):
            if re.match(r'^import\s+.*?from\s+["\'](?:npm:)[^"\']+["\']', line):
                continue
            if re.match(r'^import\s+.*?from\s+["\']\.\.?\/', line):
                continue
            lines.append(line)
        rel = os.path.relpath(fp, os.path.join(FUNCTIONS_DIR, function_slug)).replace('\\', '/')
        parts.append('// === ' + rel + ' ===')
        parts.append('\n'.join(lines))
        parts.append('')
    
    # Add entry file
    content = read_file(entry_abs)
    lines = []
    for line in content.split('\n'):
        if re.match(r'^import\s+.*?from\s+["\'](?:npm:)[^"\']+["\']', line):
            continue
        if re.match(r'^import\s+.*?from\s+["\']\.\.?\/', line):
            continue
        lines.append(line)
    parts.append('// === ' + entry_file + ' ===')
    parts.append('\n'.join(lines))
    
    result = '\n'.join(parts)
    
    # Clean non-ASCII
    result = result.replace('\u2018', "'").replace('\u2019', "'")
    result = result.replace('\u201c', '"').replace('\u201d', '"')
    result = result.replace('\u2013', '-').replace('\u2014', '--')
    result = result.replace('\u2026', '...')
    result = ''.join(c if ord(c) < 128 else ' ' for c in result)
    
    return result

# Bundle all functions
to_bundle = [
    ("get-active-key", "index.ts"),
    ("admin-key-manager", "index.ts"),
    ("ai-tutor", "index.ts"),
    ("chat-proxy", "index.ts"),
    ("parse-document", "index.ts"),
]

for slug, entry in to_bundle:
    print(f"Bundling {slug}... ", end="", flush=True)
    try:
        bundled = bundle_function(entry, slug)
        outpath = "bundled-" + slug + ".ts"
        with open(outpath, 'w', encoding='ascii') as f:
            f.write(bundled)
        print(f"OK ({len(bundled)} chars)")
    except Exception as e:
        print(f"ERROR: {e}")
