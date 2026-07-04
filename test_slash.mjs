const s = 'X2';
const r1 = s.replace(/X/, '\\\\\\\\');
console.log('4 slashes:', JSON.stringify(r1));

const r2 = s.replace(/X/, '\\\\');
console.log('2 slashes:', JSON.stringify(r2));

const r3 = s.replace(/X/, '\\\\\\\\a');
console.log('4+a:', JSON.stringify(r3));

const r4 = s.replace(/X/, '\\\\a');
console.log('2+a:', JSON.stringify(r4));

const r5 = '√2'.replace(/√(.)/, '\\\\\\\\sqrt{$1}');
console.log('sqrt with 4 slashes:', JSON.stringify(r5));
console.log('Raw:', r5);

const r6 = '√2'.replace(/√(.)/, '\\\\sqrt{$1}');
console.log('sqrt with 2 slashes:', JSON.stringify(r6));
console.log('Raw:', r6);
