import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'src', 'data', 'new-questions');
const args = process.argv.slice(2);
const API_KEY = args[0] || process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.log('Usage: GEMINI_API_KEY=your_key node scripts/answer-with-gemini.mjs');
  console.log('Get your key from: https://aistudio.google.com/app/apikey');
  process.exit(1);
}

async function callGemini(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
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

async function answerBatch(questions, subject, year) {
  const qText = questions.map((q, i) =>
    `${i + 1}. ${q.question}\n${q.options.map(o => `${o.label}. ${o.text}`).join('\n')}`
  ).join('\n\n');

  const prompt = `You are a JUPEB exam expert for ${subject}. For each MCQ, determine the correct answer and give a brief explanation.

Reply with ONLY a JSON array:
[{ "idx": 1, "correctAnswer": "A", "explanation": "..." }]

Questions (${subject} ${year}):
${qText}`;

  const response = await callGemini(prompt);
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('  Failed to parse Gemini response');
    return [];
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error('  Invalid JSON from Gemini');
    return [];
  }
}

async function main() {
  const subjects = fs.readdirSync(DATA_DIR);
  let totalAnswered = 0;
  let totalSkipped = 0;

  for (const subject of subjects) {
    const subjDir = path.join(DATA_DIR, subject);
    if (!fs.statSync(subjDir).isDirectory()) continue;

    for (const yf of fs.readdirSync(subjDir).filter(f => f.endsWith('.json'))) {
      const filePath = path.join(subjDir, yf);
      const questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const mcqs = questions.filter(q =>
        q.category === 'objective' &&
        (!q.correctAnswer || q.correctAnswer === 'TBD' || q.correctAnswer === 'tbd')
      );

      if (mcqs.length === 0) {
        console.log(`${subject} ${yf.replace('.json','')}: all answered, skipping`);
        continue;
      }

      console.log(`\n${subject} ${yf.replace('.json','')}: ${mcqs.length} to answer`);

      // Batch in groups of 15
      for (let i = 0; i < mcqs.length; i += 15) {
        const batch = mcqs.slice(i, i + 15);
        const answers = await answerBatch(batch, subject, yf.replace('.json',''));
        let answered = 0;

        for (const ans of answers) {
          const idx = ans.idx - 1;
          if (idx >= 0 && idx < batch.length) {
            batch[idx].correctAnswer = ans.correctAnswer || 'TBD';
            batch[idx].explanation = ans.explanation || '';
            answered++;
          }
        }

        totalAnswered += answered;
        totalSkipped += (batch.length - answered);
        console.log(`  Batch ${Math.floor(i/15) + 1}: ${answered}/${batch.length} answered`);
      }

      fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
    }
  }

  console.log(`\nDone! ${totalAnswered} answered, ${totalSkipped} skipped`);
  console.log('Run next: node scripts/generate-ts.mjs  (to update TS files)');
}

main().catch(console.error);
