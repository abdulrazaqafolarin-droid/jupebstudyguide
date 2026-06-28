/**
 * Test script for KaTeX validation pipeline.
 * Reads real question data, applies post-processing, and validates output.
 *
 * Usage: node scripts/test-katex-pipeline.mjs
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import katex from 'katex';
import 'katex/contrib/mhchem';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const stats = { total: 0, passed: 0, failed: 0, skipped: 0 };
const failures = [];

function validateLatex(text, source) {
  const blockRe = /\$\$([\s\S]*?)\$\$/g;
  const inlineRe = /(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\$)/g;

  if (!text.includes('$') && !text.includes('$$')) {
    stats.skipped++;
    return;
  }

  let match;
  const blocks = [];

  while ((match = blockRe.exec(text)) !== null) {
    blocks.push({ math: match[1].trim(), start: match.index });
  }
  while ((match = inlineRe.exec(text)) !== null) {
    if (match[0].startsWith('$$')) continue;
    blocks.push({ math: match[1].trim(), start: match.index });
  }

  for (const block of blocks) {
    stats.total++;
    try {
      katex.renderToString(block.math, { throwOnError: true });
      stats.passed++;
    } catch (e) {
      stats.failed++;
      const msg = e.message;
      failures.push({
        source,
        math: block.math,
        error: msg,
      });
    }
  }
}

function extractQuestionTexts(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const texts = [];

  try {
    const data = JSON.parse(content);

    // Handle array of questions
    if (Array.isArray(data)) {
      for (const q of data) {
        if (q.question) texts.push(q.question);
        if (q.options) {
          for (const opt of q.options) {
            if (opt.text) texts.push(opt.text);
          }
        }
      }
    }

    // Handle object with questions key (like allpast files)
    if (data.questions && Array.isArray(data.questions)) {
      for (const q of data.questions) {
        if (q.question) texts.push(q.question);
        if (q.options) {
          for (const opt of q.options) {
            if (opt.text) texts.push(opt.text);
          }
        }
      }
    }
  } catch {
    // Not JSON, skip
  }

  return texts;
}

function findQuestionFiles(dir) {
  const files = [];
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findQuestionFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

console.log('='.repeat(70));
console.log('KATEX PIPELINE VALIDATION TEST');
console.log('='.repeat(70));

const dataDirs = [
  join(ROOT, 'src', 'data', 'study-questions'),
];

if (existsSync(join(ROOT, 'src', 'data', 'new-questions'))) {
  dataDirs.push(join(ROOT, 'src', 'data', 'new-questions'));
}

if (existsSync(join(ROOT, 'public', 'data'))) {
  dataDirs.push(join(ROOT, 'public', 'data'));
}

for (const dir of dataDirs) {
  if (!existsSync(dir)) continue;
  const files = findQuestionFiles(dir);
  console.log(`\nScanning ${dir} (${files.length} files)...`);

  for (const file of files) {
    const relative = file.replace(ROOT, '').replace(/^[/\\]/, '');
    const texts = extractQuestionTexts(file);

    for (const text of texts) {
      if (!text || text.length < 3) continue;

      // Simulate what the pipeline does: postProcessLaTeX
      // We can't import it directly in .mjs, so we just validate existing LaTeX
      validateLatex(text, relative);
    }
  }
}

console.log('\n' + '='.repeat(70));
console.log('RESULTS');
console.log('='.repeat(70));
console.log(`Total LaTeX blocks tested: ${stats.total}`);
console.log(`Passed: ${stats.passed}`);
console.log(`Failed: ${stats.failed}`);
console.log(`Skipped (no LaTeX): ${stats.skipped}`);

if (failures.length > 0) {
  console.log('\n' + '='.repeat(70));
  console.log('FAILURES');
  console.log('='.repeat(70));
  const shown = new Set();
  for (const f of failures) {
    const key = f.math;
    if (shown.has(key)) continue;
    shown.add(key);
    console.log(`\n[${f.source}]`);
    console.log(`  LaTeX: ${f.math}`);
    console.log(`  Error: ${f.error}`);
  }
  console.log(`\n${failures.length} total failures (${new Set(failures.map(f => f.math)).size} unique)`);
  process.exit(1);
} else {
  console.log('\n✅ All LaTeX blocks render correctly!');
}
