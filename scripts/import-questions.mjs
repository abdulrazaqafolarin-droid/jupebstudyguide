import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTRACTED_DIR = path.join(__dirname, '..', 'extracted-text');
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'data', 'new-questions');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function parseFileInfo(filename) {
  const name = filename.replace('.txt', '');
  let subject = null, year = null;
  if (/biology/i.test(name)) subject = 'biology';
  else if (/chemistry/i.test(name)) subject = 'chemistry';
  else if (/physics/i.test(name)) subject = 'physics';
  else if (/mathematics|math/i.test(name)) subject = 'math';
  const years = [...name.matchAll(/(20\d\d)/g)].map(m => parseInt(m[1]));
  // Prefer the first year that's NOT a current/photo timestamp year (2025, 2026)
  // Typically exam years are 2015-2024, so prefer those
  const examYear = years.find(y => y >= 2014 && y <= 2025);
  if (examYear) year = examYear;
  else if (years.length > 0) year = years[0];
  const isPractical = /practical/i.test(name);
  return { subject, year, isPractical, name };
}

function extractMCQs(text) {
  // Remove page headers
  let clean = text.replace(/=== PAGE \d+ ===/g, '');
  clean = clean.replace(/Alevelschool\.com\.ng\s+\d+/g, '');
  clean = clean.replace(/JOINT UNIVERSITIES.*?BOARD.*?(?=\d+\.)/gs, '');
  clean = clean.replace(/SECTION [AB].*?(?=\d+\.)/gs, '');
  clean = clean.replace(/Answer ALL Questions/gi, '');
  clean = clean.replace(/^\d+\s*$/gm, '');

  const questions = [];
  // Split by numbered question pattern: "N. " or "N.  "
  const blocks = clean.split(/(?=\b(\d+)\.\s{2,})/);

  for (const block of blocks) {
    const qMatch = block.match(/^(\d+)\.\s+(.+?)$/s);
    if (!qMatch) continue;

    let qText = qMatch[2].trim();
    const qNum = parseInt(qMatch[1]);

    // Extract options: A. text B. text C. text D. text (possibly with E.)
    const optPattern = /([A-E])\.\s*([^\n]*?)(?=\s+[A-E]\.\s|$)/g;
    const options = [];
    let optMatch;
    while ((optMatch = optPattern.exec(qText)) !== null) {
      options.push({ label: optMatch[1], text: optMatch[2].trim() });
    }

    // Remove options text from question
    let finalQ = qText.replace(/\s*[A-E]\.\s*[^\n]*/g, '').trim();
    // Clean up extra whitespace
    finalQ = finalQ.replace(/\s+/g, ' ');

    if (options.length >= 2 && finalQ.length > 5) {
      questions.push({
        id: `imp-${qNum}`,
        question: finalQ,
        options,
        correctAnswer: '',
        explanation: '',
        difficulty: 'medium',
      });
    }
  }
  return questions;
}

function extractTheories(text) {
  const theories = [];
  const sections = text.split(/SECTION B|ESSAY QUESTIONS|Answer FOUR/gi);
  if (sections.length < 2) return theories;

  const essayText = sections.slice(1).join('\n');
  const blocks = essayText.split(/(?=\b(\d+)\.\s*(?:\([a-z]\)|\n))/);

  for (const block of blocks) {
    if (block.length < 50) continue;
    theories.push({
      question: block.trim().substring(0, 500),
      answerGuide: '',
      markScheme: [],
      totalMarks: 10,
    });
  }
  return theories;
}

const files = fs.readdirSync(EXTRACTED_DIR).filter(f => f.endsWith('.txt'));
const allBySubject = {};

for (const file of files) {
  const { subject, year, isPractical } = parseFileInfo(file);
  if (!subject || !year) {
    console.log(`Skipping ${file}: unrecognized`);
    continue;
  }

  const text = fs.readFileSync(path.join(EXTRACTED_DIR, file), 'utf-8');
  if (text.length < 300) {
    console.log(`Skipping ${file}: too small (${text.length} chars)`);
    continue;
  }

  let mcqs, theories;
  try {
    mcqs = extractMCQs(text);
    theories = isPractical ? [] : extractTheories(text);
  } catch (err) {
    console.log(`Skipping ${file}: parse error - ${err.message}`);
    continue;
  }
  const cat = isPractical ? 'practical' : 'objective';

  console.log(`${file}: ${(text.length/1024).toFixed(0)} KB, ${mcqs.length} MCQs, ${theories.length} theories`);

  if (mcqs.length > 0 || theories.length > 0) {
    if (!allBySubject[subject]) allBySubject[subject] = {};
    if (!allBySubject[subject][year]) allBySubject[subject][year] = { objective: [], theory: [], practical: [] };

    const target = isPractical ? 'practical' : 'objective';
    for (const q of mcqs) {
      q.subject = subject;
      q.year = year;
      q.category = target;
      q.id = `${subject.substring(0,3)}-${year}-import-${allBySubject[subject][year][target].length + 1}`;
      allBySubject[subject][year][target].push(q);
    }
    for (const t of theories) {
      t.subject = subject;
      t.year = year;
      t.category = 'theory';
      t.id = `${subject.substring(0,3)}-${year}-import-theory-${allBySubject[subject][year].theory.length + 1}`;
      allBySubject[subject][year].theory.push(t);
    }
  }
}

// Write individual year JSON files
for (const [subject, years] of Object.entries(allBySubject)) {
  const subjectDir = path.join(OUTPUT_DIR, subject);
  if (!fs.existsSync(subjectDir)) fs.mkdirSync(subjectDir, { recursive: true });
  for (const [year, data] of Object.entries(years)) {
    const allQ = [...data.objective, ...data.theory, ...data.practical];
    fs.writeFileSync(path.join(subjectDir, `${year}.json`), JSON.stringify(allQ, null, 2));
  }
}

// Summary
console.log('\n=== SUMMARY ===');
for (const [subject, years] of Object.entries(allBySubject)) {
  let total = 0;
  for (const [year, data] of Object.entries(years)) {
    const count = data.objective.length + data.theory.length + data.practical.length;
    total += count;
    console.log(`  ${subject} ${year}: ${data.objective.length} obj + ${data.theory.length} theory + ${data.practical.length} prac = ${count}`);
  }
  console.log(`  ${subject} TOTAL: ${total}`);
}
