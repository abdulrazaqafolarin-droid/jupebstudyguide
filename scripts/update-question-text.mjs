import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const [,, year, filePath] = process.argv;

if (!year || !filePath) {
  console.error("Usage: node scripts/update-question-text.mjs <year> <filepath>");
  process.exit(1);
}

const SUPABASE_URL = "https://gzyczowqqywesqhqqpdi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const text = readFileSync(filePath, "utf-8");

const questions = {};
// Match lines starting with a number followed by period: "1. text" or "**1.** text"
const lines = text.split("\n");
let currentNum = null;
let currentText = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;

  const numMatch = trimmed.match(/^(?:\*\*)?(\d+)(?:\.)(?:\*\*)?\s+(.+)/);
  if (numMatch) {
    // Save previous question
    if (currentNum !== null && currentText.length > 0) {
      if (!questions[currentNum]) {
        questions[currentNum] = currentText.join(" ");
      }
    }
    currentNum = parseInt(numMatch[1]);
    currentText = [numMatch[2]];
  } else if (currentNum !== null) {
    // Continuation of current question
    currentText.push(trimmed);
  }
}
// Save last question
if (currentNum !== null && currentText.length > 0) {
  if (!questions[currentNum]) {
    questions[currentNum] = currentText.join(" ");
  }
}

console.log(`Parsed ${Object.keys(questions).length} questions from file`);

// Get existing questions from DB
const { data: existing } = await supabase
  .from("study_questions")
  .select("id, sort_order, question")
  .eq("subject", "physics")
  .eq("year", parseInt(year))
  .eq("category", "objective")
  .order("sort_order");

const dbMap = {};
for (const q of existing) {
  dbMap[q.sort_order] = q;
}
console.log(`Found ${Object.keys(dbMap).length} questions in DB`);

let updated = 0;
let skipped = 0;

for (const [numStr, questionText] of Object.entries(questions)) {
  const num = parseInt(numStr);
  const dbQ = dbMap[num];
  if (!dbQ) {
    console.log(`#${num}: NOT FOUND in DB — skipping`);
    skipped++;
    continue;
  }

  const { error } = await supabase
    .from("study_questions")
    .update({ question: questionText })
    .eq("id", dbQ.id);

  if (error) {
    console.error(`#${num}: ERROR — ${error.message}`);
    skipped++;
  } else {
    updated++;
    console.log(`#${num}: UPDATED ✓`);
  }
}

console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
