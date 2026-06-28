const fs = require('fs');
const path = require('path');

// ============================================================
// SETUP: KaTeX invalid commands
// ============================================================
// Commands that KaTeX does NOT support (common errors)
const INVALID_KATEX_COMMANDS = new Set([
  '\\degree', '\\degrees', '\\degs', '\\textdegree',
  '\\mdegree', '\\microdegree',
  '\\tag', '\\tag*', '\\label', '\\ref', '\\pageref',
  '\\cite', '\\bibitem', '\\bibliography',
  '\\begin{align}', '\\end{align}', '\\begin{align*}', '\\end{align*}',
  '\\begin{equation}', '\\end{equation}',
  '\\begin{eqnarray}', '\\end{eqnarray}',
  '\\begin{cases}', '\\end{cases}',
  '\\begin{array}', '\\end{array}',
  '\\begin{matrix}', '\\end{matrix}',
  '\\begin{vmatrix}', '\\end{vmatrix}',
  '\\begin{bmatrix}', '\\end{bmatrix}',
  '\\begin{pmatrix}', '\\end{pmatrix}',
  '\\text{', '\\mbox{', '\\textbf{', '\\textit{',
  '\\displaystyle', '\\textstyle', '\\scriptstyle',
  '\\hspace', '\\vspace', '\\hfill', '\\vfill',
  '\\centering', '\\raggedright', '\\raggedleft',
  '\\tiny', '\\small', '\\normalsize', '\\large', '\\Large',
  '\\huge', '\\Huge',
  '\\setlength', '\\newpage', '\\clearpage',
  '\\linebreak', '\\pagebreak', '\\newline',
  '\\tabular', '\\begin{tabular}', '\\end{tabular}',
  '\\begin{center}', '\\end{center}',
  '\\begin{enumerate}', '\\end{enumerate}',
  '\\begin{itemize}', '\\end{itemize}',
]);

// These ARE valid in KaTeX
const VALID_KATEX_SHORT = new Set([
  '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\zeta',
  '\\eta', '\\theta', '\\iota', '\\kappa', '\\lambda', '\\mu',
  '\\nu', '\\xi', '\\omicron', '\\pi', '\\rho', '\\sigma', '\\tau',
  '\\upsilon', '\\phi', '\\chi', '\\psi', '\\omega',
  '\\Alpha', '\\Beta', '\\Gamma', '\\Delta', '\\Epsilon', '\\Zeta',
  '\\Eta', '\\Theta', '\\Iota', '\\Kappa', '\\Lambda', '\\Mu',
  '\\Nu', '\\Xi', '\\Omicron', '\\Pi', '\\Rho', '\\Sigma', '\\Tau',
  '\\Upsilon', '\\Phi', '\\Chi', '\\Psi', '\\Omega',
  '\\times', '\\div', '\\pm', '\\mp', '\\cdot', '\\ast', '\\star',
  '\\circ', '\\bullet', '\\oplus', '\\otimes', '\\ominus',
  '\\leq', '\\geq', '\\neq', '\\approx', '\\equiv', '\\sim',
  '\\cong', '\\propto', '\\infty', '\\partial', '\\nabla',
  '\\sqrt', '\\frac', '\\binom', '\\vec', '\\bar', '\\hat',
  '\\tilde', '\\dot', '\\ddot', '\\overrightarrow',
  '\\rightarrow', '\\leftarrow', '\\Rightarrow', '\\Leftarrow',
  '\\leftrightarrow', '\\Leftrightarrow',
  '\\uparrow', '\\downarrow', '\\Uparrow', '\\Downarrow',
  '\\implies', '\\iff', '\\to', '\\gets',
  '\\sum', '\\prod', '\\int', '\\iint', '\\iiint', '\\oint',
  '\\lim', '\\log', '\\ln', '\\lg', '\\sin', '\\cos', '\\tan',
  '\\csc', '\\sec', '\\cot', '\\sinh', '\\cosh', '\\tanh',
  '\\arcsin', '\\arccos', '\\arctan',
  '\\max', '\\min', '\\sup', '\\inf', '\\det', '\\dim', '\\hom',
  '\\ker', '\\deg', '\\Pr', '\\gcd', '\\arg',
  '\\{', '\\}', '\\_', '\\#', '\\%', '\\&', '\\$',
  '\\mathrm', '\\mathbf', '\\mathit', '\\mathsf', '\\mathtt',
  '\\mathcal', '\\mathbb', '\\mathfrak', '\\mathscr',
  '\\text', '\\mbox', '\\textbf', '\\textit',
  '\\ce', '\\pu',
]);

