// process-questions.mjs
// Reads ALL question source files, processes raw text through MathRenderer pipeline,
// validates with KaTeX, and outputs processed JSON + SQL.

import fs from 'fs';
import path from 'path';
import katex from 'katex';

// Load mhchem extension for katex
import 'katex/contrib/mhchem';

// ============================================================
// Constants (mirroring MathRenderer.tsx)
// ============================================================
const MATH_PH = '__MATH_PLACEHOLDER_';
const TABLE_PH = '__TABLE_PLACEHOLDER_';

function hasPH(s) {
  return s.includes(MATH_PH) || s.includes(TABLE_PH);
}

const VALID_ELEMENTS = new Set([
  'H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P',
  'S','Cl','Ar','K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu',
  'Zn','Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr','Nb','Mo',
  'Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe','Cs',
  'Ba','La','Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er',
  'Tm','Yb','Lu','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl',
  'Pb','Bi','Po','At','Rn','Fr','Ra','Ac','Th','Pa','U','Np','Pu',
  'Am','Cm','Bk','Cf','Es','Fm','Md','No','Lr','Rf','Db','Sg','Bh',
  'Hs','Mt','Ds','Rg','Cn','Nh','Fl','Mc','Lv','Ts','Og',
]);

const GREEK_LETTERS = new Set([
  'alpha','beta','gamma','delta','epsilon','zeta','eta','theta',
  'iota','kappa','lambda','mu','nu','xi','omicron','pi',
  'rho','sigma','tau','upsilon','phi','chi','psi','omega',
  'Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta',
  'Iota','Kappa','Lambda','Mu','Nu','Xi','Omicron','Pi',
  'Rho','Sigma','Tau','Upsilon','Phi','Chi','Psi','Omega',
]);

const CHEM_PREFIXES = ['hydro','chloro','fluoro','bromo','iodo','nitro','sulfo','phospho','methyl','ethyl','propyl','butyl'];

function isKnownWord(word) {
  const upper = word.toUpperCase();
  if (upper.length <= 1) return false;
  if (GREEK_LETTERS.has(word)) return false;
  for (const p of CHEM_PREFIXES) {
    if (word.toLowerCase().startsWith(p)) return false;
  }
  return /^[A-Z][a-z]{2,}$/.test(word) || /^[A-Z]{2,}$/.test(word);
}

const UNICODE_SUP_TO_DIGIT = {
  '\u2070': '0', '\u00B9': '1', '\u00B2': '2', '\u00B3': '3',
  '\u2074': '4', '\u2075': '5', '\u2076': '6', '\u2077': '7',
  '\u2078': '8', '\u2079': '9', '\u207B': '-',
};
const UNICODE_SUP_RE = /[\u2070-\u2079\u207B\u00B9\u00B2\u00B3]/g;

function convertUnicodeSubscripts(text) {
  let result = text;
  result = result.replace(/\u2212/g, '-');
  result = result.replace(/\u2013/g, '-');
  result = result.replace(/\u2014/g, '--');
  result = result.replace(/\u2026/g, '...');
  return result;
}

const LATEX_COMMANDS = [
  'mathrm','text','textbf','textit','mathbf','mathit','mathsf','mathtt',
  'mathcal','mathbb','mathfrak','mathscr','ce','pu',
  'alpha','beta','gamma','delta','epsilon','zeta','eta','theta',
  'iota','kappa','lambda','mu','nu','xi','omicron','pi',
  'rho','sigma','tau','upsilon','phi','chi','psi','omega',
  'times','div','pm','mp','cdot','circ','bullet',
  'leq','geq','neq','approx','infty','partial','nabla',
  'sqrt','frac','sum','prod','int','lim','log','ln','sin','cos','tan',
  'csc','sec','cot',
  'rightarrow','leftarrow','Rightarrow','Leftarrow','implies','iff','to','gets',
  'left','right','big','bigg','bigl','bigr','biggl','biggr',
  'binom','choose','textstyle','displaystyle','scriptstyle',
];

