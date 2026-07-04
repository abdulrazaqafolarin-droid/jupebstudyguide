import { readFileSync, writeFileSync } from 'fs';

const BASE = 'C:/Users/HP/Downloads/jupebstudyguide-main/jupebstudyguide-main';
const qs = JSON.parse(readFileSync(BASE + '/src/data/new-questions/math/2015.json', 'utf-8'));

// Fix: $sqrt{2}$ → $\sqrt{2}$ (add missing backslash before sqrt)
// The previous step already wrapped in $...$ but the sqrt was not converted to \sqrt
let mod = 0;
for (const q of qs) {
  if (q.question) {
    const old = q.question;
    q.question = q.question.replace(/\$sqrt\{/g, '$\\sqrt{');
    if (q.question !== old) mod++;
  }
  if (q.options) {
    for (const opt of q.options) {
      if (opt.text) {
        const old = opt.text;
        opt.text = opt.text.replace(/\$sqrt\{/g, '$\\sqrt{');
        if (opt.text !== old) mod++;
      }
    }
  }
  if (q.explanation) {
    const old = q.explanation;
    q.explanation = q.explanation.replace(/\$sqrt\{/g, '$\\sqrt{');
    if (q.explanation !== old) mod++;
  }
}
console.log('Fields fixed:', mod);

writeFileSync(BASE + '/src/data/new-questions/math/2015.json', JSON.stringify(qs, null, 2), 'utf-8');

// Verify raw JSON
const raw = readFileSync(BASE + '/src/data/new-questions/math/2015.json', 'utf-8');
const idx = raw.indexOf('sqrt');
if (idx > 0) {
  console.log('Raw JSON around sqrt:', JSON.stringify(raw.substring(Math.max(0, idx - 15), idx + 20)));
}

// Also check the parsed version
const v = JSON.parse(raw);
console.log('Q1 opt C:', JSON.stringify(v[0].options[2].text));
console.log('Q10 opt A:', JSON.stringify(v[9].options[0].text));
console.log('Q10 opt B:', JSON.stringify(v[9].options[1].text));
