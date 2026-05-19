import fs from 'fs';
const q = JSON.parse(fs.readFileSync('src/data/new-questions/physics/2025.json', 'utf-8'));
const o = q.filter(x => x.category === 'objective');
const a = o.filter(x => x.correctAnswer);
console.log(`Physics 2025: ${o.length} obj, ${a.length} answered`);
a.slice(0, 5).forEach(x => console.log(`  ${x.id.substring(0,20)}: ${x.correctAnswer}`));