// ============================================================
// Main Processing Pipeline (mirrors MathRenderer Steps 0a-4)
// ============================================================
function processText(input) {
  let processedContent = input;
  
  // Step 0a: Normalize common data errors
  processedContent = processedContent
    .replace(/(?<!\$)\+\+(?!\$)/g, '+')
    .replace(/(?<!\$)--(?!\$)/g, '-')
    .replace(/\s{3,}/g, '  ')
    .trim();
  
  // Step 0a1: Strip model-generated placeholders
  processedContent = processedContent
    .replace(/MATH(?:_PLACEHOLDER)?_\d+/gi, '')
    .replace(/__MATH_PLACEHOLDER_\d+__/g, '')
    .trim();
  
  // Step 0b: Protect $$...$$ and $...$, remove stray $
  let protectedBlocks = [];
  processedContent = processedContent.replace(/\$\$[\s\S]*?\$\$/g, (m) => {
    const idx = protectedBlocks.length;
    protectedBlocks.push(m);
    return `${MATH_PH}${idx}__`;
  });
  processedContent = processedContent.replace(
    /(?:(?<!\$|\d)\$(?!\$)|\d\$(?=\\))((?:[^$\\]|\\.)+?)\$(?!\$|\d)/g,
    (match) => {
      const idx = protectedBlocks.length;
      protectedBlocks.push(match);
      return `${MATH_PH}${idx}__`;
    }
  );
  processedContent = processedContent.replace(/\$/g, '');
  processedContent = processedContent.replace(
    new RegExp(MATH_PH + '(\\d+)__', 'g'),
    (_, idx) => protectedBlocks[parseInt(idx)] ?? ''
  );
  protectedBlocks = [];
  
  // Step 0c: Fix forward-slash LaTeX commands
  processedContent = processedContent.replace(
    new RegExp('\\/(' + LATEX_COMMANDS.join('|') + ')\\b', 'g'),
    '\\\\$1'
  );
  
  // Step 1: Protect existing $...$ and $$...$$
  processedContent = processedContent.replace(
    /\$\$[\s\S]*?\$\$|(?:(?<!\$|\d)\$(?!\$)|\d\$(?=\\))((?:[^$\\]|\\.)+?)\$(?!\$|\d)/g,
    (match) => {
      const inner = match.startsWith('$$') ? match.slice(2, -2) : match.slice(1, -1);
      const trimmed = inner.trim();
      if (!match.startsWith('$$')) {
        const hasLatexCommand = /\\[a-z]|\^|_|\{|\}/i.test(trimmed);
        const isJustNumber = /^\d+(?:[.,]\d+)?$/.test(trimmed);
        if (!hasLatexCommand || isJustNumber) return match;
      }
      const idx = protectedBlocks.length;
      protectedBlocks.push(match);
      return `${MATH_PH}${idx}__`;
    }
  );
  
  // Clean up content inside protected math blocks
  const cleanMathContent = (m) => {
    const isBlock = m.startsWith('$$');
    const inner = isBlock ? m.slice(2, -2) : m.slice(1, -1);
    let cleaned = inner
      .replace(/(\\text\{[^}]*\})([a-zA-Z])/g, '$1 $2')
      .replace(/\{\}/g, '')
      .replace(/\.{4,}/g, '...')
      .trim();
    const leftCount = (cleaned.match(/\\left\b/g) || []).length;
    const rightCount = (cleaned.match(/\\right\b/g) || []).length;
    if (leftCount !== rightCount) {
      cleaned = cleaned
        .replace(/\\left\s*([([{}|.\]])/g, '$1')
        .replace(/\\right\s*([)\]}|\].])/g, '$1');
    }
    const mathOperators = /[=+\-*/^_{}\\[\]()]|\\frac|\\sqrt|\\int|\\sum/g;
    const mathOpCount = (cleaned.match(mathOperators) || []).length;
    const letterRuns = cleaned.match(/[a-zA-Z]{8,}/g) || [];
    const totalLetters = (cleaned.match(/[a-zA-Z]/g) || []).length;
    if (letterRuns.length > 0 && mathOpCount < 2 && totalLetters > 10 && totalLetters > cleaned.length * 0.5) {
      return cleaned;
    }
    if (isBlock) return '$$\n' + cleaned + '\n$$';
    return '$' + cleaned + '$';
  };
  protectedBlocks = protectedBlocks.map(cleanMathContent);
  
  // --- Tables: replace markdown tables with placeholder ---
  const tableBlocks = [];
  const tableLines = [];
  const lines = processedContent.split('\n');
  let inTable = false;
  let tableStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\|.+\|$/.test(lines[i].trim())) {
      if (!inTable) { inTable = true; tableStart = i; }
    } else {
      if (inTable) {
        const tbl = lines.slice(tableStart, i).join('\n');
        const idx = tableBlocks.length;
        tableBlocks.push(tbl);
        for (let j = tableStart; j < i; j++) tableLines.push(j);
        lines[tableStart] = `${TABLE_PH}${idx}__`;
        for (let j = tableStart + 1; j < i; j++) lines[j] = '';
        inTable = false;
      }
    }
  }
  if (inTable) {
    const tbl = lines.slice(tableStart).join('\n');
    const idx = tableBlocks.length;
    tableBlocks.push(tbl);
    lines[tableStart] = `${TABLE_PH}${idx}__`;
    for (let j = tableStart + 1; j < lines.length; j++) lines[j] = '';
  }
  processedContent = lines.join('\n');
  
  // Convert Unicode special chars
  processedContent = convertUnicodeSubscripts(processedContent);
  
  // ============================================================
  // STEP 2: Text-to-LaTeX conversions
  // ============================================================
  const formulaToLatex = (formula) => `$\\ce{${formula}}$`;
  
  // Pattern 1: Multi-element chemical formulas
  const chemMultiPattern = /(?:[A-Z][a-z]?(?:\d*|\([A-Z][a-z]?\d*\)\d*)|\([A-Z][a-z]?\d*\)\d*){2,}(?:[+-]\d*)?/g;
  processedContent = processedContent.replace(chemMultiPattern, (match) => {
    if (hasPH(match)) return match;
    if (!/\d/.test(match)) return match;
    if (isKnownWord(match)) return match;
    const symbols = match.match(/[A-Z][a-z]?/g) || [];
    if (symbols.length > 0 && !symbols.every(s => VALID_ELEMENTS.has(s))) return match;
    if (/^[A-Z]{3,}$/.test(match)) return match;
    if (/^[A-Z]{3,5}\d/.test(match)) return match;
    return formulaToLatex(match);
  });
  
  // Pattern 2: Single-element formulas with subscripts
  const singleChemRe = /[A-Z][a-z]?\d+(?:[+-]\d*)?/g;
  processedContent = processedContent.replace(singleChemRe, (match, offset) => {
    if (hasPH(match)) return match;
    if (isKnownWord(match)) return match;
    const before = processedContent.slice(0, offset);
    const lastDollar = before.lastIndexOf('$');
    if (lastDollar !== -1) {
      const afterDollar = before.slice(lastDollar + 1);
      if (afterDollar.startsWith('\\ce{')) return match;
    }
    const elem = match.match(/^([A-Z][a-z]?)\d+/);
    if (elem && !VALID_ELEMENTS.has(elem[1])) return match;
    if (/^[A-Z]{3,4}\d+$/.test(match)) return match;
    return formulaToLatex(match);
  });
  
  // Electronic configurations: 1s2 2s2 2p6 3s2 3p4
  processedContent = processedContent.replace(
    /\b(\d+[spdf])(\d+)(?:\s+\d+[spdf]\d+)*\b/g,
    (match) => {
      if (hasPH(match)) return match;
      const parts = match.split(/\s+/);
      const formatted = parts.map((p) => {
        const m = p.match(/^(\d+[spdf])(\d+)$/);
        if (!m) return p;
        return `${m[1]}^{${m[2]}}`;
      }).join('\\,');
      return `$${formatted}$`;
    }
  );
  
  // Scientific notation: 3 x 10^8, 6.02 x 10^23, 6.02 x 10²³
  processedContent = processedContent.replace(
    /(\d+(?:\.\d+)?)\s*[xX×]\s*10(?:\^(-?\d+)|([\u2070-\u2079\u00B9\u00B2\u00B3\u207B]*))?/g,
    (match, coeff, exp, supExp) => {
      if (hasPH(match)) return match;
      if (exp) return `$${coeff} \\times 10^{${exp}}$`;
      if (supExp) {
        const sup = supExp.replace(UNICODE_SUP_RE, (ch) => UNICODE_SUP_TO_DIGIT[ch] ?? ch);
        return `$${coeff} \\times 10^{${sup}}$`;
      }
      return `$${coeff} \\times 10$`;
    }
  );
  
  // Number with Unicode superscript exponent: 10², 10⁻³, 10⁻¹⁴
  processedContent = processedContent.replace(
    /(\d+)([\u2070-\u2079\u207B\u00B9\u00B2\u00B3]+)(?!\s*\^)/g,
    (match, base, supExp) => {
      if (hasPH(match)) return match;
      if (supExp) {
        const sup = supExp.replace(UNICODE_SUP_RE, (ch) => UNICODE_SUP_TO_DIGIT[ch] ?? ch);
        return `$${base}^{${sup}}$`;
      }
      return match;
    }
  );
  
  // Units with slash: m/s^2, kg/m^3
  const unitFalsePositives = new Set([
    'and/or', 'give/receive', 'input/output', 'true/false',
    'yes/no', 'on/off', 'up/down', 'in/out', 'win/lose',
  ]);
  processedContent = processedContent.replace(
    /\b([a-zA-Z]{1,2})\/([a-z]{2,5}(?:\^\{?\d+\}?)?)\b/g,
    (match, num, den) => {
      if (hasPH(match) || hasPH(num) || hasPH(den)) return match;
      if (unitFalsePositives.has(match.toLowerCase())) return match;
      return `$${match}$`;
    }
  );
  
  // (g), (s), (l), (aq) chemical state
  processedContent = processedContent.replace(
    /\((\w+)\)/g,
    (match, state) => {
      if (hasPH(match)) return match;
      if (/^(aq|s|l|g)$/i.test(state)) {
        return `$\\mathrm{(${state})}$`;
      }
      return match;
    }
  );
  
  // Simple fractions: number/number
  processedContent = processedContent.replace(
    /(?<!\$)(\d+)\s*\/\s*(\d+)(?!\$)/g,
    (match, num, den) => {
      if (hasPH(match)) return match;
      return `$\\frac{${num}}{${den}}$`;
    }
  );
  
  // Step 3: Restore protected math blocks
  processedContent = processedContent.replace(
    new RegExp(MATH_PH + '(\\d+)__', 'g'),
    (_, idx) => protectedBlocks[parseInt(idx)] ?? ''
  );
  
  // Step 4 (safety): Catch any remaining leaked placeholders
  processedContent = processedContent.replace(
    new RegExp(MATH_PH + '(\\d+)__', 'g'),
    (_, idx) => protectedBlocks[parseInt(idx)] ?? ''
  );
  processedContent = processedContent.replace(
    new RegExp(TABLE_PH + '(\\d+)__', 'g'),
    (_, idx) => tableBlocks[parseInt(idx)] ?? ''
  );
  
  return processedContent;
}

