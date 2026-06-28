import { describe, it, expect } from 'vitest';

const MATH_PH = '__MATH_PLACEHOLDER_';

function hasPH(s: string): boolean {
  return s.includes(MATH_PH);
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
  'alpha', 'beta', 'gamma', 'delta', 'epsilon',
  'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda',
  'mu', 'nu', 'xi', 'omicron', 'pi', 'rho', 'sigma',
  'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon',
  'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda',
  'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma',
  'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega',
]);

function isKnownWord(word: string): boolean {
  const upper = word.toUpperCase();
  if (upper.length <= 1) return false;
  if (GREEK_LETTERS.has(word)) return false;
  for (const p of ['hydro', 'chloro', 'fluoro', 'bromo', 'iodo', 'nitro', 'sulfo', 'phospho', 'methyl', 'ethyl', 'propyl', 'butyl']) {
    if (word.toLowerCase().startsWith(p)) return false;
  }
  return /^[A-Z][a-z]{2,}$/.test(word) || /^[A-Z]{2,}$/.test(word);
}

function convertUnicodeSubscripts(text: string): string {
  let result = text;
  result = result.replace(/\u2212/g, '-');
  result = result.replace(/\u2013/g, '-');
  result = result.replace(/\u2014/g, '--');
  result = result.replace(/\u2026/g, '...');
  return result;
}

function formulaToLatex(formula: string): string {
  return `$\\ce{${formula}}$`;
}

function simulateProcessing(input: string): string {
  let processedContent = input;
  let protectedBlocks: string[] = [];

  // Step 0a
  processedContent = processedContent
    .replace(/(?<!\$)\+\+(?!\$)/g, '+')
    .replace(/(?<!\$)--(?!\$)/g, '-')
    .replace(/\s{3,}/g, '  ')
    .trim();

  // Step 0a1
  processedContent = processedContent
    .replace(/MATH(?:_PLACEHOLDER)?_\d+/gi, '')
    .replace(/__MATH_PLACEHOLDER_\d+__/g, '')
    .trim();

  // Step 0b
  processedContent = processedContent.replace(/\$\$[\s\S]*?\$\$/g, (m) => {
    const idx = protectedBlocks.length;
    protectedBlocks.push(m);
    return `${MATH_PH}${idx}__`;
  });
  processedContent = processedContent.replace(
    /(?<!\$|\d)\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\$|\d)/g,
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

  // Step 0c
  processedContent = processedContent.replace(
    /\/(mathrm|text|textbf|textit|mathbf|mathit|mathsf|mathtt|mathcal|mathbb|mathfrak|mathscr|ce|pu|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|times|div|pm|mp|cdot|circ|bullet|leq|geq|neq|approx|infty|partial|nabla|sqrt|frac|sum|prod|int|lim|log|ln|sin|cos|tan|csc|sec|cot|rightarrow|leftarrow|Rightarrow|Leftarrow|implies|iff|to|gets|left|right|big|bigg|bigl|bigr|biggl|biggr|binom|choose|textstyle|displaystyle|scriptstyle)\b/g,
    '\\$1'
  );

  // STEP 1
  processedContent = processedContent.replace(
    /\$\$[\s\S]*?\$\$|(?<!\$|\d)\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\$|\d)/g,
    (match) => {
      const inner = match.startsWith('$$') ? match.slice(2, -2) : match.slice(1, -1);
      const trimmed = inner.trim();
      if (!match.startsWith('$$')) {
        const hasLatexCommand = /\\[a-z]|\^|_|\{|\}/i.test(trimmed);
        const isJustNumber = /^\d+(?:[.,]\d+)?$/.test(trimmed);
        if (!hasLatexCommand || isJustNumber) {
          return match;
        }
      }
      const idx = protectedBlocks.length;
      protectedBlocks.push(match);
      return `${MATH_PH}${idx}__`;
    }
  );
  const cleanMathContent = (m: string): string => {
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

  // convertUnicodeSubscripts
  processedContent = convertUnicodeSubscripts(processedContent);

  // STEP 2 — Chemistry patterns
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

  // STEP 3: Restore
  processedContent = processedContent.replace(
    new RegExp(MATH_PH + '(\\d+)__', 'g'),
    (_, idx) => protectedBlocks[parseInt(idx)] ?? ''
  );

  return processedContent;
}

