import fs from 'fs';
const dir = 'src/data/study-questions/';
for (const s of ['physics','chemistry','biology','math']) {
  const c = fs.readFileSync(dir + s + '.ts', 'utf-8');
  const tbd = (c.match(/TBD/g) || []).length;
  const total = (c.match(/correctAnswer:/g) || []).length;
  console.log(`${s}: ${total} answers, ${tbd} TBD`);
}
console.log('---');
const dir2 = 'src/data/imported-questions/';
for (const s of ['physics','chemistry','biology','math']) {
  const c = fs.readFileSync(dir2 + s + '.ts', 'utf-8');
  const tbd = (c.match(/TBD/g) || []).length;
  const total = (c.match(/correctAnswer:/g) || []).length;
  console.log(`imported-${s}: ${total} answers, ${tbd} TBD`);
}