// ============================================================
// KaTeX Validation
// ============================================================
function validateLatex(text) {
  const errors = [];
  const dollarBlocks = text.match(/\$[^$]+\$/g) || [];
  for (const block of dollarBlocks) {
    const inner = block.slice(1, -1).trim();
    if (!inner) continue;
    try {
      katex.renderToString(inner, { throwOnError: true });
    } catch (e) {
      errors.push({ block, inner, error: e.message });
    }
  }
  // Also validate $$...$$ blocks
  const displayBlocks = text.match(/\$\$[\s\S]*?\$\$/g) || [];
  for (const block of displayBlocks) {
    const inner = block.slice(2, -2).trim();
    if (!inner) continue;
    try {
      katex.renderToString(inner, { throwOnError: true, displayMode: true });
    } catch (e) {
      errors.push({ block, inner, error: e.message });
    }
  }
  return errors;
}

// ============================================================
// Field Processing
// ============================================================
function processQuestion(q) {
  const processed = { ...q };
  
  // Process question text
  processed.question = processText(q.question || '');
  
  // Process options
  if (q.options && Array.isArray(q.options)) {
    processed.options = q.options.map(opt => ({
      ...opt,
      text: processText(opt.text || ''),
    }));
  }
  
  // Process explanation
  if (q.explanation) {
    processed.explanation = processText(q.explanation);
  }
  
  // Process answerGuide (for theory questions)
  if (q.answerGuide) {
    processed.answerGuide = processText(q.answerGuide);
  }
  
  return processed;
}

