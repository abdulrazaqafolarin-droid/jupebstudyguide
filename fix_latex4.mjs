import { readFileSync, writeFileSync } from 'fs';

const BASE = 'C:/Users/HP/Downloads/jupebstudyguide-main/jupebstudyguide-main';

// Revert to raw data from git first
// Then apply proper LaTeX conversion

// Actually let's just work with what we have and fix remaining issues

const qs = JSON.parse(readFileSync(BASE + '/src/data/new-questions/math/2015.json', 'utf-8'));

// Helper: check if text has significant math content
function hasMathContent(text) {
  if (!text) return false;
  // Check for unicode math operators
  const mathOps = /[=∫∑∏√∂∆∇∞∅∪∩∈⊂⊆⇒⇔→←∃∀∴∵πθφαβγδεηικλμνξοπρςστυφχψω±×÷]/.test(text);
  if (mathOps) return true;
  // Unicode superscripts
  if (/[\u2070-\u2079\u207B\u00B9\u00B2\u00B3]/.test(text)) return true;
  // Unicode subscripts  
  if (/[\u2080-\u2089]/.test(text)) return true;
  // Matrix notation with semicolons
  if (/[\[|][^\]|]+;[^\]|]+[\]|]/.test(text)) return true;
  // Contains sqrt-like patterns
  if (/sqrt\{/i.test(text)) return true;
  // Contains trig or log functions
  if (/\b(sin|cos|tan|log|ln|lim)\b/i.test(text)) return true;
  // Contains e^ with exponent
  if (/e[⁻\^]/i.test(text)) return true;
  return false;
}

function isPureEnglish(text) {
  const words = text.split(/\s+/);
  const longEnglish = words.filter(w => w.length >= 4 && /^[a-zA-Z]+$/.test(w));
  return longEnglish.length >= 3;
}

// Fix sqrt inside text (add backslash before sqrt when inside $...$)
function fixSqrt(text) {
  if (!text) return text;
  return text.replace(/\$([^$]*)\$/g, (m, inner) => {
    const fixed = inner.replace(/(?<!\\)sqrt\{/g, '\\sqrt{');
    return '$' + fixed + '$';
  });
}

// Wrap math options in $...$
let optAdd = 0, qAdd = 0, fixCount = 0;
for (const q of qs) {
  // Fix sqrt in existing blocks
  const oldQ = q.question;
  q.question = fixSqrt(q.question);
  if (q.question !== oldQ) fixCount++;

  if (q.options) {
    for (const opt of q.options) {
      const oldT = opt.text;
      // Fix sqrt
      opt.text = fixSqrt(opt.text);
      // Wrap in $ if math content and not already wrapped
      if (hasMathContent(opt.text) && !opt.text.includes('$') && !isPureEnglish(opt.text)) {
        opt.text = '$' + opt.text.trim() + '$';
        optAdd++;
      }
      if (opt.text !== oldT && !opt.text.includes('$') || (opt.text.includes('$') && !oldT.includes('$'))) {
        // already counted
      }
    }
  }

  // Wrap math questions in $...$ if heavy math
  if (hasMathContent(q.question) && !q.question.includes('$') && !isPureEnglish(q.question)) {
    // Only wrap if the math content is significant enough
    // For questions with "Find the...", "Solve...", "Evaluate..." etc, wrap them
    const hasMathVerb = /\b(Find|Solve|Evaluate|Compute|Differentiate|Given|If|The|Let|Express)\b/i.test(q.question);
    if (hasMathVerb) {
      q.question = '$' + q.question + '$';
      qAdd++;
    }
  }
}

console.log('Sqrt fixes:', fixCount);
console.log('Options wrapped:', optAdd);
console.log('Questions wrapped:', qAdd);

writeFileSync(BASE + '/src/data/new-questions/math/2015.json', JSON.stringify(qs, null, 2), 'utf-8');

// Verify some
const v = JSON.parse(readFileSync(BASE + '/src/data/new-questions/math/2015.json', 'utf-8'));
console.log('\n=== Spot checks ===');
[0, 3, 6, 9, 12, 13, 22, 34].forEach(i => {
  const q = v[i];
  console.log('Q' + (i+1) + ':', q.question.substring(0, 90));
  console.log('  opts:', q.options.map(o => o.text.substring(0, 30)).join(', '));
  console.log();
});
