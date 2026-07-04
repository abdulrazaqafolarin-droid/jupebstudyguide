import { readFileSync, writeFileSync } from 'fs';

const BASE = 'C:/Users/HP/Downloads/jupebstudyguide-main/jupebstudyguide-main';
const qs = JSON.parse(readFileSync(BASE + '/src/data/new-questions/math/2015.json', 'utf-8'));

// Undo the previous question wrapping that might have put English in $...$
// We'll redo it properly

// Helper: check for significant math content
function hasMathContent(text) {
  if (!text) return false;
  if (/[=∫∑∏√∂∆∇∞∅∪∩∈⊂⊆⇒⇔→←∃∀∴∵πθφαβγδεηικλμνξοπρςστυφχψω±×÷]/.test(text)) return true;
  if (/[\u2070-\u2079\u207B\u00B9\u00B2\u00B3]/.test(text)) return true;
  if (/[\u2080-\u2089]/.test(text)) return true;
  if (/sqrt\{/i.test(text)) return true;
  if (/\b(sin|cos|tan|log|ln|lim)\b/i.test(text)) return true;
  if (/e[⁻\^]/i.test(text)) return true;
  // Matrix/determinant with semicolons
  if (/[\[|][^\]|]+;[^\]|]+[\]|]/.test(text)) return true;
  return false;
}

// Helper: check if text contains equations
function hasEquation(text) {
  return /=/.test(text);
}

// Helper: count ratio of math content
function mathRatio(text) {
  const mathChars = (text.match(/[×÷±=<>≤≥≈≠≡∫∑∏√∂∆∇∞∅∪∩∈⊂⊆⇒⇔→←πθφαβγδεηικλμνξοπρςστυφχψω0-9\u2070-\u2079\u207B\u00B9\u00B2\u00B3\u2080-\u2089+\-*/^(){}[\]|,;.]/g) || []).length;
  const totalChars = text.length;
  return totalChars > 0 ? mathChars / totalChars : 0;
}

function hasLongEnglishWords(text) {
  const words = text.split(/\s+/);
  const longWords = words.filter(w => w.length >= 5 && /^[a-zA-Z]+$/.test(w));
  return longWords.length >= 3;
}

// Unwrap questions that were previously wrapped (strip $ at start and end)
for (const q of qs) {
  if (q.question && q.question.startsWith('$') && q.question.endsWith('$')) {
    // Unwrap all, we'll re-wrap only appropriate ones
    q.question = q.question.slice(1, -1);
  }
}

// Now re-wrap properly
let qWrap = 0, optWrap = 0, sqrtFix = 0;

for (const q of qs) {
  // Fix sqrt in existing $ blocks
  if (q.question && q.question.includes('$')) {
    const old = q.question;
    q.question = q.question.replace(/\$([^$]*)\$/g, (m, inner) => {
      const fixed = inner.replace(/(?<!\\)sqrt\{/g, '\\sqrt{');
      return '$' + fixed + '$';
    });
    if (q.question !== old) sqrtFix++;
  }
  if (q.options) {
    for (const opt of q.options) {
      if (opt.text && opt.text.includes('$')) {
        const old = opt.text;
        opt.text = opt.text.replace(/\$([^$]*)\$/g, (m, inner) => {
          const fixed = inner.replace(/(?<!\\)sqrt\{/g, '\\sqrt{');
          return '$' + fixed + '$';
        });
        if (opt.text !== old) sqrtFix++;
      }
    }
  }

  // Wrap question in $ if it has significant math
  // Strategy: wrap if contains math AND is not mostly long English words
  const qHasMath = hasMathContent(q.question);
  const qHasEq = hasEquation(q.question);
  const qEng = hasLongEnglishWords(q.question);
  const qRatio = mathRatio(q.question);
  
  if (qHasMath && !qEng && !q.question.includes('$')) {
    q.question = '$' + q.question + '$';
    qWrap++;
  } else if (qHasEq && qRatio > 0.05 && !q.question.includes('$')) {
    // Even with some English, if it has equations, wrap it
    // The English words render in italics but it's acceptable
    q.question = '$' + q.question + '$';
    qWrap++;
  }

  // Wrap options in $ if they have math and aren't pure English
  if (q.options) {
    for (const opt of q.options) {
      if (opt.text && !opt.text.includes('$')) {
        const oHasMath = hasMathContent(opt.text);
        const oEng = hasLongEnglishWords(opt.text);
        const isNumber = /^[–−-]?\d+(\.\d+)?$/.test(opt.text.trim());
        if (oHasMath && !oEng && !isNumber) {
          opt.text = '$' + opt.text.trim() + '$';
          optWrap++;
        }
      }
    }
  }
}

console.log('Questions wrapped:', qWrap);
console.log('Options wrapped:', optWrap);
console.log('Sqrt fixes:', sqrtFix);

writeFileSync(BASE + '/src/data/new-questions/math/2015.json', JSON.stringify(qs, null, 2), 'utf-8');

// Verify
const v = JSON.parse(readFileSync(BASE + '/src/data/new-questions/math/2015.json', 'utf-8'));
console.log('\n=== Spot checks ===');
[0, 3, 4, 6, 9, 12, 14, 19, 23, 34, 37].forEach(i => {
  const q = v[i];
  console.log('Q' + (i+1) + ': ' + (q.question.startsWith('$') ? '[$]' : '[ ]') + ' ' + q.question.replace(/^\$|\$$/g, '').substring(0, 90));
  const optDollars = q.options.filter(o => o.text.includes('$')).length;
  console.log('  opts: ' + optDollars + '/4 wrapped | ' + q.options.map(o => o.text.substring(0, 25)).join(', '));
  console.log();
});

// Count stats
const qCount = v.filter(q => q.question.startsWith('$')).length;
const optCount = v.reduce((s, q) => s + q.options.filter(o => o.text.includes('$')).length, 0);
console.log('Total questions with $:', qCount + '/' + v.length);
console.log('Total options with $:', optCount);
