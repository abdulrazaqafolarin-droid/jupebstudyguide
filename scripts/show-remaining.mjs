import fs from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'src/data/new-questions');
let remaining = [];

const subjects = fs.readdirSync(DIR);
for (const subject of subjects) {
  const sd = path.join(DIR, subject);
  if (!fs.statSync(sd).isDirectory()) continue;
  for (const yf of fs.readdirSync(sd).filter(f => f.endsWith('.json'))) {
    const questions = JSON.parse(fs.readFileSync(path.join(sd, yf), 'utf-8'));
    for (const q of questions) {
      if (q.category === 'objective' && !q.correctAnswer) {
        remaining.push({ file: `${subject}/${yf}`, ...q });
      }
    }
  }
}

console.log(`Remaining unanswered: ${remaining.length}`);
for (const r of remaining) {
  console.log(`\n[${r.file}] ${r.question.substring(0, 100)}`);
  console.log(`  ${r.options.map(o => `${o.label}. ${o.text.substring(0, 50)}`).join(' | ')}`);
}
