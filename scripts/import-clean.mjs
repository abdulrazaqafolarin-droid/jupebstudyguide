import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const SUPABASE_URL = "https://gzyczowqqywesqhqqpdi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const [,, yearStr, filePath] = process.argv;
const year = parseInt(yearStr);

if (!year || !filePath) {
  console.error("Usage: node import-clean.mjs <year> <filepath>");
  process.exit(1);
}

const text = readFileSync(filePath, "utf-8");
const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

// Parse file into question number → { options, correct } map
const parsed = new Map();
let current = null;

for (const line of lines) {
  const numMatch = line.match(/^(?:\*\*)?(\d+)(?:b)?\.(?:\*\*)?$/);
  if (numMatch) {
    if (current && current.options.length > 0) {
      parsed.set(current.num, { options: current.options, correct: current.correct });
    }
    current = { num: parseInt(numMatch[1]), options: [], correct: null };
    continue;
  }
  const optMatch = line.match(/^([A-D])\.\s(.+?)(?:\s✓)?$/);
  if (optMatch && current) {
    const label = optMatch[1];
    let optText = optMatch[2];
    const isCorrect = line.includes("✓");
    if (optText.endsWith(" ✓")) optText = optText.slice(0, -2);
    current.options.push({ label, text: optText.trim() });
    if (isCorrect) current.correct = label;
  }
}
if (current && current.options.length > 0) {
  parsed.set(current.num, { options: current.options, correct: current.correct });
}

console.log(`Parsed ${parsed.size} questions from file`);

// Fix known issues per-year
// 2017 Q19: first "A." line is question stem, not an option — deduplicate
if (year === 2017) {
  const q19 = parsed.get(19);
  if (q19 && q19.options.length > 4) {
    // Remove first duplicate A (the question stem)
    const seen = new Set();
    const deduped = q19.options.filter(o => {
      const key = o.label;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    parsed.set(19, { options: deduped, correct: q19.correct });
    console.log("Fixed Q19: removed duplicate A option");
  }
}

let inserted = 0;
let errors = 0;

// Sort by question number and insert
const sorted = [...parsed.entries()].sort(([a], [b]) => a - b);

for (const [num, q] of sorted) {
  const id = `phy-${year}-mq-${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`;

  const { error } = await supabase.from("study_questions").insert({
    id,
    subject: "physics",
    year,
    category: "objective",
    question: null,
    image_url: null,
    options: JSON.stringify(q.options),
    correct_answer: q.correct,
    difficulty: "medium",
    sort_order: num,
  });

  if (error) {
    console.error(`Error on #${num}: ${error.message}`);
    errors++;
  } else {
    inserted++;
  }
}

console.log(`\nYear ${year}: Inserted ${inserted}, Errors ${errors}`);
