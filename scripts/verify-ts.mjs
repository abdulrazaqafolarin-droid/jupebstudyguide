import fs from 'fs';
['physics','chemistry','biology','math'].forEach(s => {
  const c = fs.readFileSync(`src/data/new-data-files/${s}-imported.ts`, 'utf-8');
  const answers = c.match(/correctAnswer: "[A-Z]"/g);
  const tbds = (c.match(/"TBD"/g) || []).length;
  console.log(`${s}: ${answers ? answers.length : 0} answered, ${tbds} TBD`);
});