// ============================================================
// File Discovery & Processing
// ============================================================
const PROJECT_ROOT = path.resolve(process.argv[1], '../..');
const SOURCE_DIR = path.join(PROJECT_ROOT, 'src/data/new-questions');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output/processed');

function discoverSourceFiles() {
  const subjects = fs.readdirSync(SOURCE_DIR, { withFileTypes: true });
  const files = [];
  for (const subject of subjects) {
    if (!subject.isDirectory()) continue;
    const subjectDir = path.join(SOURCE_DIR, subject.name);
    const entries = fs.readdirSync(subjectDir);
    for (const entry of entries) {
      if (entry.endsWith('.json')) {
        files.push({
          path: path.join(subjectDir, entry),
          subject: subject.name,
          filename: entry,
        });
      }
    }
  }
  return files;
}

function readQuestions(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  // Handle both arrays and single objects
  const arr = Array.isArray(data) ? data : [data];
  // Normalize: ensure consistent field names
  return arr.map(q => ({
    id: q.id,
    subject: q.subject || '',
    year: q.year || 0,
    category: q.category || 'objective',
    question: q.question || '',
    options: q.options || [],
    correctAnswer: q.correctAnswer || '',
    explanation: q.explanation || '',
    difficulty: q.difficulty || 'medium',
  }));
}

