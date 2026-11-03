// USAGE: set SUPABASE_TOKEN env var first!
//   Windows: $env:SUPABASE_TOKEN="your-token"
//   Mac/Linux: export SUPABASE_TOKEN=your-token
//
// Deploys all edge functions with automatic inlining of _shared/* imports.
// No more manual bundling needed.
//
// Optional flags:
//   --function=ai-tutor    Deploy only one function
//   --help                 Show this help

const fs = require("fs");
const path = require("path");

const PROJECT_REF = "gzyczowqqywesqhqqpdi";
const FUNCTIONS_DIR = path.join(__dirname, "supabase", "functions");
const SHARED_DIR = path.join(FUNCTIONS_DIR, "_shared");

const ALL_FUNCTIONS = [
  "ai-tutor",
  "chat-proxy",
  "parse-document",
  "push-fcm",
  "send-push",
  "textbook-ingest",
  "validate-activation",
  "weekly-reset",
];

// Read all _shared/*.ts files
const sharedCache = {};
if (fs.existsSync(SHARED_DIR)) {
  for (const fname of fs.readdirSync(SHARED_DIR)) {
    if (fname.endsWith(".ts")) {
      sharedCache[fname] = fs.readFileSync(path.join(SHARED_DIR, fname), "utf8");
    }
  }
}

