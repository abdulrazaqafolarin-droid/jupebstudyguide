// These are different ways to represent $\sqrt{2}$ in JS
const t1 = '$\sqrt{2}$';       // \s = invalid escape → 's' (backslash dropped)
const t2 = '$\\sqrt{2}$';     // \\ = one backslash, so string is $ + \ + sqrt{2} + $
const t3 = '$\\\\sqrt{2}$';   // \\\\ = two backslashes, so string is $ + \\ + sqrt{2} + $

console.log('t1:', JSON.stringify(t1), 'chars:', [...t1].map(c=>c.charCodeAt(0)));
console.log('t2:', JSON.stringify(t2), 'chars:', [...t2].map(c=>c.charCodeAt(0)));
console.log('t3:', JSON.stringify(t3), 'chars:', [...t3].map(c=>c.charCodeAt(0)));

// Which one is correct for KaTeX? $\sqrt{2}$ should have one backslash before sqrt
// So we want t2: $ + \ + sqrt + {2} + $
// This is the correct LaTeX inline math

// Now test: if this is in JSON, what does the file look like?
import { writeFileSync, readFileSync } from 'fs';
const data = {correct: t2, wrong_no_backslash: t1, wrong_two_backslashes: t3};
writeFileSync('slashtest2.json', JSON.stringify(data, null, 2));
const back = readFileSync('slashtest2.json', 'utf-8');
console.log('\nJSON file contents:');
const lines = back.split('\n');
lines.forEach((l, i) => console.log(i+1, JSON.stringify(l)));