// ============================================================
// Main
// ============================================================
function main() {
  console.log('=== Question Processing Pipeline ===\n');
  
  // Create output dir
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const sourceFiles = discoverSourceFiles();
  console.log(`Found ${sourceFiles.length} source files across ${new Set(sourceFiles.map(f => f.subject)).size} subjects\n`);
  
  const allProcessed = {};
  let totalQuestions = 0;
  let totalErrors = 0;
  const allErrors = [];
  
  for (const file of sourceFiles) {
    const { subject, filename } = file;
    console.log(`Processing ${subject}/${filename}...`);
    
    const questions = readQuestions(file.path);
    console.log(`  ${questions.length} questions`);
    
    const processed = [];
    for (const q of questions) {
      const result = processQuestion(q);
      processed.push(result);
      
      // Validate all text fields in the processed output
      const fields = [
        result.question,
        ...(result.options || []).map(o => o.text),
        result.explanation,
      ].filter(Boolean);
      
      for (const field of fields) {
        const errors = validateLatex(field);
        for (const err of errors) {
          totalErrors++;
          allErrors.push({
            id: result.id,
            field: field.slice(0, 80),
            ...err,
          });
        }
      }
      
      totalQuestions++;
    }
    
    // Save per-subject/per-file processed output
    if (!allProcessed[subject]) allProcessed[subject] = [];
    allProcessed[subject].push(...processed);
    
    // Write individual file
    const outPath = path.join(OUTPUT_DIR, `${subject}_${filename}`);
    fs.writeFileSync(outPath, JSON.stringify(processed, null, 2), 'utf-8');
    console.log(`  -> ${outPath}`);
  }
  
  // Write consolidated output per subject
  for (const [subject, questions] of Object.entries(allProcessed)) {
    const outPath = path.join(OUTPUT_DIR, `${subject}_all.json`);
    fs.writeFileSync(outPath, JSON.stringify(questions, null, 2), 'utf-8');
    console.log(`\nConsolidated ${subject}: ${questions.length} questions -> ${outPath}`);
  }
  
  // Write error report
  if (allErrors.length > 0) {
    const errPath = path.join(OUTPUT_DIR, 'validation-errors.json');
    fs.writeFileSync(errPath, JSON.stringify(allErrors, null, 2), 'utf-8');
    console.log(`\n=== KaTeX Validation Errors: ${totalErrors} ===`);
    for (const err of allErrors.slice(0, 20)) {
      console.log(`  [${err.id}] ${err.error}`);
      console.log(`    Block: ${err.block?.slice(0, 100)}`);
    }
    if (allErrors.length > 20) {
      console.log(`  ... and ${allErrors.length - 20} more errors (see ${errPath})`);
    }
  } else {
    console.log('\n=== No KaTeX validation errors! ===');
  }
  
  console.log(`\nTotal: ${totalQuestions} questions processed`);
}

main();