// Chemicals that should be detected
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

// ============================================================
// HELPERS
// ============================================================

// Extract all $...$ and $$...$$ math blocks from text
function extractMathBlocks(text) {
  const blocks = [];
  const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
  const inlineMathRegex = /(?<!\$|\d)\$(?![$\d])((?:[^$\\]|\\.)+?)\$(?!\$|\d)/g;
  let m;
  while ((m = blockMathRegex.exec(text)) !== null) {
    blocks.push({ math: m[1].trim(), isBlock: true, start: m.index, end: m.index + m[0].length });
  }
  while ((m = inlineMathRegex.exec(text)) !== null) {
    const isInside = blocks.some(b => m.index >= b.start && m.index < b.end);
    if (!isInside) {
      blocks.push({ math: m[1].trim(), isBlock: false, start: m.index, end: m.index + m[0].length });
    }
  }
  return blocks;
}

// Check for balanced braces in a math block
function checkBalancedBraces(math) {
  let depth = 0;
  let inEscape = false;
  for (let i = 0; i < math.length; i++) {
    const ch = math[i];
    if (inEscape) { inEscape = false; continue; }
    if (ch === '\\' && i + 1 < math.length) { inEscape = true; continue; }
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth < 0) return false; // unbalanced: too many closing braces
  }
  return depth === 0;
}

