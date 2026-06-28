import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('output/processed/chemistry_all.json', 'utf-8'));

const latexRe = /\\[a-z]|\\ce\{|\\mathrm\{|\\times|\^|\{|_/;

let found = 0;
let notFound = 0;

for (const q of data) {
  const text = q.question;
  if (!text.includes('$')) continue;

  if (latexRe.test(text)) {
    found++;
  } else {
    notFound++;
    console.log('NO LATEX MATCH: ' + q.id);
    console.log('  Text: ' + JSON.stringify(text.slice(0, 150)));
    
    // Debug what's in the text
    const dollarIdx = text.indexOf('$');
    const aroundDollar = text.slice(Math.max(0, dollarIdx - 5), dollarIdx + 50);
    console.log('  Around $: ' + JSON.stringify(aroundDollar));
    console.log('  Chars: ' + aroundDollar.split('').map(c => 'U+' + c.charCodeAt(0).toString(16).toUpperCase()).join(' '));
    console.log();
  }
}

console.log('\nWith LaTeX match: ' + found);
console.log('Without LaTeX match: ' + notFound);
