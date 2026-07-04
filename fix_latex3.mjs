import { readFileSync, writeFileSync } from 'fs';

const BASE = 'C:/Users/HP/Downloads/jupebstudyguide-main/jupebstudyguide-main';
const qs = JSON.parse(readFileSync(BASE + '/src/data/new-questions/math/2015.json', 'utf-8'));

// Fix: inside any $...$ block, replace sqrt{ with \sqrt{
function fixSqrtInDollars(text) {
  if (!text || !text.includes('sqrt{')) return text;
  // Match $...$ blocks and fix sqrt{ → \sqrt{ inside them
  return text.replace(/\$[^$]*\$/g, (m) => {
    if (m.includes('sqrt{') && !m.includes('\\sqrt{')) {
      return m.replace(/sqrt\{/g, '\\sqrt{');
    }
    return m;
  });
}

let mod = 0;
for (const q of qs) {
  if (q.question) {
    const old = q.question;
    q.question = fixSqrtInDollars(q.question);
    if (q.question !== old) mod++;
  }
  if (q.options) {
    for (const opt of q.options) {
      if (opt.text) {
        const old = opt.text;
        opt.text = fixSqrtInDollars(opt.text);
        if (opt.text !== old) mod++;
      }
    }
  }
  if (q.explanation) {
    const old = q.explanation;
    q.explanation = fixSqrtInDollars(q.explanation);
    if (q.explanation !== old) mod++;
  }
}
console.log('Fields fixed:', mod);

writeFileSync(BASE + '/src/data/new-questions/math/2015.json', JSON.stringify(qs, null, 2), 'utf-8');

// Verify
const raw = readFileSync(BASE + '/src/data/new-questions/math/2015.json', 'utf-8');
const v = JSON.parse(raw);
console.log('Q1 opt C:', JSON.stringify(v[0].options[2].text));
console.log('Q10 opt A:', JSON.stringify(v[9].options[0].text));
console.log('Q10 opt B:', JSON.stringify(v[9].options[1].text));
console.log('Q10 opt D:', JSON.stringify(v[9].options[3].text));
console.log('Q12 question:', JSON.stringify(v[11].question.substring(0, 60)));