const IMPORT_RE = /^\s*import\s+(?:type\s+)?\{(.+?)\}\s+from\s+['"](.+?)['"]\s*;?\s*$/m;
const NPM_IMPORT_RE = /^\s*import\s+\{(.+?)\}\s+from\s+['"]npm:(@supabase\/supabase-js@\d+)['"]\s*;?\s*$/m;
const STAR_IMPORT_RE = /^\s*import\s+\*\s+as\s+(\w+)\s+from\s+['"]npm:(.+?)['"]\s*;?\s*$/m;
const DEFAULT_IMPORT_RE = /^\s*import\s+(\w+)\s+from\s+['"]npm:(.+?)['"]\s*;?\s*$/m;

const SHARED_IMPORT_RE = /^\s*import\s+(?:type\s+)?\{(.+?)\}\s+from\s+['"]\.\.\/_shared\/(.+?)['"]\s*;?\s*$/m;
const LOCAL_IMPORT_RE = /^\s*import\s+(?:type\s+)?\{(.+?)\}\s+from\s+['"]\.\/(.+?)['"]\s*;?\s*$/m;

// Join multi-line import statements into one line so the line-based
// regexes below can match them (e.g. ai-router's import of ./keyVault.ts).
function joinMultilineImports(src) {
  const lines = src.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const t = lines[i].trim();
    const isImportStart = /^import\s/.test(t);
    const complete = /from\s+['"][^'"]+['"]\s*;?\s*$/.test(t) || /^import\s+['"][^'"]+['"]\s*;?\s*$/.test(t);
    if (isImportStart && !complete) {
      let acc = t;
      i++;
      while (i < lines.length) {
        acc += " " + lines[i].trim();
        if (/from\s+['"][^'"]+['"]\s*;?\s*$/.test(acc) || /^import\s+['"]/.test(acc)) break;
        i++;
      }
      out.push(acc);
      i++;
      continue;
    }
    out.push(lines[i]);
    i++;
  }
  return out.join("\n");
}

// ctx tracks state across the WHOLE inlining run (all recursions):
//   inlined  — shared files already spliced in (no double inclusion)
//   declared — top-level names already declared from npm imports (no dup const)
function inlineShared(rawCode, name, ctx = { inlined: new Set(), declared: new Map() }) {
  const lines = joinMultilineImports(rawCode).split("\n");
  const result = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Match ../_shared/ imports, and ./ imports that resolve to a _shared file
    // (a shared file importing its sibling, e.g. ai.ts -> ./ai-router.ts).
    const sharedMatch = trimmed.match(SHARED_IMPORT_RE);
    const localMatch = trimmed.match(LOCAL_IMPORT_RE);
    let target = null;
    if (sharedMatch) target = sharedMatch[2];
    else if (localMatch && Object.prototype.hasOwnProperty.call(sharedCache, localMatch[2])) target = localMatch[2];

    if (target !== null) {
      if (!target.endsWith(".ts")) continue;
      if (ctx.inlined.has(target)) continue;

      const sharedCode = sharedCache[target];
      if (!sharedCode) {
        console.warn(`  WARN: _shared/${target} not found for ${name}`);
        continue;
      }
      ctx.inlined.add(target);
      result.push(`// --- inlined from _shared/${target} ---`);
      // Recursively inline this shared file's own imports
      result.push(inlineShared(sharedCode, `_shared/${target}`, ctx));
      result.push(`// --- end inlined from _shared/${target} ---`);
      continue;
    }

    if (localMatch) {
      // A ./ import that is not a _shared file — cannot be bundled; drop loudly.
      console.warn(`  WARN: dropping non-shared local import ./${localMatch[2]} in ${name}`);
      continue;
    }

    // Convert npm imports to dynamic imports (compatible with Supabase runtime),
    // skipping symbols already declared earlier in the bundle (index.ts and
    // inlined shared files both import createClient — a dup const is a
    // boot-time SyntaxError).
    const npmMatch = trimmed.match(NPM_IMPORT_RE);
    if (npmMatch) {
      const pkg = npmMatch[2];
      const entries = npmMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
      const declName = (entry) => entry.split(/\s+as\s+/).pop().trim();
      const fresh = entries.filter((e) => {
        const prev = ctx.declared.get(declName(e));
        if (prev !== undefined && prev !== pkg) {
          console.warn(`  WARN: npm symbol "${declName(e)}" already declared from ${prev}; skipping ${pkg} import in ${name}`);
        }
        return prev === undefined;
      });
      for (const e of entries) {
        if (!ctx.declared.has(declName(e))) ctx.declared.set(declName(e), pkg);
      }
      if (fresh.length === 0) continue;
      result.push(`const { ${fresh.join(", ")} } = await import("npm:${pkg}");`);
      continue;
    }

    const starMatch = trimmed.match(STAR_IMPORT_RE);
    if (starMatch) {
      if (ctx.declared.has(starMatch[1])) continue;
      ctx.declared.set(starMatch[1], starMatch[2]);
      result.push(`const ${starMatch[1]} = await import("npm:${starMatch[2]}");`);
      continue;
    }

    const defaultMatch = trimmed.match(DEFAULT_IMPORT_RE);
    if (defaultMatch) {
      if (ctx.declared.has(defaultMatch[1])) continue;
      ctx.declared.set(defaultMatch[1], defaultMatch[2]);
      result.push(`const ${defaultMatch[1]} = (await import("npm:${defaultMatch[2]}")).default;`);
      continue;
    }

    // Strip export keywords from non-top-level items after inlining
    const stripped = line
      .replace(/^export\s+default\s+/, "default ")
      .replace(/^export\s+(async\s+)?function\s+/, "$1function ")
      .replace(/^export\s+\{.+?\}\s*;?\s*$/, "");

    result.push(stripped);
  }

  return result.join("\n");
}

function stripNonASCII(text) {
  return text
    .replace(/\u2018/g, "'").replace(/\u2019/g, "'")
    .replace(/\u201c/g, '"').replace(/\u201d/g, '"')
    .replace(/\u2013/g, "-").replace(/\u2014/g, "--")
    .replace(/\u2026/g, "...")
    .split("").filter(c => c.charCodeAt(0) < 128).join("");
}

async function deployFunction(name) {
  const fnDir = path.join(FUNCTIONS_DIR, name);
  const filePath = path.join(fnDir, "index.ts");

  if (!fs.existsSync(filePath)) {
    console.error(`SKIP ${name}: no index.ts found`);
    return false;
  }

  let code = fs.readFileSync(filePath, "utf8");
  const hasShared = code.includes("../_shared/");

  if (hasShared) {
    console.log(`  Inlining _shared imports for ${name}...`);
    code = inlineShared(code, name);
  }

  const cleaned = stripNonASCII(code);
  const token = process.env.SUPABASE_TOKEN;

  if (!token) {
    console.error(`ERROR: Set SUPABASE_TOKEN env var to deploy ${name}`);
    return false;
  }

  try {
    const res = await (async () => {
      const patchRes = await fetch(
        `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${name}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            slug: name,
            name: name,
            body: cleaned,
            verify_jwt: false,
          }),
        }
      );
      if (patchRes.status !== 404) return patchRes;
      // First deploy of this function — create it, then PATCH works forever.
      console.log(`  ${name} not found — creating...`);
      return fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: name,
          name: name,
          body: cleaned,
          verify_jwt: false,
        }),
      });
    })();

    if (!res.ok) {
      const err = await res.text();
      console.error(`FAIL ${name}: HTTP ${res.status} - ${err.slice(0, 200)}`);
      return false;
    }

    const data = await res.json();
    console.log(`OK   ${name} (v${data.version || "?"})`);
    return true;
  } catch (e) {
    console.error(`FAIL ${name}: ${e.message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const help = args.includes("--help");
  const funcArg = args.find(a => a.startsWith("--function="));

  if (help) {
    console.log("Deploy edge functions to Supabase with _shared inlining.");
    console.log("Usage: node deploy-all.cjs");
    console.log("  --function=name   Deploy only one function");
    console.log("  --help            This help");
    console.log("\nAvailable:", ALL_FUNCTIONS.join(", "));
    process.exit(0);
  }

  const toDeploy = funcArg
    ? [funcArg.split("=")[1]]
    : ALL_FUNCTIONS;

  console.log(`Deploying ${toDeploy.length} function(s) to project ${PROJECT_REF}...\n`);

  let ok = 0;
  let fail = 0;
  for (const name of toDeploy) {
    const result = await deployFunction(name);
    if (result) ok++; else fail++;
  }

  console.log(`\nDone: ${ok} OK, ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(console.error);
