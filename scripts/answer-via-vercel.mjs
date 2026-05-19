import fs from 'fs';
import path from 'path';

const API_URL = 'https://jupebstudyguide-main.vercel.app/api/answer';

async function answerBatch(questions) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questions }),
  });
  const data = await res.json();
  return data.answers || [];
}

async function main() {
  const DATA_DIR = path.join(process.cwd(), 'src', 'data', 'new-questions');
  const subjects = fs.readdirSync(DATA_DIR);

  for (const subject of subjects) {
    const sd = path.join(DATA_DIR, subject);
    if (!fs.statSync(sd).isDirectory()) continue;

    for (const yf of fs.readdirSync(sd).filter(f => f.endsWith('.json'))) {
      const filePath = path.join(sd, yf);
      const questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const mcqs = questions.filter(q => q.category === 'objective' && !q.correctAnswer);

      if (mcqs.length === 0) continue;

      console.log(`\nAnswering ${subject} ${yf.replace('.json','')} - ${mcqs.length} MCQs...`);

      for (let i = 0; i < mcqs.length; i += 20) {
        const batch = mcqs.slice(i, i + 20);
        console.log(`  Batch ${Math.floor(i/20) + 1} (${batch.length} questions)...`);
        const answers = await answerBatch(batch);

        for (const ans of answers) {
          const idx = ans.idx - 1;
          if (idx >= 0 && idx < batch.length) {
            batch[idx].correctAnswer = ans.correctAnswer || 'TBD';
            batch[idx].explanation = ans.explanation || '';
          }
        }
        console.log(`    Got ${answers.length} answers`);
      }

      fs.writeFileSync(filePath, JSON.stringify(questions, null, 2));
    }
  }

  console.log('\nDone! All questions answered.');
}

main().catch(console.error);