describe('MathRenderer trace', () => {
  it('detects already-processed text correctly', () => {
    // This replicates the early-exit check in the real MathRenderer
    const alreadyProcessed = (text: string) =>
      /(?<!\$|\d)\$(?!\$)(?:[^$\\]|\\.)+\$(?!\$|\d)/.test(text) &&
      /\\[a-z]|\\ce\{|\\mathrm\{|\\times|\^|\{|_/.test(text);

    // Raw text — should return false
    expect(alreadyProcessed('The rate of formation of O₃(g) is 2.0 × 10⁷ mol L⁻¹ s⁻¹.')).toBe(false);

    // Already-processed with LaTeX math — should return true  
    expect(alreadyProcessed('The rate of formation of $\\ce{O3}\\mathrm{(g)}$ is $2.0 \\times 10^{7}$ mol L⁻¹ s⁻¹.')).toBe(true);

    // Plain dollar amount — should return false
    expect(alreadyProcessed('It costs $5 per item')).toBe(false);

    // Math with digit-prefixed $ — the 3$ shouldn't trigger
    expect(alreadyProcessed('the reaction 3$\\ce{O2}$')).toBe(false);
  });
  it('handles raw Unicode chemistry text correctly', () => {
    const input = 'The rate of formation of O₃(g) is 2.0 × 10⁷ mol L⁻¹ s⁻¹. What is the rate of disappearance of O₂(g) in mol L⁻¹ s⁻¹ for the reaction 3O₂(g) → 2O₃(g)?';
    const result = simulateProcessing(input);
    console.log('RAW Unicode input:');
    console.log('  INPUT:', JSON.stringify(input));
    console.log('  OUTPUT:', JSON.stringify(result));
    // With Unicode subscripts, singleChemRe shouldn't match O₂/O₃
    // so these should NOT be wrapped in \ce{}
    expect(result).not.toContain('\\ce{O2}');
    expect(result).not.toContain('\\ce{O3}');
    expect(result).toContain('\\mathrm{(g)}');
  });

  it('handles text with regular digits (O2, O3) correctly', () => {
    const input = 'The rate of formation of O3(g) is 2.0 × 10⁷ mol L⁻¹ s⁻¹. What is the rate of disappearance of O2(g) in mol L⁻¹ s⁻¹ for the reaction 3O2(g) → 2O3(g)?';
    const result = simulateProcessing(input);
    console.log('Regular digit input:');
    console.log('  INPUT:', JSON.stringify(input));
    console.log('  OUTPUT:', JSON.stringify(result));
    // With regular digits, O2 and O3 SHOULD be matched by singleChemRe
    expect(result).toContain('\\ce{O2}');
    expect(result).toContain('\\ce{O3}');
    // (g) should be converted
    expect(result).toContain('\\mathrm{(g)}');
    // No stray $ without purpose
    expect((result.match(/\$/g) || []).length % 2).toBe(0);
  });

  it('handles already-processed text (re-run scenario) gracefully', () => {
    const input = 'The rate of formation of $\\ce{O3}\\mathrm{(g)}$ is $2.0 \\times 10^{7}$ mol L-1s-1. What is the rate of disappearance of $\\ce{O2}\\mathrm{(g)}$ in mol L⁻¹ s⁻¹ for the reaction 3$\\ce{O2}\\mathrm{(g)}$ → 2$\\ce{O3}\\mathrm{(g)}$?';
    const result = simulateProcessing(input);
    console.log('Already-processed input:');
    console.log('  INPUT:', JSON.stringify(input));
    console.log('  OUTPUT:', JSON.stringify(result));
    // Should not double-process
    // Check for nested \ce{} issues
    expect(result).not.toContain('\\ce{\\ce{');
    // Math blocks should be balanced
    expect((result.match(/\$/g) || []).length % 2).toBe(0);
  });

  it('does not mangle text after (g) state conversion', () => {
    // This simulates: O2(g) in mol L-1 s-1 for...
    const input = 'O2(g) in mol L-1 s-1 for the reaction';
    const result = simulateProcessing(input);
    console.log('(g) state context:');
    console.log('  INPUT:', JSON.stringify(input));
    console.log('  OUTPUT:', JSON.stringify(result));
    expect(result).toContain('in mol');
    expect(result).not.toContain('inmol');
  });

  it('handles (aq) state with remaining text', () => {
    const input = 'What is the pH of 0.1M HCl(aq) solution?';
    const result = simulateProcessing(input);
    console.log('(aq) state:');
    console.log('  INPUT:', JSON.stringify(input));
    console.log('  OUTPUT:', JSON.stringify(result));
    expect(result).toContain('solution');
  });
});
