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

function inlineShared(code, name) {
  const lines = code.split("\n");
  const result = [];
  const inlined = new Set();

  for (const line of lines) {
    const trimmed = line.trim();

    // Match ../_shared/ imports
    const sharedMatch = trimmed.match(SHARED_IMPORT_RE);
    if (sharedMatch) {
      const fname = sharedMatch[2];
      if (!fname.endsWith(".ts")) continue;
      if (inlined.has(fname)) continue;
      inlined.add(fname);

      const sharedCode = sharedCache[fname];
      if (!sharedCode) {
        console.warn(`  WARN: _shared/${fname} not found for ${name}`);
        continue;
      }
      result.push(`// --- inlined from _shared/${fname} ---`);
      // Recursively inline this shared file's own imports
      const inlinedShared = inlineShared(sharedCode, `_shared/${fname}`);
      result.push(inlinedShared);
      result.push(`// --- end inlined from _shared/${fname} ---`);
      continue;
    }

    // Match ./local imports (within the function itself)
    const localMatch = trimmed.match(LOCAL_IMPORT_RE);
    if (localMatch) {
      // These are typically embedded files, skip them
      continue;
    }

    // Convert npm imports to dynamic imports (compatible with Supabase runtime)
    const npmMatch = trimmed.match(NPM_IMPORT_RE);
    if (npmMatch) {
      result.push(`const { ${npmMatch[1]} } = await import("npm:${npmMatch[2]}");`);
      continue;
    }

    const starMatch = trimmed.match(STAR_IMPORT_RE);
    if (starMatch) {
      result.push(`const ${starMatch[1]} = await import("npm:${starMatch[2]}");`);
      continue;
    }

    const defaultMatch = trimmed.match(DEFAULT_IMPORT_RE);
    if (defaultMatch) {
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
