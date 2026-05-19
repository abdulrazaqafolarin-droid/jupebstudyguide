import fs from 'fs';
const dir = 'src/data/';
const targets = ['questions-2020-biology.ts','questions-2019-chemistry.ts','questions-2015-actual.ts','questions-2019-physics.ts','questions.ts'];
for (const f of targets) {
  const p = dir + f;
  if (fs.existsSync(p)) {
    const c = fs.readFileSync(p, 'utf-8');
    const lines = c.split('\n').length;
    const hasAns = c.includes('correctAnswer') && c.includes('A');
    const hasTBD = c.includes('TBD');
    console.log(`${f}: ${lines} lines, hasAnswers=${hasAns}, hasTBD=${hasTBD}`);
  }
}
