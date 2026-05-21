// USAGE: set SUPABASE_TOKEN env var first!
//   Windows: $env:SUPABASE_TOKEN="your-token"
//   Mac/Linux: export SUPABASE_TOKEN=your-token
//
// Optionally set GROQ_API_KEY in Supabase dashboard -> Edge Functions secrets
// for functions that use Groq (ai-tutor, chat-proxy, parse-document).
//
// Optional flags:
//   --function=ai-tutor    Deploy only one function
//   --help                 Show this help

const FUNCTIONS = [
  { name: "ai-tutor", path: "supabase/functions/ai-tutor/index.ts" },
  { name: "chat-proxy", path: "supabase/functions/chat-proxy/index.ts" },
  { name: "parse-document", path: "supabase/functions/parse-document/index.ts" },
  { name: "validate-activation", path: "supabase/functions/validate-activation/index.ts" },
  { name: "weekly-reset", path: "supabase/functions/weekly-reset/index.ts" },
];

const PROJECT_REF = "gzyczowqqywesqhqqpdi";

async function deployFunction(name, filePath) {
  const fs = await import("fs");
  const code = fs.readFileSync(filePath, "utf8");

  // Strip non-ASCII characters (emojis, smart quotes, etc.)
  const cleaned = code
    .replace(/\u2018/g, "'").replace(/\u2019/g, "'")
    .replace(/\u201c/g, '"').replace(/\u201d/g, '"')
    .replace(/\u2013/g, "-").replace(/\u2014/g, "--")
    .replace(/\u2026/g, "...")
    .split("").filter(c => c.charCodeAt(0) < 128).join("");

  const token = process.env.SUPABASE_TOKEN;
  if (!token) {
    console.error(`ERROR: Set SUPABASE_TOKEN env var to deploy ${name}`);
    return false;
  }

  try {
    const res = await fetch(
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
    console.log("Deploy all edge functions to Supabase.");
    console.log("Usage: node deploy-all.cjs");
    console.log("  --function=name   Deploy only one function");
    console.log("  --help            This help");
    process.exit(0);
  }

  const toDeploy = funcArg
    ? FUNCTIONS.filter(f => f.name === funcArg.split("=")[1])
    : FUNCTIONS;

  if (toDeploy.length === 0) {
    console.error("No matching functions found.");
    process.exit(1);
  }

  console.log(`Deploying ${toDeploy.length} function(s)...\n`);

  let ok = 0;
  let fail = 0;
  for (const fn of toDeploy) {
    const result = await deployFunction(fn.name, fn.path);
    if (result) ok++; else fail++;
  }

  console.log(`\nDone: ${ok} OK, ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(console.error);