function findAllCommandIssues(math) {
  const issues = [];
  // Find all backslash commands: \word or \{ or \_
  const cmdRegex = /\\([a-zA-Z]+|[{}_#%&$])/g;
  let m;
  while ((m = cmdRegex.exec(math)) !== null) {
    const cmd = '\\' + m[1];
    if (!VALID_KATEX_SHORT.has(cmd)) {
      issues.push({ type: 'UNKNOWN_COMMAND', cmd, pos: m.index });
    }
  }
  return issues;
}

// Check a single text field for LaTeX issues
function checkLaTeX(text, context) {
  const issues = [];
  if (!text || typeof text !== 'string') return issues;

  // Check for known invalid commands (case insensitive)
  for (const invalidCmd of INVALID_KATEX_COMMANDS) {
    if (text.includes(invalidCmd)) {
      issues.push({ type: 'INVALID_KATEX_CMD', cmd: invalidCmd, text: text.slice(0, 100) });
    }
  }

  // Check for command written with forward slash
  const fwdSlashCmds = text.match(/\/(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|times|div|pm|mp|cdot|circ|bullet|leq|geq|neq|approx|infty|partial|nabla|sqrt|frac|sum|prod|int|lim|log|ln|sin|cos|tan|csc|sec|cot|rightarrow|leftarrow|Rightarrow|Leftarrow|implies|iff|to|gets|mathrm|mathbf|textit|text|ce|pu)\b/g);
  if (fwdSlashCmds) {
    issues.push({ type: 'FWD_SLASH_CMD', cmd: fwdSlashCmds[0], text: text.slice(0, 100) });
  }

  // Check for $...$ blocks with invalid content
  const blocks = extractMathBlocks(text);
  for (const block of blocks) {
    if (!block.math) {
      issues.push({ type: 'EMPTY_MATH_BLOCK', context });
      continue;
    }

    // Check balanced braces
    if (!checkBalancedBraces(block.math)) {
      issues.push({ type: 'UNBALANCED_BRACES', math: block.math.slice(0, 80), context });
    }

    // Check for known invalid commands within the math block
    const cmdIssues = findAllCommandIssues(block.math);
    for (const ci of cmdIssues) {
      issues.push({ type: 'MATH_COMMAND_' + ci.type, cmd: ci.cmd, math: block.math.slice(Math.max(0, ci.pos - 10), ci.pos + 20), context });
    }

    // Check for \ce{} with questionable content
    const ceMatch = block.math.match(/\\ce\{([^}]+)\}/);
    if (ceMatch) {
      const content = ceMatch[1];
      const symbols = content.match(/[A-Z][a-z]?/g) || [];
      const invalidSymbols = symbols.filter(s => !VALID_ELEMENTS.has(s));
      if (invalidSymbols.length > 0) {
        issues.push({ type: 'CE_INVALID_ELEMENT', elements: invalidSymbols.join(','), ce: ceMatch[0], math: block.math.slice(0, 60), context });
      }
    }

    // Check for \ce outside mhchem (plain LaTeX)
    if (block.math.includes('\\ce') && !block.math.includes('\\ce{')) {
      issues.push({ type: 'CE_WITHOUT_BRACES', math: block.math.slice(0, 60), context });
    }
  }

  // Check for unclosed $ delimiters
  const dollarCount = (text.match(/\$/g) || []).length;
  if (dollarCount % 2 !== 0) {
    issues.push({ type: 'UNCLOSED_DOLLAR', text: text.slice(0, 100) });
  }

  // Check for double-backslash issues (sometimes appears from MD conversion)
  if (/\\\\[a-z]/.test(text)) {
    issues.push({ type: 'DOUBLE_BACKSLASH', text: text.slice(0, 100) });
  }

  // Check for degree symbol followed by LaTeX command
  if (text.includes('°\\')) {
    issues.push({ type: 'DEGREE_BEFORE_BACKSLASH', text: text.slice(0, 100) });
  }

  return issues;
}

function checkStructural(q) {
  const issues = [];

  // Check required fields
  if (!q.id) issues.push({ type: 'MISSING_ID' });
  if (!q.subject || !['chemistry','physics','math','biology'].includes(q.subject)) {
    issues.push({ type: 'INVALID_SUBJECT', value: q.subject });
  }
  if (!q.year || typeof q.year !== 'number') {
    issues.push({ type: 'INVALID_YEAR', value: q.year });
  }
  if (!q.category || !['objective','theory','practical'].includes(q.category)) {
    issues.push({ type: 'INVALID_CATEGORY', value: q.category });
  }
  if (!q.question || q.question.trim() === '') {
    issues.push({ type: 'EMPTY_QUESTION' });
  }

  // Options check for objective questions
  if (q.category === 'objective') {
    if (!q.options || !Array.isArray(q.options) || q.options.length === 0) {
      issues.push({ type: 'MISSING_OPTIONS' });
    } else {
      const validLabels = ['A','B','C','D','E'];
      q.options.forEach((o, i) => {
        if (!o.label) issues.push({ type: 'OPTION_NO_LABEL', index: i });
        if (!o.text && o.text !== '') {
          issues.push({ type: 'OPTION_NO_TEXT', index: i, label: o.label });
        }
        // Check for option text that's just numbers (potential issue)
        if (o.text && /^\d+$/.test(o.text.trim()) && o.text.trim().length > 3) {
          issues.push({ type: 'OPTION_NUMERIC_ONLY', index: i, label: o.label, text: o.text });
        }
      });
    }
    // Check correctAnswer exists
    if (!q.correctAnswer || q.correctAnswer.trim() === '') {
      issues.push({ type: 'MISSING_CORRECT_ANSWER' });
    } else if (!['A','B','C','D','E','TBD'].includes(q.correctAnswer)) {
      issues.push({ type: 'INVALID_CORRECT_ANSWER', value: q.correctAnswer });
    }
  }

  return issues;
}

// ============================================================
// MAIN
// ============================================================

const allData = [];
const sources = [];

// 1) new-questions
const nq = './src/data/new-questions/';
if (fs.existsSync(nq)) {
  fs.readdirSync(nq).forEach(subj => {
    const dir = path.join(nq, subj);
    if (!fs.statSync(dir).isDirectory()) return;
    fs.readdirSync(dir).forEach(f => {
      if (!f.endsWith('.json')) return;
      const filePath = path.join(dir, f);
      const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!Array.isArray(d)) return;
      d.forEach(q => allData.push({ source: path.join('new-questions', subj, f), ...q }));
      sources.push({ file: path.join('new-questions', subj, f), count: d.length });
    });
  });
}

// 2) output files
['chemistry', 'physics', 'math'].forEach(s => {
  const f = './output/' + s + '.json';
  if (!fs.existsSync(f)) return;
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!Array.isArray(d)) return;
  d.forEach(q => allData.push({ source: 'output/' + s + '.json', ...q }));
  sources.push({ file: 'output/' + s + '.json', count: d.length });
});

// Deduplicate
const seen = new Set();
const uniqueQuestions = [];
allData.forEach(q => {
  if (!seen.has(q.id)) {
    seen.add(q.id);
    uniqueQuestions.push(q);
  }
});

