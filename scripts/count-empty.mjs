import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src', 'data', 'new-questions');
let total = 0, need = 0;
for (const subj of fs.readdirSync(DATA_DIR)) {
  const sd = path.join(DATA_DIR, subj);
  if (!fs.statSync(sd).isDirectory()) continue;
  for (const f of fs.readdirSync(sd).filter(x => x.endsWith('.json'))) {
    const qs = JSON.parse(fs.readFileSync(path.join(sd, f), 'utf-8'));
    const objs = qs.filter(q => q.category === 'objective');
    const empty = objs.filter(q => !q.correctAnswer);
    total += objs.length;
    need += empty.length;
    console.log(`${subj}/${f}: ${objs.length} obj, ${empty.length} need answers`);
  }
}
console.log(`\nTOTAL: ${total} objective, ${need} need answers`);
