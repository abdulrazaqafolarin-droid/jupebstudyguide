import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const SUPABASE_URL = "https://gzyczowqqywesqhqqpdi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const text = readFileSync(process.argv[2], "utf-8");
const lines = text.split(/\r?\n/);

const theory = [];
let cur = null;

for (const line of lines) {
  const t = line.trim();
  if (!t) continue;

  const m = t.match(/^\*\*Question\s*(\d+)\*\*\s*(.*)/i);
  if (m) {
    if (cur) theory.push(cur);
    cur = { num: parseInt(m[1]), text: m[2] };
    continue;
  }
  if (/^\*\*/.test(t) && !/^(\*\*Answer|\*\*2019)/.test(t)) continue;
  if (cur) cur.text += "\n" + t;
}
if (cur) theory.push(cur);

console.log(`Parsed ${theory.length} practical questions`);

// Update JSON
const jsonDir = resolve(dirname(fileURLToPath(import.meta.url)), "../src/data/new-questions/biology");
const existingPath = resolve(jsonDir, "2019.json");
let existingData = [];
if (existsSync(existingPath)) {
  existingData = JSON.parse(readFileSync(existingPath, "utf-8"));
}

const pracData = theory.map(q => ({
  id: `bio-2019-import-practical-${q.num}`,
  question: q.text.trim(),
  difficulty: "medium",
  subject: "biology",
  year: 2019,
  category: "practical",
}));

const merged = [...existingData.filter(q => q.category !== "practical"), ...pracData];
writeFileSync(existingPath, JSON.stringify(merged, null, 2), "utf-8");
console.log("Updated 2019.json with practical");

// DB
let created = 0;
for (const q of theory) {
  const id = `bio-2019-practical-${String(q.num).padStart(3, "0")}`;
  const { error } = await supabase.from("study_questions").upsert({
    id, subject: "biology", year: 2019, category: "practical",
    question: q.text.trim(), difficulty: "medium", sort_order: q.num,
  }, { onConflict: "id" });
  if (error) console.error(`  ✗ Q${q.num}: ${error.message}`);
  else created++;
}
console.log(`DB: ${created} practical`);
console.log("Done!");
