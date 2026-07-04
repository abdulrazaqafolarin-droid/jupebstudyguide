import { readFileSync, writeFileSync } from 'fs';

const BASE = 'C:/Users/HP/Downloads/jupebstudyguide-main/jupebstudyguide-main';
const qs = JSON.parse(readFileSync(BASE + '/src/data/new-questions/math/2015.json', 'utf-8'));

// Comprehensive math detection
function hasMath(text) {
  if (!text) return false;
  // Unicode math operators and symbols
  if (/[×÷±=<>≤≥≈≠≡∫∑∏√∂∆∇∞∅∪∩∈⊂⊆⇒⇔→←∃∀∴∵πθφαβγδεηικλμνξοπρςστυφχψω]/.test(text)) return true;
  // Unicode superscripts (², ³, ⁰-⁹, etc.)
  if (/[\u2070-\u2079\u207B\u00B9\u00B2\u00B3\u1D48-\u1D4C]/.test(text)) return true;
  // Unicode subscripts
  if (/[\u2080-\u2089\u2090-\u209C]/.test(text)) return true;
  // Square root / cube root
  if (/[√∛∜]/.test(text)) return true;
  // Greek letters (common ones)
  if (/[α-ωΑ-Ωπθρφη]/.test(text)) return true;
  // En-dash / minus used in math context
  if (/\u2013|\u2212/.test(text)) return true;
  // Contains sqrt{ pattern
  if (/sqrt\{/i.test(text)) return true;
  // Trig, log, limit
  if (/\b(sin|cos|tan|csc|sec|cot|log|ln|lim|det|adj|exp)\b/i.test(text)) return true;
  // Contains e^ or e⁻ for exponential
  if (/e[⁻\^]/i.test(text)) return true;
  // Matrix with semicolons
  if (/[\[|][^\]|]+;[^\]|]+[\]|]/.test(text)) return true;
  // Contains slash with numbers or variables on both sides
  if (/[a-zA-Z0-9)\]]\s*\/\s*[a-zA-Z0-9(]/.test(text)) return true;
  // Contains unicode vector dot
  if (/[⋅∙∘]/.test(text)) return true;
  return false;
}

function hasLongEnglish(text) {
  const words = text.split(/\s+/);
  const long = words.filter(w => w.length >= 5 && /^[a-zA-Z]+$/.test(w));
  return long.length >= 3;
}

function isPlainNum(text) {
  return /^[+\-–−]?\d+(\.\d+)?$/.test(text.trim());
}

// Undo ALL dollar wrapping for a clean slate
for (const q of qs) {
  if (q.question) q.question = q.question.replace(/^\$(.*)\$$/s, '$1');
  if (q.options) {
    for (const opt of q.options) {
      if (opt.text) opt.text = opt.text.replace(/^\$(.*)\$$/s, '$1');
    }
  }
  if (q.explanation) q.explanation = q.explanation.replace(/^\$(.*)\$$/s, '$1');
}

// Now apply wrapping
let qw = 0, ow = 0, sf = 0;

for (const q of qs) {
  // Fix sqrt{ → \sqrt{ in any text
  const fixSqrt = (t) => t ? t.replace(/(?<!\\)sqrt\{/g, '\\sqrt{') : t;
  
  if (q.question) {
    const old = q.question;
    q.question = fixSqrt(q.question);
    if (q.question !== old) sf++;
  }
  if (q.options) {
    for (const opt of q.options) {
      if (opt.text) {
        const old = opt.text;
        opt.text = fixSqrt(opt.text);
        if (opt.text !== old) sf++;
      }
    }
  }
  if (q.explanation) {
    const old = q.explanation;
    q.explanation = fixSqrt(q.explanation);
    if (q.explanation !== old) sf++;
  }

  // Wrap question
  if (q.question && !q.question.includes('$') && hasMath(q.question) && !hasLongEnglish(q.question)) {
    q.question = '$' + q.question + '$';
    qw++;
  }

  // Wrap options
  if (q.options) {
    for (const opt of q.options) {
      if (opt.text && !opt.text.includes('$') && hasMath(opt.text) && !hasLongEnglish(opt.text) && !isPlainNum(opt.text)) {
        opt.text = '$' + opt.text.trim() + '$';
        ow++;
      }
    }
  }
}

console.log('Sqrt fixes:', sf);
console.log('Questions wrapped:', qw);
console.log('Options wrapped:', ow);

writeFileSync(BASE + '/src/data/new-questions/math/2015.json', JSON.stringify(qs, null, 2), 'utf-8');

// Verify
const v = JSON.parse(readFileSync(BASE + '/src/data/new-questions/math/2015.json', 'utf-8'));
const qD = v.filter(q => q.question.includes('$')).length;
const oD = v.reduce((s, q) => s + q.options.filter(o => o.text.includes('$')).length, 0);
console.log('Final: Q=' + qD + '/48 with $, O=' + oD + ' with $');

// Show notable cases
[0, 2, 3, 6, 9, 11, 12, 22, 24, 27, 34, 37].forEach(i => {
  const q = v[i];
  console.log('Q' + (i+1) + ': [' + (q.question.includes('$')?'$':' ') + '] ' + q.question.replace(/^\$|\$$/g,'').substring(0, 80));
  console.log('  opts: ' + q.options.map(o => (o.text.includes('$')?'$':' ') + o.text.replace(/^\$|\$$/g,'').substring(0, 20)).join(', '));
});
