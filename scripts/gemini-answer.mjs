import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'src', 'data', 'new-questions');
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

if (!GEMINI_KEY) {
  console.log('Usage: GEMINI_API_KEY=your_key node scripts/gemini-answer.mjs');
  process.exit(1);
}

async function callGemini(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
    return JSON.parse(response.match(/\[[\s\S]*\]/)?.[0] || '[]');
  } catch {
    console.error('Failed to parse response:', response.slice(0, 200));
    return [];
  }
}

async function main() {
  const subjects = fs.readdirSync(DATA_DIR);
  let totalAnswered = 0;

  for (const subject of subjects) {
    const subjectDir = path.join(DATA_DIR, subject);
    if (!fs.statSync(subjectDir).isDirectory()) continue;

    for (const yf of fs.readdirSync(subjectDir).filter(f => f.endsWith('.json'))) {
      const filePath = path.join(subjectDir, yf);
      const questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const mcqs = questions.filter(q => q.category === 'objective' && (!q.correctAnswer || q.correctAnswer === 'TBD'));

      if (mcqs.length === 0) {
        console.log(`${subject}/${yf}: all answered already`);
        continue;
      }

      console.log(`\n${subject} ${yf.replace('.json', '')}: ${mcqs.length} unanswered MCQs`);

      for (let i = 0; i < mcqs.length; i += 20) {
        const batch = mcqs.slice(i, i + 20);
        console.log(`  Batch ${Math.floor(i / 20) + 1}/${Math.ceil(mcqs.length / 20)}...`);
        const answers = await answerBatch(batch);

        for (const ans of answers) {
          const idx = ans.idx - 1;
          if (idx >= 0 && idx < batch.length) {
            batch[idx].correctAnswer = ans.correctAnswer || 'TBD';
            batch[idx].explanation = ans.explanation || '';
            totalAnswered++;
          }
        }
      }

      fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
    }
  }

  console.log(`\nDone! ${totalAnswered} questions answered.`);
  console.log('Then run: node scripts/generate-ts.mjs && node scripts/copy-imports.mjs');
}

main().catch(console.error);
