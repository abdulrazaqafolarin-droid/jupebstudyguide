// Apply a repo migration file via the Supabase management API.
// Usage: SUPABASE_PAT=... node apply-migration.cjs supabase/migrations/<file>.sql
const fs = require("fs");
const REF = "gzyczowqqywesqhqqpdi";
const PAT = process.env.SUPABASE_PAT;
const file = process.argv[2];
if (!PAT) { console.error("SUPABASE_PAT env var required"); process.exitCode = 1; return; }
if (!file || !fs.existsSync(file)) { console.error("usage: node apply-migration.cjs <file.sql>"); process.exitCode = 1; return; }

(async () => {
  const sql = fs.readFileSync(file, "utf8");
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`APPLY_FAILED HTTP ${res.status}: ${text.slice(0, 500)}`);
    process.exitCode = 1;
    return;
  }
  console.log("APPLIED OK:", file);
})().catch((e) => { console.error("APPLY_FAILED:", e.message); process.exitCode = 1; });
