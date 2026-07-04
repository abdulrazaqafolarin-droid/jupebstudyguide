import { readFileSync, writeFileSync } from 'fs';

const BASE = 'C:/Users/HP/Downloads/jupebstudyguide-main/jupebstudyguide-main';
const qs = JSON.parse(readFileSync(BASE + '/src/data/new-questions/math/2015.json', 'utf-8'));

// Test what the replace actually does
const test = '√2';
const r1 = test.replace(/√(.)/, '\\\\sqrt{$1}');
console.log('Test r1:', JSON.stringify(r1), '| raw:', r1);

const r2 = test.replace(/√(.)/, '\\sqrt{$1}');
console.log('Test r2:', JSON.stringify(r2), '| raw:', r2);

// In .mjs file: '\\' is ONE backslash char, '\\\\' is TWO
// .replace() docs say backslash before a non-special char stays as-is
// So replacement '\\sqrt{$1}' → \sqrt{2} (one backslash)
// And replacement '\\\\sqrt{$1}' → \\sqrt{2} (two backslashes)

// We want ONE backslash: \sqrt{2}
// So we need: replacement string = '\sqrt{$1}' (one backslash in string)
// In JS source: '\\sqrt{$1}' means \sqrt{$1} as the string
const replacement = '\\sqrt{$1}';
console.log('Replacement string:', JSON.stringify(replacement));

function convertSqrt(text) {
  if (!text) return text;
  if (text.includes('\\sqrt')) return text;
  // √(2x+3) → \sqrt{2x+3}
  let result = text.replace(/√\(([^)]*)\)/g, '\\sqrt{$1}');
  // √2 → \sqrt{2}
  result = result.replace(/√([\d{a-zA-Zπθ]+)/g, '\\sqrt{$1}');
  return result;
}

// Test the function
console.log('convertSqrt test:', JSON.stringify(convertSqrt('√2')));
console.log('convertSqrt test:', JSON.stringify(convertSqrt('√(2x+3)')));
console.log('convertSqrt test:', JSON.stringify(convertSqrt('–√2')));

let mod = 0;
for (const q of qs) {
  const oldQ = q.question;
  q.question = convertSqrt(q.question);
  if (q.question !== oldQ) mod++;

  if (q.options) {
    for (const opt of q.options) {
      const oldO = opt.text;
      opt.text = convertSqrt(opt.text);
      if (opt.text !== oldO) mod++;
    }
  }
  if (q.explanation) {
    const oldE = q.explanation;
    q.explanation = convertSqrt(q.explanation);
    if (q.explanation !== oldE) mod++;
  }
}
console.log('Fields modified:', mod);
writeFileSync(BASE + '/src/data/new-questions/math/2015.json', JSON.stringify(qs, null, 2), 'utf-8');

// Verify raw bytes
const raw = readFileSync(BASE + '/src/data/new-questions/math/2015.json', 'utf-8');
const idx = raw.indexOf('sqrt');
if (idx > 0) {
  console.log('Raw JSON around sqrt:', JSON.stringify(raw.substring(Math.max(0, idx - 10), idx + 20)));
}
