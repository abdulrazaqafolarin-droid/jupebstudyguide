import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://gzyczowqqywesqhqqpdi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const year = 2023;

// Get all questions sorted by sort_order descending
const { data: questions, error } = await supabase
  .from("study_questions")
  .select("id, sort_order, question, subject, category, correct_answer, difficulty, options")
  .eq("subject", "physics")
  .eq("year", year)
  .eq("category", "objective")
  .order("sort_order", { ascending: false });

if (error) { console.error("Error fetching:", error.message); process.exit(1); }

console.log(`Fetched ${questions.length} questions`);

// Step 1: Shift sort_orders 21-50 up by 1 (process descending to avoid conflicts)
for (const q of questions) {
  if (q.sort_order >= 21 && q.sort_order <= 50) {
    const newSort = q.sort_order + 1;
    console.log(`  Shifting #${q.sort_order} → #${newSort} (${(q.question || '').substring(0, 40)})`);
    const { error: err } = await supabase
      .from("study_questions")
      .update({ sort_order: newSort })
      .eq("id", q.id);
    if (err) { console.error(`  ERROR shifting #${q.sort_order}: ${err.message}`); }
  }
}

// Step 2: Move old Q20 text to sort_order 21
const q20 = questions.find(q => q.sort_order === 20);
if (q20) {
  console.log(`\nMoving Q20 → Q21: "${(q20.question || '').substring(0, 50)}"`);
  const { error: err } = await supabase
    .from("study_questions")
    .update({ sort_order: 21 })
    .eq("id", q20.id);
  if (err) { console.error(`  ERROR moving Q20: ${err.message}`); }
  else { console.log("  Done"); }
}

// Step 3: Insert new Q20
const newText = "Calculate the period of vibration of sound waves with a wavelength of 220cm if the speed of sound in air is 340m/s.";
const newId = `phy-${year}-mq-${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`;

console.log(`\nInserting new Q20: "${newText.substring(0, 50)}..."`);
const { error: err2 } = await supabase.from("study_questions").insert({
  id: newId,
  subject: "physics",
  year: year,
  category: "objective",
  question: newText,
  correct_answer: null,
  difficulty: "medium",
  sort_order: 20,
});
if (err2) { console.error(`  ERROR inserting Q20: ${err2.message}`); }
else { console.log(`  Done — id: ${newId}`); }

console.log("\nVerifying final state...");
const { data: final } = await supabase
  .from("study_questions")
  .select("sort_order, question")
  .eq("subject", "physics")
  .eq("year", year)
  .eq("category", "objective")
  .order("sort_order")
  .gte("sort_order", 19)
  .lte("sort_order", 22);

for (const q of final) {
  console.log(`  #${q.sort_order}: ${(q.question || 'NULL').substring(0, 70)}`);
}