console.log('============================================================');
console.log('COMPREHENSIVE QUESTION VALIDATION REPORT');
console.log('============================================================');
console.log('Total unique questions:', uniqueQuestions.length);
console.log('');

// Validate each question
const allIssues = [];
let cleanCount = 0;

for (const q of uniqueQuestions) {
  const qIssues = [];
  const context = q.id + ' (' + q.source + ')';

  // Structural checks
  const structIssues = checkStructural(q);
  structIssues.forEach(i => qIssues.push({ ...i, id: q.id, context }));

  // LaTeX checks on question text
  if (q.question) {
    checkLaTeX(q.question, context + ' [question]').forEach(i => qIssues.push({ ...i, id: q.id, context }));
  }

  // LaTeX checks on options
  if (q.options && Array.isArray(q.options)) {
    q.options.forEach((o, idx) => {
      if (o.text) {
        checkLaTeX(o.text, context + ` [option ${o.label}]`).forEach(i => qIssues.push({ ...i, id: q.id, context }));
      }
    });
  }

  // LaTeX checks on explanation
  if (q.explanation) {
    checkLaTeX(q.explanation, context + ' [explanation]').forEach(i => qIssues.push({ ...i, id: q.id, context }));
  }

  // LaTeX checks on answerGuide
  if (q.answerGuide) {
    checkLaTeX(q.answerGuide, context + ' [answerGuide]').forEach(i => qIssues.push({ ...i, id: q.id, context }));
  }

  // LaTeX checks on title
  if (q.title) {
    checkLaTeX(q.title, context + ' [title]').forEach(i => qIssues.push({ ...i, id: q.id, context }));
  }

  if (qIssues.length === 0) {
    cleanCount++;
  } else {
    allIssues.push(...qIssues);
  }
}

// Print summary
console.log('Clean questions: ' + cleanCount + '/' + uniqueQuestions.length);
console.log('Questions with issues: ' + (uniqueQuestions.length - cleanCount));
console.log('Total issues found: ' + allIssues.length);
console.log('');

// Group by type
const byType = {};
allIssues.forEach(i => {
  const t = i.type;
  if (!byType[t]) byType[t] = [];
  byType[t].push(i);
});

console.log('Issues by type:');
Object.entries(byType)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([type, items]) => {
    console.log('  ' + type + ': ' + items.length);
    // Print first 3 examples
    items.slice(0, 3).forEach(i => {
      console.log('    - ' + i.id + ': ' + (i.text || i.math || i.cmd || i.ce || '').slice(0, 80));
    });
  });

console.log('');
console.log('============================================================');
console.log('DETAILED ISSUE LIST');
console.log('============================================================');

// Print all issues grouped by type
Object.entries(byType)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([type, items]) => {
    console.log('\n--- ' + type + ' (' + items.length + ') ---');
    items.forEach(i => {
      const detail = i.text || i.math || i.cmd || i.ce || '';
      console.log('  ' + i.id + ': ' + detail.slice(0, 120));
    });
  });

console.log('\n============================================================');
console.log('BY SUBJECT');
console.log('============================================================');

const bySubject = {};
uniqueQuestions.forEach(q => {
  const s = q.subject || 'unknown';
  if (!bySubject[s]) bySubject[s] = { total: 0, issues: 0 };
  bySubject[s].total++;
});

allIssues.forEach(i => {
  const q = uniqueQuestions.find(uq => uq.id === i.id);
  const s = q ? q.subject : 'unknown';
  if (!bySubject[s]) bySubject[s] = { total: 0, issues: 0 };
  bySubject[s].issues++;
});

Object.entries(bySubject).sort().forEach(([subj, stats]) => {
  const subjectIssues = allIssues.filter(i => {
    const q = uniqueQuestions.find(uq => uq.id === i.id);
    return q && q.subject === subj;
  });
  console.log(subj + ': ' + stats.total + ' questions, ' + subjectIssues.length + ' issues');
  // by category
  const catIssues = {};
  subjectIssues.forEach(i => {
    if (!catIssues[i.type]) catIssues[i.type] = 0;
    catIssues[i.type]++;
  });
  Object.entries(catIssues).sort((a,b) => b[1]-a[1]).forEach(([t,c]) => {
    console.log('  ' + t + ': ' + c);
  });
});
