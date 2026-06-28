// generate-sql.mjs
// Reads processed question files and generates SQL upsert script

import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.argv[1], '../..');
const PROCESSED_DIR = path.join(PROJECT_ROOT, 'output/processed');

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  const str = String(val)
    .replace(/'/g, "''")    // escape single quotes
    .replace(/\\/g, '\\\\'); // escape backslashes
  return `'${str}'`;
}

function toPgJson(arr) {
  if (!arr || arr.length === 0) return "'[]'::jsonb";
  const json = JSON.stringify(arr)
    .replace(/'/g, "''");  // escape single quotes for PostgreSQL
  return `'${json}'::jsonb`;
}

function main() {
  console.log('-- ===============================================');
  console.log('-- Generated: ' + new Date().toISOString().split('T')[0]);
  console.log('-- Updates all study_questions with KaTeX-processed text');
  console.log('-- Run in Supabase SQL Editor');
  console.log('-- ===============================================');
  console.log();

  // Read all processed files
  const files = fs.readdirSync(PROCESSED_DIR).filter(f => f.endsWith('_all.json'));
  
  for (const file of files) {
    const filePath = path.join(PROCESSED_DIR, file);
    const questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    console.log(`-- ${file} (${questions.length} questions)`);
    
    // Sort by year, then id for consistent order
    questions.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.id.localeCompare(b.id);
    });
    
    // Assign sort_order
    questions.forEach((q, idx) => {
      q.sort_order = idx + 1;
    });
    
    // Generate batch upserts
    const batchSize = 50;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      const values = batch.map(q => {
        const id = escapeSql(q.id);
        const subject = escapeSql(q.subject);
        const year = q.year;
        const category = escapeSql(q.category || 'objective');
        const question = escapeSql(q.question);
        const options = toPgJson(q.options);
        const correctAnswer = escapeSql(q.correctAnswer || '');
        const explanation = escapeSql(q.explanation || '');
        const difficulty = escapeSql(q.difficulty || 'medium');
        const sortOrder = q.sort_order;
        
        return `(${id}, ${subject}, ${year}, ${category}, ${question}, ${options}, ${correctAnswer}, ${explanation}, ${difficulty}, ${sortOrder})`;
      }).join(',\n        ');
      
      console.log(`
INSERT INTO study_questions (id, subject, year, category, question, options, correct_answer, explanation, difficulty, sort_order)
VALUES
        ${values}
ON CONFLICT (id) DO UPDATE SET
  question = EXCLUDED.question,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  difficulty = EXCLUDED.difficulty,
  sort_order = EXCLUDED.sort_order
WHERE study_questions.question IS DISTINCT FROM EXCLUDED.question
   OR study_questions.options IS DISTINCT FROM EXCLUDED.options
   OR study_questions.explanation IS DISTINCT FROM EXCLUDED.explanation;`);
    }
    
    console.log(`-- ${file} done`);
    console.log();
  }
  
  console.log('-- ===============================================');
  console.log('-- All done!');
  console.log('-- ===============================================');
}

main();
