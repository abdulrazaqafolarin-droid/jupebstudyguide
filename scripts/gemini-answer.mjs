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

async function callGemini(prompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await new Promise(r => setTimeout(r, 2000)); // rate limit buffer
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_KEY}`,
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
        if ((res.status === 503 || res.status === 429) && attempt < retries) {
          const wait = attempt * 8000;
          console.log(`    ${res.status} overload, retry ${attempt}/${retries} in ${wait/1000}s...`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        throw new Error(`Gemini error (${res.status}): ${err}`);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (e) {
      if (attempt < retries && !e.message?.startsWith('Gemini error')) {
        const wait = attempt * 5000;
        console.log(`    network retry ${attempt}/${retries} in ${wait/1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }
  return '';
}

async function answerBatch(questions) {
  const qText = questions.map((q, i) =>
    `${i + 1}. ${q.question}\n${q.options.map(o => `${o.label}. ${o.text}`).join('\n')}`
  ).join('\n\n');

  const prompt = `You are a JUPEB exam expert. For each MCQ below, determine the SINGLE correct answer and provide a 1-2 sentence explanation.

Return ONLY a valid JSON array. No other text, no markdown formatting.
Example: [{"idx":1,"correctAnswer":"A","explanation":"..."}]

Questions:
${qText}`;

  const response = await callGemini(prompt);
  try {
    let cleaned = response.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    }
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1) throw new Error('No JSON array found');
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (e) {
    console.error('  Parse error:', e.message.substring(0, 80));
    console.error('  Response:', response.replace(/\n/g, ' ').substring(0, 250));
    return [];
  }
}

async function main() {
  const subjects = fs.readdirSync(DATA_DIR);
  let totalAnswered = 0;
  let totalSkipped = 0;

  for (const subject of subjects) {
    const subjectDir = path.join(DATA_DIR, subject);
    if (!fs.statSync(subjectDir).isDirectory()) continue;

    for (const yf of fs.readdirSync(subjectDir).filter(f => f.endsWith('.json'))) {
      const filePath = path.join(subjectDir, yf);
      const questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const mcqs = questions.filter(q => q.category === 'objective' && (!q.correctAnswer || q.correctAnswer === 'TBD'));

      if (mcqs.length === 0) {
        console.log(`${subject}/${yf}: all answered`);
        continue;
      }

      console.log(`\n${subject} ${yf.replace('.json', '')}: ${mcqs.length} unanswered`);

      for (let i = 0; i < mcqs.length; i += 15) {
        const batch = mcqs.slice(i, i + 15);
        console.log(`  Batch ${Math.floor(i / 15) + 1}/${Math.ceil(mcqs.length / 15)} (${batch.length} Qs)...`);
        const answers = await answerBatch(batch);

        for (const ans of answers) {
          const idx = ans.idx - 1;
          if (idx >= 0 && idx < batch.length) {
            batch[idx].correctAnswer = ans.correctAnswer || 'TBD';
            batch[idx].explanation = ans.explanation || '';
            totalAnswered++;
          }
        }
        console.log(`    got ${answers.length} answers`);
      }

      fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
    }
  }

  console.log(`\nDone! ${totalAnswered} questions answered.`);
  console.log('Run: node scripts/generate-ts.mjs');
  console.log('Then copy src/data/new-data-files/*.ts to src/data/imported-questions/');
}

main().catch(console.error);
