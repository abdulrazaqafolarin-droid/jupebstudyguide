import { execSync } from 'child_process';

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwOjIwOTQ0NDA0ODV9.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NjQ0ODUsImV4cCI6MjA5NDQ0MDQ4NX0.8cz4O0Bh4eZNTGkqX11_OLgz8zwS4yTIWMJ4HbhxZ5c';

function curl(path) {
  const res = execSync('curl -s \"https://gzyczowqqywesqhqqpdi.supabase.co/rest/v1/study_questions?' + path + '\" -H \"apikey: ' + ANON + '\" -H \"Authorization: Bearer ' + TOKEN + '\"', {encoding:'utf-8'});
  return JSON.parse(res);
}

// Unicode math chars that indicate need for KaTeX
const unicodeLatexRe = /[₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹×÷±→⇌↔∆√∂∫∑∏∞≈≠≤≥∝Å°′″]|\\[a-z]+\{|\\ce\{/;

for (const subj of ['chemistry', 'physics', 'math']) {
  // Get all years for this subject
  const all = curl('select=id,year,question,options&subject=eq.' + subj + '&limit=1500');
  
  if (!Array.isArray(all)) {
    console.log(subj + ': error - ' + JSON.stringify(all));
    continue;
  }
  
  const withLatex = all.filter(d => unicodeLatexRe.test(d.question));
  const withMathDollar = all.filter(d => d.question.includes('$'));
  const withUnicodeSub = all.filter(d => /[₀₁₂₃₄₅₆₇₈₉]/.test(d.question));
  
  console.log(subj + ': ' + all.length + ' total');
  console.log('  Has Unicode math chars: ' + withLatex.length);
  console.log('  Has $ signs: ' + withMathDollar.length);
  console.log('  Has Unicode subscripts: ' + withUnicodeSub.length);
  
  // Show samples (first 3)
  for (let i = 0; i < Math.min(3, withLatex.length); i++) {
    console.log('  [' + i + '] ' + withLatex[i].id);
    console.log('    Q: ' + withLatex[i].question.slice(0, 200));
  }
  console.log();
}
