import { readFileSync, writeFileSync } from "fs";

const [,, year, filePath] = process.argv;

const SUPABASE_URL = "https://gzyczowqqywesqhqqpdi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM";

async function api(path, opts = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", ...opts.headers },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const ct = res.headers.get("content-type") || "";
  return ct.includes("json") ? res.json() : res.text();
}

const text = readFileSync(filePath, "utf-8");

const questions = {};
const lines = text.split("\n");
let currentNum = null;
let currentText = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  const numMatch = trimmed.match(/^(?:\*\*)?(\d+)(?:\.)(?:\*\*)?\s+(.+)/);
  if (numMatch) {
    if (currentNum !== null && currentText.length > 0) {
      if (!questions[currentNum]) questions[currentNum] = currentText.join(" ");
    }
    currentNum = parseInt(numMatch[1]);
    currentText = [numMatch[2]];
  } else if (currentNum !== null) {
    currentText.push(trimmed);
  }
}
if (currentNum !== null && currentText.length > 0) {
  if (!questions[currentNum]) questions[currentNum] = currentText.join(" ");
}

const parsed = Object.keys(questions).length;
console.log(`Parsed ${parsed} questions`);

const existing = await api(`study_questions?subject=eq.physics&year=eq.${year}&category=eq.objective&select=id,sort_order&order=sort_order.asc`);
console.log(`Found ${existing.length} questions in DB`);

const dbMap = {};
for (const q of existing) dbMap[q.sort_order] = q.id;

let updated = 0, skipped = 0;
for (const [numStr, questionText] of Object.entries(questions)) {
  const num = parseInt(numStr);
  const id = dbMap[num];
  if (!id) { console.log(`#${num}: NOT FOUND`); skipped++; continue; }
  await api(`study_questions?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: questionText }),
  });
  updated++;
  console.log(`#${num}: UPDATED ✓`);
}

console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
