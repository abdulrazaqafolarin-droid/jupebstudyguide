// Direct test of JSON backslash handling
import { writeFileSync, readFileSync } from 'fs';

// String with one backslash: $\sqrt{2}$
const s1 = '$\sqrt{2}$';
console.log('s1 chars:', [...s1].map(c => c.charCodeAt(0)));
console.log('s1 JSON:', JSON.stringify(s1));

// String with two backslashes: $\\sqrt{2}$
const s2 = '$\\sqrt{2}$';
console.log('s2 chars:', [...s2].map(c => c.charCodeAt(0)));
console.log('s2 JSON:', JSON.stringify(s2));

// Write to file
writeFileSync('slashtest.json', JSON.stringify({s1, s2}));
const back = readFileSync('slashtest.json', 'utf-8');
console.log('File contents:', back);

const parsed = JSON.parse(back);
console.log('Parsed s1:', parsed.s1);
console.log('Parsed s2:', parsed.s2);
