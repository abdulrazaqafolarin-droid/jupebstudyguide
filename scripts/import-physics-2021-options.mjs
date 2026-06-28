import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const SUPABASE_URL = "https://gzyczowqqywesqhqqpdi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const text = readFileSync("C:/Users/HP/Downloads/pphysics 2021.txt", "utf-8");

const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

const questions = [];
let current = null;

for (const line of lines) {
  const numMatch = line.match(/^\*\*(\d+)\.\*\*$/);
  if (numMatch) {
    if (current) questions.push(current);
    current = { num: parseInt(numMatch[1]), options: [], correct: null };
    continue;
  }
  const optMatch = line.match(/^([A-D])\.\s(.+?)(?:\s✓)?$/);
  if (optMatch && current) {
    const label = optMatch[1];
    let text = optMatch[2];
    const isCorrect = line.includes("✓");
    if (text.endsWith(" ✓")) text = text.slice(0, -2);
    current.options.push({ label, text: text.trim() });
    if (isCorrect) current.correct = label;
  }
}
if (current) questions.push(current);

console.log(`Parsed ${questions.length} questions`);

const existingMap = new Map();
const { data: existing } = await supabase
  .from("study_questions")
  .select("id, sort_order, question, image_url")
  .eq("subject", "physics")
  .eq("year", 2021)
  .eq("category", "objective");

if (existing) {
  for (const q of existing) {
    existingMap.set(q.sort_order, q);
  }
}
console.log(`Found ${existingMap.size} existing questions in DB`);

let created = 0;
let updated = 0;

for (const q of questions) {
  const existingQ = existingMap.get(q.num);
  const id = existingQ
    ? existingQ.id
    : `phy-2021-mq-${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`;

  const { error } = await supabase.from("study_questions").upsert(
    {
      id,
      subject: "physics",
      year: 2021,
      category: "objective",
      question: existingQ ? existingQ.question : null,
      image_url: existingQ ? existingQ.image_url : null,
      options: JSON.stringify(q.options),
      correct_answer: q.correct,
      difficulty: "medium",
      sort_order: q.num,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error(`Error on #${q.num}: ${error.message}`);
  } else {
    if (existingQ) {
      updated++;
    } else {
      created++;
    }
    console.log(`#${q.num} ${existingQ ? "UPDATED" : "CREATED"} — correct: ${q.correct}`);
  }
}

console.log(`\nDone! Created: ${created}, Updated: ${updated}`);
