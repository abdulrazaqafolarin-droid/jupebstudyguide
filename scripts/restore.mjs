import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const SUPABASE_URL = "https://gzyczowqqywesqhqqpdi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const [,, yearStr, filePath] = process.argv;
const year = parseInt(yearStr);

// Known old ID → sort_order mappings (from original DB state before any changes)
const knownIds = {
  2021: {
    1: "phy-2021-mq-tdjaoceg",
    2: "phy-2021-mq-mjl3xxwt",
    3: "phy-2021-mq-r8bdj5cn",
    4: "phy-2021-mq-ut89s9e6",
    5: "phy-2021-mq-yfznnjj7",
    6: "phy-2021-mq-2928y2ee",
    7: "phy-2021-mq-7hwll4lx",
    10: "phy-2021-mq-b3blsle0",
  },
  2023: {
    1: "phy-2023-mq-dlrvk39y",
    2: "phy-2023-mq-kk9vgjfa",
    3: "phy-2023-mq-tpzzl94r",
    4: "phy-2023-mq-y0bkgccd",
    5: "phy-2023-mq-pao1pij0",
    6: "phy-2023-mq-tvsjfczi",
    7: "phy-2023-mq-x9246zah",
    8: "phy-2023-mq-zrjcx0hd",
    9: "phy-2023-mq-61tcyu4e",
    10: "phy-2023-mq-86il6n0g",
    11: "phy-2023-mq-czfp56e9",
    12: "phy-2023-mq-gdaefdoo",
    13: "phy-2023-mq-kij3lnqy",
    14: "phy-2023-mq-n9xj4ae8",
    15: "phy-2023-mq-qjhb0um7",
    16: "phy-2023-mq-u77g66v3",
    17: "phy-2023-mq-w75l4xv2",
  },
};

const yearKnown = knownIds[year] || {};

// Parse file options
const text = readFileSync(filePath, "utf-8");
const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

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

// Fix 2017 Q19 duplicate A
if (year === 2017) {
  const q19 = parsed.get(19);
  if (q19 && q19.options.length > 4) {
    const seen = new Set();
    parsed.set(19, {
      options: q19.options.filter(o => { const k = o.label; if (seen.has(k)) return false; seen.add(k); return true; }),
      correct: q19.correct,
    });
  }
}

// Check storage for existing images by old IDs
const { data: storageFiles } = await supabase.storage.from("question-images").list();
const storageMap = new Map();
for (const f of storageFiles) {
  const id = f.name.replace(/\.\w+$/, "");
  storageMap.set(id, f.name);
}

// Import questions
const sorted = [...parsed.entries()].sort(([a], [b]) => a - b);
let inserted = 0, errors = 0, images = 0;

for (const [num, q] of sorted) {
  // Use known old ID if available, otherwise generate new
  const id = yearKnown[num] || `phy-${year}-mq-${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`;

  // Check if a storage file exists for this ID
  let imageUrl = null;
  const oldFile = storageMap.get(id);
  if (oldFile) {
    // Use the old ID directly — storage URL matches automatically
    const { data: urlData } = supabase.storage.from("question-images").getPublicUrl(oldFile);
    imageUrl = urlData.publicUrl;
    images++;
  }

  // For 2021 old questions: they stored image URL in the `question` field
  // Check if the question text should be the image URL
  let questionText = null;
  if (year === 2021 && yearKnown[num] && imageUrl) {
    questionText = imageUrl;
  }

  const { error } = await supabase.from("study_questions").insert({
    id,
    subject: "physics",
    year,
    category: "objective",
    question: questionText,
    image_url: imageUrl,
    options: JSON.stringify(q.options),
    correct_answer: q.correct,
    difficulty: "medium",
    sort_order: num,
  });

  if (error) {
    console.error(`Error #${num} (${id}): ${error.message}`);
    errors++;
  } else {
    inserted++;
    console.log(`#${num} ${id} ${imageUrl ? "📷" : "  "}`);
  }
}

console.log(`\nYear ${year}: Inserted ${inserted}, Errors ${errors}, Images linked: ${images}`);
console.log(`Known old IDs used: ${Object.keys(yearKnown).filter(k => parsed.has(parseInt(k))).length}`);
