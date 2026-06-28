/**
 * Test MathRenderer trace — what happens to various inputs
 * Run with: npx tsx src/test/trace-math.ts
 */
import { MathRenderer } from '../components/MathRenderer';
import React from 'react';
import { renderToString } from 'react-dom/server';

// We can't easily test the component, but we can trace the logic manually.
// Let me replicate the exact processing pipeline:

const MATH_PH = '__MATH_PLACEHOLDER_';
const TABLE_PH = '__TABLE_PLACEHOLDER_';

function hasPH(s: string): boolean {
  return s.includes(MATH_PH) || s.includes(TABLE_PH);
}

const UNICODE_SUP_TO_DIGIT: Record<string, string> = {
  '\u2070': '0', '\u00B9': '1', '\u00B2': '2', '\u00B3': '3',
  '\u2074': '4', '\u2075': '5', '\u2076': '6', '\u2077': '7',
  '\u2078': '8', '\u2079': '9', '\u207B': '-',
};
const UNICODE_SUP_RE = /[\u2070-\u2079\u207B\u00B9\u00B2\u00B3]/g;

const GREEK_LETTERS = new Set([
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
  'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi',
  'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
  'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi',
  'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega',
]);

function isKnownWord(word: string): boolean {
  const upper = word.toUpperCase();
  if (upper.length <= 1) return false;
  if (GREEK_LETTERS.has(word)) return false;
  const CHEM_PREFIXES = ['hydro', 'chloro', 'fluoro', 'bromo', 'iodo', 'nitro', 'sulfo', 'phospho', 'methyl', 'ethyl', 'propyl', 'butyl'];
  for (const p of CHEM_PREFIXES) {
    if (word.toLowerCase().startsWith(p)) return false;
  }
  return /^[A-Z][a-z]{2,}$/.test(word) || /^[A-Z]{2,}$/.test(word);
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

function trace(title: string, input: string) {
  console.log(`\n=== ${title} ===`);
  console.log(`INPUT:     ${JSON.stringify(input)}`);

  let processedContent = input;
  let protectedBlocks: string[] = [];

  // Step 0a
  processedContent = processedContent
    .replace(/(?<!\$)\+\+(?!\$)/g, '+')
    .replace(/(?<!\$)--(?!\$)/g, '-')
    .replace(/\s{3,}/g, '  ')
    .trim();
  console.log(`After 0a: ${JSON.stringify(processedContent)}`);

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
  console.log(`After 0b: ${JSON.stringify(processedContent)}`);

  // Step 0c
  processedContent = processedContent.replace(
    /\/(mathrm|text|ce|alpha|beta|times|div|pm|bullet|cdot|circ|infty|partial|nabla|sqrt|frac|sum|prod|int|lim|log|ln|sin|cos|tan|rightarrow|leftarrow|to|gets|left|right|csc|sec|cot|leq|geq|neq|approx)\b/g,
    '\\$1'
  );
  console.log(`After 0c: ${JSON.stringify(processedContent)}`);

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
  console.log(`After STEP1: ${JSON.stringify(processedContent)}`);
  console.log(`  Protected: [${protectedBlocks.map(b => JSON.stringify(b)).join(', ')}]`);

  // convertUnicodeSubscripts
  processedContent = convertUnicodeSubscripts(processedContent);
  console.log(`After convUni: ${JSON.stringify(processedContent)}`);

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
  console.log(`After chemMulti: ${JSON.stringify(processedContent)}`);

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
  console.log(`After singleChem: ${JSON.stringify(processedContent)}`);

  // Electronic configs
  processedContent = processedContent.replace(
    /\b(\d+[spdf])(\d+)(?:\s+\d+[spdf]\d+)*\b/g,
    (match) => {
      if (hasPH(match)) return match;
      const parts = match.split(/\s+/);
      const formatted = parts.map((p: string) => {
        const m = p.match(/^(\d+[spdf])(\d+)$/);
        if (!m) return p;
        return `${m[1]}^{${m[2]}}`;
      }).join('\\,');
      return `$${formatted}$`;
    }
  );

  // Scientific notation: 6.02 × 10²³
  processedContent = processedContent.replace(
    /(\d+(?:\.\d+)?)\s*[xX×]\s*10(?:\^(-?\d+)|([\u2070-\u2079\u00B9\u00B2\u00B3\u207B]*))?/g,
    (match, coeff, exp, supExp) => {
      if (hasPH(match)) return match;
      if (exp) return `$${coeff} \\times 10^{${exp}}$`;
      if (supExp) {
        const sup = supExp.replace(UNICODE_SUP_RE, (ch: string) => UNICODE_SUP_TO_DIGIT[ch] ?? ch);
        return `$${coeff} \\times 10^{${sup}}$`;
      }
      return `$${coeff} \\times 10$`;
    }
  );

  // Number with Unicode superscript exponent
  processedContent = processedContent.replace(
    /(\d+)([\u2070-\u2079\u207B\u00B9\u00B2\u00B3]+)(?!\s*\^)/g,
    (match, base, supExp) => {
      if (hasPH(match)) return match;
      if (supExp) {
        const sup = supExp.replace(UNICODE_SUP_RE, (ch: string) => UNICODE_SUP_TO_DIGIT[ch] ?? ch);
        return `$${base}^{${sup}}$`;
      }
      return match;
    }
  );

  // Units with slash
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
  console.log(`After (g) state: ${JSON.stringify(processedContent)}`);

  // Simple fractions
  processedContent = processedContent.replace(
    /(?<!\$)(\d+)\s*\/\s*(\d+)(?!\$)/g,
    (match, num, den) => {
      if (hasPH(match)) return match;
      return `$\\frac{${num}}{${den}}$`;
    }
  );

  // STEP 3: Restore protected math blocks
  processedContent = processedContent.replace(
    new RegExp(MATH_PH + '(\\d+)__', 'g'),
    (_, idx) => protectedBlocks[parseInt(idx)] ?? ''
  );
  console.log(`STEP 3 final: ${JSON.stringify(processedContent)}`);
  console.log('');
}

// Test 1: Raw Unicode chemistry text (as in the .json files)
trace('Raw Unicode chemistry text', 
  'The rate of formation of O₃(g) is 2.0 × 10⁷ mol L⁻¹ s⁻¹. What is the rate of disappearance of O₂(g) in mol L⁻¹ s⁻¹ for the reaction 3O₂(g) → 2O₃(g)?');

// Test 2: Already processed text (as if saved after previous MathRenderer run)
trace('Already-processed (re-run)',
  'The rate of formation of $\\ce{O3}\\mathrm{(g)}$ is $2.0 \\times 10^{7}$ mol L-1s-1. What is the rate of disappearance of $\\ce{O2}\\mathrm{(g)}$ in mol L⁻¹ s⁻¹ for the reaction 3$\\ce{O2}\\mathrm{(g)}$ → 2$\\ce{O3}\\mathrm{(g)}$?');

// Test 3: Already processed WITHOUT proper math delimiters
trace('Partially processed (broken state)',
  'The rate of formation of $\\ce{O3}\\mathrm{(g)}$ is $2.0 \\times 10^{7}$ mol L-1s-1. What is the rate of disappearance of $\\ce{O2}\\mathrm{(g)}$ in mol L⁻¹ s⁻¹ for the reaction 3$\\ce{O2}\\mathrm{(g)}$ → 2$\\ce{O3}\\mathrm{(g)}$?');
