import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'src', 'data', 'new-questions');
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'data', 'new-data-files');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const subjects = fs.readdirSync(DATA_DIR);
const allQuestions = [];

for (const subject of subjects) {
  const subjectDir = path.join(DATA_DIR, subject);
  if (!fs.statSync(subjectDir).isDirectory()) continue;

  const yearFiles = fs.readdirSync(subjectDir).filter(f => f.endsWith('.json'));
  const byYear = {};

  for (const yf of yearFiles) {
    const year = parseInt(yf.replace('.json', ''));
    const questions = JSON.parse(fs.readFileSync(path.join(subjectDir, yf), 'utf-8'));

    if (!byYear[year]) byYear[year] = { objective: [], theory: [], practical: [] };

    for (const q of questions) {
      if (q.category === 'theory') byYear[year].theory.push(q);
      else if (q.category === 'practical') byYear[year].practical.push(q);
      else byYear[year].objective.push(q);
      allQuestions.push(q);
    }
  }

  // Generate TS file for this subject
  let code = `import type { StudyQuestion } from "@/types/study-questions";\n\n`;

  const years = Object.keys(byYear).sort();
  code += `const ${subject}Data: Record<number, { objective: StudyQuestion[]; theory: StudyQuestion[]; practical: StudyQuestion[] }> = {\n`;

  let yearCount = 0, qCount = 0;
  for (const year of years) {
    const d = byYear[year];
    yearCount++; qCount += d.objective.length + d.theory.length + d.practical.length;
    code += `  ${year}: {\n`;

    // Objective
    code += `    objective: [\n`;
    for (const q of d.objective) {
      const opts = JSON.stringify(q.options);
      const escQ = q.question.replace(/`/g, '\\`').replace(/\${/g, '\\${');
      code += `      {\n`;
      code += `        id: "${q.id}", subject: "${q.subject}", year: ${q.year}, category: "objective",\n`;
      code += `        question: \`${escQ}\`,\n`;
      code += `        options: ${opts},\n`;
      code += `        correctAnswer: "${q.correctAnswer || 'TBD'}",\n`;
      code += `        explanation: "${(q.explanation || 'Answer to be verified').replace(/"/g, '\\"').replace(/\n/g, ' ')}",\n`;
      code += `        difficulty: "${q.difficulty || 'medium'}",\n`;
      code += `        topic: "",\n`;
      code += `      },\n`;
    }
    code += `    ],\n`;

    // Theory
    code += `    theory: [\n`;
    for (const q of d.theory) {
      const escQ = q.question.replace(/`/g, '\\`').replace(/\${/g, '\\${');
      code += `      {\n`;
      code += `        id: "${q.id}", subject: "${q.subject}", year: ${q.year}, category: "theory",\n`;
      code += `        question: \`${escQ}\`,\n`;
      code += `        answerGuide: "",\n`;
      code += `        markScheme: [],\n`;
      code += `        totalMarks: 10,\n`;
      code += `        topic: "",\n`;
      code += `      },\n`;
    }
    code += `    ],\n`;

    // Practical
    code += `    practical: [],\n`;
    code += `  },\n`;
  }

  code += `};\n\n`;
  code += `const current${subject.charAt(0).toUpperCase() + subject.slice(1)} = ${subject}Data;\n\n`;
  code += `export function get${subject.charAt(0).toUpperCase() + subject.slice(1)}Questions(year: number) {\n`;
  code += `  return current${subject.charAt(0).toUpperCase() + subject.slice(1)}[year] || { objective: [], theory: [], practical: [] };\n`;
  code += `}\n`;

  fs.writeFileSync(path.join(OUTPUT_DIR, `${subject}-imported.ts`), code);
  console.log(`Generated ${subject}-imported.ts (${yearCount} years, ${qCount} questions)`);
}

console.log(`\nTotal: ${allQuestions.length} questions across ${subjects.length} subjects`);
console.log(`\nFiles written to: ${OUTPUT_DIR}`);
console.log('To integrate: merge these into src/data/study-questions/{subject}.ts');
console.log('\nNOTE: correctAnswer fields are "TBD" - run answer-derive.mjs when VITE_OPENROUTER_API_KEY is set');
