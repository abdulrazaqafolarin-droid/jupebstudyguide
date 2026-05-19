import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'src', 'data', 'new-questions');
const OPENROUTER_KEY = process.env.VITE_OPENROUTER_API_KEY || '';

if (!OPENROUTER_KEY) {
  console.log('VITE_OPENROUTER_API_KEY not set. Using local scoring for simple questions...');
  await fallbackAnswerScoring();
  process.exit(0);
}

async function callGemini(prompt) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3.1-pro-preview',
      messages: [{
        role: 'user',
        content: prompt,
      }],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function answerBatch(questions) {
  const qText = questions.map((q, i) =>
    `${i + 1}. ${q.question}\n${q.options.map(o => `${o.label}. ${o.text}`).join('\n')}`
  ).join('\n\n');

  const prompt = `You are a JUPEB exam expert. For each MCQ below, determine the SINGLE correct answer and provide a brief explanation.

Reply with ONLY a JSON array:
[{ "idx": 1, "correctAnswer": "A", "explanation": "..." }]

Questions:
${qText}`;

  const response = await callGemini(prompt);
  try {
    const json = JSON.parse(response.match(/\[[\s\S]*\]/)?.[0] || '[]');
    return json;
  } catch {
    console.error('Failed to parse Gemini response');
    return [];
  }
}

async function fallbackAnswerScoring() {
  console.log('Using basic answer derivation (no API key)...');
  const subjects = fs.readdirSync(DATA_DIR);
  let total = 0;

  for (const subject of subjects) {
    const subjectDir = path.join(DATA_DIR, subject);
    if (!fs.statSync(subjectDir).isDirectory()) continue;

    for (const yf of fs.readdirSync(subjectDir).filter(f => f.endsWith('.json'))) {
      const filePath = path.join(subjectDir, yf);
      const questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      let updated = false;

      for (const q of questions) {
        if (q.category !== 'objective') continue;
        if (q.correctAnswer) continue;

        // For questions without answers, try to derive from common knowledge
        const lowerQ = q.question.toLowerCase();
        const opts = q.options || [];

        // Mark as TBD for manual review
        q.correctAnswer = 'TBD';
        q.explanation = 'Answer pending verification';
        q.difficulty = 'medium';
        updated = true;
        total++;
      }

      if (updated) {
        fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
      }
    }
  }
  console.log(`Marked ${total} questions for answer verification`);
}

async function main() {
  const subjects = fs.readdirSync(DATA_DIR);

  for (const subject of subjects) {
    const subjectDir = path.join(DATA_DIR, subject);
    if (!fs.statSync(subjectDir).isDirectory()) continue;

    for (const yf of fs.readdirSync(subjectDir).filter(f => f.endsWith('.json'))) {
      const filePath = path.join(subjectDir, yf);
      const questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const mcqs = questions.filter(q => q.category === 'objective' && !q.correctAnswer);

      if (mcqs.length === 0) continue;

      console.log(`\nAnswering ${subject} ${yf.replace('.json','')} - ${mcqs.length} MCQs...`);

      // Batch in groups of 20
      for (let i = 0; i < mcqs.length; i += 20) {
        const batch = mcqs.slice(i, i + 20);
        const answers = await answerBatch(batch);

        for (const ans of answers) {
          const idx = ans.idx - 1;
          if (idx >= 0 && idx < batch.length) {
            batch[idx].correctAnswer = ans.correctAnswer || 'TBD';
            batch[idx].explanation = ans.explanation || '';
          }
        }

        console.log(`  Batch ${Math.floor(i/20) + 1}: ${answers.length} answers`);
      }

      fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
    }
  }

  console.log('\nDone! All answers derived. Run merge-data.mjs to update TypeScript files.');
}

if (OPENROUTER_KEY) {
  main().catch(console.error);
}
