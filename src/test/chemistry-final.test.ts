import { describe, it, expect } from 'vitest';

// Import the actual simulation from the other test file
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

/**
 * Simulates the MathRenderer pipeline (raw text path)
 */
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
  // Updated regex with digit+\$+\backslash support
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

  // Step 0c
  processedContent = processedContent.replace(
    /\/(mathrm|text|ce|alpha|beta|times|div|pm|bullet|cdot|circ|infty|partial|nabla|sqrt|frac|sum|prod|int|lim|log|ln|sin|cos|tan|rightarrow|leftarrow|to|gets|left|right|csc|sec|cot|leq|geq|neq|approx)\b/g,
    '\\$1'
  );

  // STEP 1
  processedContent = processedContent.replace(
    /\$\$[\s\S]*?\$\$|(?:(?<!\$|\d)\$(?!\$)|\d\$(?=\\))((?:[^$\\]|\\.)+?)\$(?!\$|\d)/g,
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

/**
 * Simulates the early-exit path for already-processed text
 */
function simulateEarlyExit(input: string): string {
  let processedContent = input;
  
  // Strip placeholders
  processedContent = processedContent
    .replace(/MATH(?:_PLACEHOLDER)?_\d+/gi, '')
    .replace(/__MATH_PLACEHOLDER_\d+__/g, '')
    .trim();

  // Fix forward-slash LaTeX
  processedContent = processedContent.replace(
    /\/(mathrm|text|ce|alpha|beta|times|div|pm|bullet|cdot|circ|infty|partial|nabla|sqrt|frac|sum|prod|int|lim|log|ln|sin|cos|tan|rightarrow|leftarrow|to|gets|left|right|csc|sec|cot|leq|geq|neq|approx)\b/g,
    '\\$1'
  );

  return processedContent;
}

/**
 * The early-exit detection check
 */
function isAlreadyProcessed(text: string): boolean {
  return /(?:(?<!\$|\d)\$(?!\$)|\d\$(?=\\))(?:[^$\\]|\\.)+\$(?!\$|\d)/.test(text) &&
    /\\[a-z]|\\ce\{|\\mathrm\{|\\times|\^|\{|_/.test(text);
}

describe('CHEMISTRY PAST QUESTIONS — FINAL VERIFICATION', () => {

  it('PCl5(g) → PCl3(g) + Cl2(g) — raw text renders correctly', () => {
    const input = 'Calculate the enthalpy change for: PCl5(g) → PCl3(g) + Cl2(g)';
    const result = simulateProcessing(input);
    console.log('PCl5 reaction:', result);
    expect(result).toContain('\\ce{PCl5}');
    expect(result).toContain('\\ce{PCl3}');
    expect(result).toContain('\\ce{Cl2}');
    expect(result).not.toContain('\\ce{Cl5}'); // no nested \ce{}
    expect(result).toContain('\\mathrm{(g)}');
    // No raw LaTeX commands outside math mode
    const outsideMath = result.replace(/\$[^$]*\$/g, '');
    expect(outsideMath).not.toContain('\\ce');
    expect(outsideMath).not.toContain('\\mathrm');
  });

  it('TiO₂(s) and CO(g) — raw text with Unicode subscripts', () => {
    const input = 'Given that the standard enthalpy changes of formation of TiO₂(s) and CO(g) are 940 kJmol⁻¹ and −110 kJmol⁻¹ respectively.';
    const result = simulateProcessing(input);
    console.log('TiO₂ CO:', result);
    // Unicode subscripts should NOT be wrapped in \ce{} (singleChemRe doesn't match Unicode digits)
    // But (s) and (g) ARE wrapped
    expect(result).toContain('\\mathrm{(s)}');
    expect(result).toContain('\\mathrm{(g)}');
    expect(result).not.toContain('\\ce{TiO}'); 
    // Check no raw LaTeX leaks
    const outsideMath = result.replace(/\$[^$]*\$/g, '');
    expect(outsideMath).not.toContain('\\ce');
    expect(outsideMath).not.toContain('\\mathrm');
  });

  it('entropy change O₂(g) → O₃(g) — raw text with mixed formats', () => {
    const input = 'Calculate the entropy change for: 3O₂(g) → 2O₃(g)';
    const result = simulateProcessing(input);
    console.log('O₂ O₃:', result);
    // Unicode subscripts O₂, O₃ stay as-is (not \ce{})
    expect(result).toContain('O₂');
    expect(result).toContain('O₃');
    expect(result).toContain('\\mathrm{(g)}');
    // No raw leaks
    const outsideMath = result.replace(/\$[^$]*\$/g, '');
    expect(outsideMath).not.toContain('\\ce');
    expect(outsideMath).not.toContain('\\mathrm');
  });

  it('ALREADY-PROCESSED TEXT — early exit produces clean output', () => {
    const input = 'Calculate $\\ce{PCl5}$ enthalpy change for: $\\ce{PCl5(g)}$ → $\\ce{PCl3(g)}$ + $\\ce{Cl2(g)}$';
    const isAlready = isAlreadyProcessed(input);
    console.log('Detected as already processed:', isAlready);
    expect(isAlready).toBe(true);
    
    const earlyExitResult = simulateEarlyExit(input);
    console.log('Early-exit result:', earlyExitResult);
    // The $...$ blocks should be preserved intact
    expect(earlyExitResult).toContain('$\\ce{PCl5}$');
    expect(earlyExitResult).toContain('$\\ce{PCl5(g)}$');
    // No nested \ce{}
    expect(earlyExitResult).not.toContain('\\ce{$');
  });

  it('O₃(g) is 2.0 × 10⁷ — full raw chemistry question', () => {
    const input = 'The rate of formation of O₃(g) is 2.0 × 10⁷ mol L⁻¹ s⁻¹. What is the rate of disappearance of O₂(g) in mol L⁻¹ s⁻¹ for the reaction 3O₂(g) → 2O₃(g)?';
    const result = simulateProcessing(input);
    console.log('O3/O2 rate question:', result);
    // Unicode subscripts preserved
    expect(result).toContain('O₃');
    expect(result).toContain('O₂');
    // (g) state wrapped
    expect(result).toContain('\\mathrm{(g)}');
    // No \ce{} for single-element formulas with Unicode subscripts
    expect(result).not.toContain('\\ce{O');
    // No \mathrm or \ce outside math
    const outsideMath = result.replace(/\$[^$]*\$/g, '');
    expect(outsideMath).not.toContain('\\mathrm');
    expect(outsideMath).not.toContain('\\ce');
  });

  it('ALREADY-PROCESSED with 3$ — early exit handles digit-prefixed $', () => {
    const input = 'The rate of formation of $\\ce{O3}\\mathrm{(g)}$ is $2.0 \\times 10^{7}$ mol L-1s-1. What is the rate of disappearance of $\\ce{O2}\\mathrm{(g)}$ in mol L⁻¹ s⁻¹ for the reaction 3$\\ce{O2}\\mathrm{(g)}$ → 2$\\ce{O3}\\mathrm{(g)}$?';
    const isAlready = isAlreadyProcessed(input);
    console.log('Detected as already processed (with 3$):', isAlready);
    expect(isAlready).toBe(true);
    
    const earlyExitResult = simulateEarlyExit(input);
    console.log('Early-exit 3$ result:', earlyExitResult);
    // The main $...$ blocks should be intact
    expect(earlyExitResult).toContain('$\\ce{O3}\\mathrm{(g)}$');
    expect(earlyExitResult).toContain('$\\ce{O2}\\mathrm{(g)}$');
    // The 3$ case - $\\ce{O2} should be preserved (not corrupted)
    expect(earlyExitResult).toContain('3$\\ce{O2}');
    // No nested \ce{}
    expect(earlyExitResult).not.toContain('\\ce{$');
    expect(earlyExitResult).not.toContain('\\mathrm{$');
  });
});
