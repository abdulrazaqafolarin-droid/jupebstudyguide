import React, { useMemo } from 'react';
import 'katex/dist/katex.min.css';
import 'katex/contrib/mhchem';
import { InlineMath, BlockMath } from 'react-katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

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
  // Keep all Unicode subscripts, superscripts, Greek letters, and math symbols
  // as-is. Modern browsers render them natively. Only convert to LaTeX commands
  // when the result will be wrapped in $...$ by later STEP 2 regex patterns.
  //
  // Previously this function converted these to LaTeX commands (\circ, \alpha,
  // \sqrt{}, etc.) but those ended up OUTSIDE $...$ delimiters, leaking as raw
  // LaTeX text visible to users — the exact bug reported as "fragments of katex
  // and latex visible in questions."
  result = result.replace(/\u2212/g, '-');
  result = result.replace(/\u2013/g, '-');
  result = result.replace(/\u2014/g, '--');
  result = result.replace(/\u2026/g, '...');
  return result;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  const renderedContent = useMemo(() => {
    if (!content) return null;

    let processedContent = content;

    // Step -1: Detect if content was already processed (contains $...$ with LaTeX commands).
    // If so, skip all text-to-LaTeX conversions (STEP 2) to avoid double-processing.
    // Already-processed text has patterns like $\ce{O2}$ or $\mathrm{(g)}$.
    // Raw text has no $ signs or only plain number dollars like $100.
    // If content already contains $...$ with LaTeX commands, it was already processed
    // by a previous render pass. Skip all text-to-LaTeX conversions to avoid
    // double-processing and corruption (e.g., 3$\ce{O2}$ → \ce{$\ce{O2}$}).
    const alreadyProcessed = /(?:(?<!\$|\d)\$(?!\$)|\d\$(?=\\))(?:[^$\\]|\\.)+\$(?!\$|\d)/.test(processedContent) &&
      /\\[a-z]|\\ce\{|\\mathrm\{|\\times|\^|\{|_/.test(processedContent);

    if (alreadyProcessed) {
      // Strip any stray placeholders from previous render passes
      processedContent = processedContent
        .replace(/MATH(?:_PLACEHOLDER)?_\d+/gi, '')
        .replace(/__MATH_PLACEHOLDER_\d+__/g, '')
        .trim();

      // Fix forward-slash LaTeX commands
      processedContent = processedContent.replace(
        /\/(mathrm|text|textbf|textit|mathbf|mathit|mathsf|mathtt|mathcal|mathbb|mathfrak|mathscr|ce|pu|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|times|div|pm|mp|cdot|circ|bullet|leq|geq|neq|approx|infty|partial|nabla|sqrt|frac|sum|prod|int|lim|log|ln|sin|cos|tan|csc|sec|cot|rightarrow|leftarrow|Rightarrow|Leftarrow|implies|iff|to|gets|left|right|big|bigg|bigl|bigr|biggl|biggr|binom|choose|textstyle|displaystyle|scriptstyle)\b/g,
        '\\$1'
      );
      // Go directly to splitting and rendering
      const tableBlocks: string[] = [];
      return splitAndRender(processedContent, tableBlocks);
    }

    // Step 0a: Normalize common data errors
    // (g)++(g) -> (g)+(g), etc — DON'T touch $$ (block math)
    processedContent = processedContent
      .replace(/(?<!\$)\+\+(?!\$)/g, '+')
      .replace(/(?<!\$)--(?!\$)/g, '-')
      .replace(/\s{3,}/g, '  ')
      .trim();

    // Step 0a1: Strip model-generated placeholders (MATH_PLACEHOLDER_N, MATH_0, MATH_N, etc)
    processedContent = processedContent
      .replace(/MATH(?:_PLACEHOLDER)?_\d+/gi, '')
      .replace(/__MATH_PLACEHOLDER_\d+__/g, '')
      .trim();

    let protectedBlocks: string[] = [];

    // Step 0b: Strip stray $ signs but preserve valid $...$ and $$...$$ math
    // Strategy: first protect ALL $...$ and $$...$$, then remove remaining stray $,
    // then restore. This avoids stripping valid inline math.
    // 1) Protect ALL $$...$$
    processedContent = processedContent.replace(/\$\$[\s\S]*?\$\$/g, (m) => {
      const idx = protectedBlocks.length;
      protectedBlocks.push(m);
      return `${MATH_PH}${idx}__`;
    });
    // 2) Protect ALL $...$ (same logic as STEP 1 but without dollar-amount filter)
    processedContent = processedContent.replace(
      /(?:(?<!\$|\d)\$(?!\$)|\d\$(?=\\))((?:[^$\\]|\\.)+?)\$(?!\$|\d)/g,
      (match) => {
        const idx = protectedBlocks.length;
        protectedBlocks.push(match);
        return `${MATH_PH}${idx}__`;
      }
    );
    // 3) Now any remaining $ is truly stray — remove them
    processedContent = processedContent.replace(/\$/g, '');
    // 4) Restore all protected blocks
    processedContent = processedContent.replace(
      new RegExp(MATH_PH + '(\\d+)__', 'g'),
      (_, idx) => protectedBlocks[parseInt(idx)] ?? ''
    );
    // 5) Reset — STEP 1 will re-protect and filter properly
    protectedBlocks = [];

    // Step 0c: Fix forward-slash LaTeX commands (Supabase data issue)
    // /mathrm, /text, /ce, /alpha etc -> \mathrm, \text, \ce, \alpha
    processedContent = processedContent.replace(
      /\/(mathrm|text|textbf|textit|mathbf|mathit|mathsf|mathtt|mathcal|mathbb|mathfrak|mathscr|ce|pu|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|times|div|pm|mp|cdot|circ|bullet|leq|geq|neq|approx|infty|partial|nabla|sqrt|frac|sum|prod|int|lim|log|ln|sin|cos|tan|csc|sec|cot|rightarrow|leftarrow|Rightarrow|Leftarrow|implies|iff|to|gets|left|right|big|bigg|bigl|bigr|biggl|biggr|binom|choose|textstyle|displaystyle|scriptstyle)\b/g,
      '\\$1'
    );

    // ============================================================
    // STEP 1: Protect existing $...$ and $$...$$ from pre-processing
    // ============================================================
    // Match $$...$$ first, then $...$ — allow $ before digits
    // (model often writes $100\\text{g}..., not dollar amounts)
    // After matching, skip plain dollar amounts like $5, $100 (no LaTeX commands inside)
    processedContent = processedContent.replace(
      /\$\$[\s\S]*?\$\$|(?:(?<!\$|\d)\$(?!\$)|\d\$(?=\\))((?:[^$\\]|\\.)+?)\$(?!\$|\d)/g,
      (match) => {
        const inner = match.startsWith('$$') ? match.slice(2, -2) : match.slice(1, -1);
        const trimmed = inner.trim();
        // If content is just a plain number or simple text (no LaTeX commands),
        // it's a dollar amount — don't protect it
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

    // Clean up content inside protected math blocks
    const cleanMathContent = (m: string): string => {
      const isBlock = m.startsWith('$$');
      const inner = isBlock ? m.slice(2, -2) : m.slice(1, -1);
      let cleaned = inner
        .replace(/(\\text\{[^}]*\})([a-zA-Z])/g, '$1 $2')
        .replace(/\{\}/g, '')
        .replace(/\.{4,}/g, '...')
        .trim();
      // Fix unbalanced \left/\right — count pairs, strip if mismatched
      const leftCount = (cleaned.match(/\\left\b/g) || []).length;
      const rightCount = (cleaned.match(/\\right\b/g) || []).length;
      if (leftCount !== rightCount) {
        cleaned = cleaned
          .replace(/\\left\s*([([{}|.\]])/g, '$1')
          .replace(/\\right\s*([)\]}|\].])/g, '$1');
      }
      // If cleaned is mostly plain English words (long letter runs, few math operators),
      // it's likely text the model wrongly put inside $...$ — unwrap it to plain text.
      const mathOperators = /[=+\-*/^_{}\\[\]()]|\\frac|\\sqrt|\\int|\\sum/g;
      const mathOpCount = (cleaned.match(mathOperators) || []).length;
      const letterRuns = cleaned.match(/[a-zA-Z]{8,}/g) || [];
      const totalLetters = (cleaned.match(/[a-zA-Z]/g) || []).length;
      // Unwrap if: long word runs exist AND few math ops AND mostly letters
      if (
        letterRuns.length > 0 &&
        mathOpCount < 2 &&
        totalLetters > 10 &&
        totalLetters > cleaned.length * 0.5
      ) {
        return cleaned;
      }
      if (isBlock) return '$$\n' + cleaned + '\n$$';
      return '$' + cleaned + '$';
    };
    protectedBlocks = protectedBlocks.map(cleanMathContent);

    // --- Tables: replace markdown tables with a placeholder ---
    const tableBlocks: string[] = [];
    const tableLines: number[] = [];
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

    // Step 0b: Convert Unicode special chars to LaTeX equivalents
    // (After Step 1 protection so existing $...$ content is untouched)
    processedContent = convertUnicodeSubscripts(processedContent);

    // ============================================================
    // STEP 2: Apply text-to-LaTeX conversions
    // ============================================================

    const formulaToLatex = (formula: string): string => {
      // mhchem handles subscripts, charges, and parentheses natively.
      // No need for manual _{} subscript insertion which can produce invalid
      // LaTeX inside \ce{} for complex formulas like [Co(NH3)6]F3.
      return `$\\ce{${formula}}$`;
    };

    // Pattern 1: Multi-element chemical formulas
    const chemMultiPattern =
      /(?:[A-Z][a-z]?(?:\d*|\([A-Z][a-z]?\d*\)\d*)|\([A-Z][a-z]?\d*\)\d*){2,}(?:[+-]\d*)?/g;
    processedContent = processedContent.replace(chemMultiPattern, (match) => {
      if (hasPH(match)) return match;
      if (!/\d/.test(match)) return match;
      if (isKnownWord(match)) return match;
      const symbols = match.match(/[A-Z][a-z]?/g) || [];
      if (symbols.length > 0 && !symbols.every(s => VALID_ELEMENTS.has(s))) return match;
      if (/^[A-Z]{3,}$/.test(match)) return match;
      // Guard against misidentified course codes (ABC123) but allow
      // valid short formulas like NH3, CH4 (only 2 capital letters + digit)
      if (/^[A-Z]{3,5}\d/.test(match)) return match;
      return formulaToLatex(match);
    });

    // Pattern 2: Single-element formulas with subscripts: H2, O2, N2, Cl2
    // IMPORTANT: Must not match inside already-wrapped $...$ blocks from
    // Pattern 1 (e.g., matching Cl5 inside $\ce{PCl5}$ creates nested \ce{}).
    // Check by scanning backwards for an unclosed $ before the match.
    const singleChemRe = /[A-Z][a-z]?\d+(?:[+-]\d*)?/g;
    processedContent = processedContent.replace(singleChemRe, (match, offset) => {
      if (hasPH(match)) return match;
      if (isKnownWord(match)) return match;
      // Skip if inside $...$ (already wrapped by Pattern 1 or other STEP 2 patterns)
      const before = processedContent.slice(0, offset);
      const lastDollar = before.lastIndexOf('$');
      if (lastDollar !== -1) {
        const afterDollar = before.slice(lastDollar + 1);
        if (afterDollar.startsWith('\\ce{')) return match;
      }
      const elem = match.match(/^([A-Z][a-z]?)\d+/);
      if (elem && !VALID_ELEMENTS.has(elem[1])) return match;
      // Allow NH3/CH4 through (only 2 caps + digit) while still
      // filtering course-code-like false positives (3+ caps + digit)
      if (/^[A-Z]{3,4}\d+$/.test(match)) return match;
      return formulaToLatex(match);
    });

    // Electronic configurations: 1s2 2s2 2p6 3s2 3p4
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

    // Scientific notation: 3 x 10^8, 6.02 x 10^23, 6.02 × 10²³
    // Must handle both ^digit and Unicode superscript exponents (², ³, ⁻, etc.)
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

    // Number with Unicode superscript exponent: 10², 10⁻³, 10⁻¹⁴
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

    // Units with slash: m/s^2, kg/m^3
    const unitFalsePositives = new Set([
      'and/or', 'give/receive', 'input/output', 'true/false',
      'yes/no', 'on/off', 'up/down', 'in/out', 'win/lose',
      'a/an', 'is/are',
    ]);
    processedContent = processedContent.replace(
      /\b([a-zA-Z]{1,2})\/([a-z]{2,5}(?:\^\{?\d+\}?)?)\b/g,
      (match, num, den) => {
        if (hasPH(match) || hasPH(num) || hasPH(den)) return match;
        if (unitFalsePositives.has(match.toLowerCase())) return match;
        return `$${match}$`;
      }
    );

    // (g), (s), (l), (aq) chemical state conversion
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
        // Avoid wrapping if part of a date (e.g., "2024/2025 session")
        if (num.length >= 4 && den.length >= 4) return match;
        return `$\\frac{${num}}{${den}}$`;
      }
    );

    // ============================================================
    // STEP 2.5: Math-specific auto-detection patterns
    // These extend auto-detection for math subjects (JUPEB, etc.)
    // ============================================================

    // --- Pattern: Variable with Unicode superscript (x² → $x^{2}$, y³ → $y^{3}$) ---
    // Handles: x², 2x², -2x², x³, y³, etc. Does NOT handle (x+y)².
    // The leading `-?\d*` captures the numeric coefficient + variable together
    // (e.g., "-2x²" matches fully), then splits into coefficient + variable.
    // Must NOT match if preceded by a letter (English word) or followed by a letter.
    // The entire match is wrapped in $...$ to avoid digit-before-$ regex issues.
    processedContent = processedContent.replace(
      /(-?\d*[a-zA-Z])([\u00B2\u00B3\u00B9])/g,
      (match, expr, sup, offset, full) => {
        if (hasPH(match)) return match;
        // Skip if preceded by a letter (inside an English word like "expression²")
        if (offset > 0 && /[a-zA-Z]/.test(full[offset - 1])) return match;
        // Skip if followed by a letter (inside a word like "x²pression")
        const nextOffset = offset + match.length;
        if (nextOffset < full.length && /[a-zA-Z]/.test(full[nextOffset])) return match;
        const digit = UNICODE_SUP_TO_DIGIT[sup] ?? sup;
        return `$${expr}^{${digit}}$`;
      }
    );

    // --- Pattern: Simple equation or inequality with variable ---
    // Wraps single-line expressions containing =, <, or > with a variable letter
    // AND no English prose words. Handles: "2x + 3 = 5", "x² > 0", "-1/2 < x < 3", "f(x) = x² - 7"
    // The expression must start and end with math-like content (digit, variable, paren, bracket).
    // NOTE: The character classes include ] and } by positioning them first or escaping them.
    processedContent = processedContent.replace(
      /(^|[\s(,;:])(-?[0-9a-zA-Z\u00B2\u00B3\u00B9_({[]+[^,\n;]*?[=<>≤≥][^,\n;]*?[\]0-9a-zA-Z)}]+)/gm,
      (match, before, expr) => {
        if (hasPH(match)) return match;
        const trimmed = expr.trim();
        if (trimmed.length < 3 || trimmed.length > 150) return match;
        if (!/[a-zA-Z]/.test(trimmed)) return match;
        if (/\b(and|the|for|that|this|with|which|what|equation|function|value|values|range|find|determine|solve|evaluate|calculate|obtain|express|given|using|hence|note|where|when|from|into|also|than|then|there|their|these|those|each|both|more|some|such|only|just|can|has|have|been|were|will|would|could)\b/i.test(trimmed)) return match;
        const words = trimmed.split(/\s+/);
        if (words.filter(w => w.length > 8).length > 1) return match;
        if (/^[A-Z]{3,5}\s*\d{3}/.test(trimmed)) return match;
        return before + `$${trimmed}$`;
      }
    );

    // ============================================================
    // STEP 3: Restore protected math blocks
    // ============================================================
    processedContent = processedContent.replace(
      new RegExp(MATH_PH + '(\\d+)__', 'g'),
      (_, idx) => protectedBlocks[parseInt(idx)] ?? ''
    );

    // ============================================================
    // STEP 4 (safety): Catch any remaining leaked placeholders
    // ============================================================
    processedContent = processedContent.replace(
      new RegExp(MATH_PH + '(\\d+)__', 'g'),
      (_, idx) => protectedBlocks[parseInt(idx)] ?? ''
    );
    processedContent = processedContent.replace(
      new RegExp(TABLE_PH + '(\\d+)__', 'g'),
      (_, idx) => tableBlocks[parseInt(idx)] ?? ''
    );

    return splitAndRender(processedContent, tableBlocks, content);
  }, [content]);

  return (
    <div className={`math-content max-w-full min-w-0 break-words [overflow-wrap:anywhere] ${className}`}>
      {renderedContent}
    </div>
  );
};

// ============================================================
// STEP 5: Split into parts and render with KaTeX
// ============================================================
function splitAndRender(
  processedContent: string,
  tableBlocks: string[],
  fallbackContent?: string
): React.ReactNode[] | string {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  let key = 0;

  const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
  const inlineMathRegex = /(?:(?<!\$|\d)\$(?!\$)|\d\$(?=\\))((?:[^$\\]|\\.)+?)\$(?!\$|\d)/g;

  const mathMatches: { start: number; end: number; math: string; isBlock: boolean }[] = [];

  let match;
  while ((match = blockMathRegex.exec(processedContent)) !== null) {
    mathMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      math: match[1].trim(),
      isBlock: true,
    });
  }

  while ((match = inlineMathRegex.exec(processedContent)) !== null) {
    const isInsideBlock = mathMatches.some(
      b => match!.index >= b.start && match!.index < b.end
    );
    if (!isInsideBlock && match[1].trim().length > 0) {
      mathMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        math: match[1].trim(),
        isBlock: false,
      });
    }
  }

  mathMatches.sort((a, b) => a.start - b.start);

  for (const mathMatch of mathMatches) {
    if (mathMatch.start > currentIndex) {
      const textBefore = processedContent.slice(currentIndex, mathMatch.start);
      if (textBefore.trim()) {
        parts.push(
          <span key={key++} className="whitespace-pre-wrap">
            {renderTextWithFormatting(textBefore, key, tableBlocks)}
          </span>
        );
        key += 20;
      }
    }

    try {
      const latex = mathMatch.math.trim();
      if (mathMatch.isBlock) {
        parts.push(
          <div key={key++} className="my-4 overflow-x-auto max-w-full py-2">
            <div className="inline-block min-w-full text-center">
              <BlockMath
                math={latex}
                renderError={(_err: Error) => (
                  <span className="text-foreground italic">{latex}</span>
                )}
              />
            </div>
          </div>
        );
      } else {
        parts.push(
          <InlineMath
            key={key++}
            math={latex}
            renderError={(_err: Error) => (
              <span className="text-foreground italic">{latex}</span>
            )}
          />
        );
      }
    } catch {
      parts.push(
        <span key={key++} className="text-foreground italic">
          {mathMatch.math}
        </span>
      );
    }

    currentIndex = mathMatch.end;
  }

  if (currentIndex < processedContent.length) {
    const remainingText = processedContent.slice(currentIndex);
    if (remainingText.trim()) {
      parts.push(
        <span key={key++} className="whitespace-pre-wrap">
          {renderTextWithFormatting(remainingText, key, tableBlocks)}
        </span>
      );
    }
  }

  return parts.length > 0 ? parts : (fallbackContent ?? processedContent);
}

// ============================================================
// Text Formatting Helpers
// ============================================================

function renderTextWithFormatting(
  text: string,
  startKey: number,
  tableBlocks: string[]
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let key = startKey;

  const lines = text.split('\n');

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      parts.push(<br key={`br-${key++}`} />);
    }

    const tableMatch = line.match(new RegExp('^' + TABLE_PH + '(\\d+)__$'));
    if (tableMatch) {
      const tblHtml = renderTable(tableBlocks[parseInt(tableMatch[1])], key);
      parts.push(<div key={key++} className="my-3 overflow-x-auto">{tblHtml}</div>);
      key += 20;
      return;
    }

    const bulletMatch = line.match(/^(\s*)([-•*]|\d+\.)\s+(.*)$/);
    if (bulletMatch) {
      const [, , bullet, content] = bulletMatch;
      parts.push(
        <span key={key++} className="flex items-start gap-2">
          <span className="text-primary shrink-0">{bullet}</span>
          <span>{formatInlineText(content, key)}</span>
        </span>
      );
      key += 10;
      return;
    }

    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = headerMatch[2];
      parts.push(
        <span key={key++} className={`font-bold ${level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm'}`}>
          {formatInlineText(content, key)}
        </span>
      );
      key += 10;
      return;
    }

    parts.push(...formatInlineText(line, key));
    key += 10;
  });

  return parts;
}

function formatInlineText(text: string, startKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let key = startKey;

  const formatRegex = /(\*\*|__)(.*?)\1|(\*)([^*]+?)\3|`([^`]+)`/g;
  let lastIndex = 0;
  let match;

  while ((match = formatRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      parts.push(<strong key={key++} className="font-semibold text-foreground">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++} className="italic">{match[4]}</em>);
    } else if (match[5]) {
      parts.push(
        <code key={key++} className="bg-secondary/70 text-primary px-1.5 py-0.5 rounded font-mono text-sm">
          {match[5]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// ============================================================
// Table Rendering
// ============================================================

function renderTable(markdownTable: string, startKey: number): React.ReactNode {
  const rows = markdownTable.trim().split('\n').filter((l: string) => l.trim());
  if (rows.length < 2) return null;

  let key = startKey;

  const headerRow = rows[0];
  const dataRows = rows.slice(2);

  const parseRow = (row: string): string[] => {
    return row
      .split('|')
      .map((c: string) => c.trim())
      .filter((c: string) => c.length > 0);
  };

  const headers = parseRow(headerRow);
  const isSep = rows[1] && /^[\s|:-]+$/.test(rows[1]);

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          {headers.map((h: string, i: number) => (
            <th key={i} className="border border-border px-3 py-2 bg-muted/50 font-semibold text-left">
              {formatInlineText(h, key++)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(isSep ? dataRows : rows.slice(1)).map((row: string, ri: number) => (
          <tr key={ri}>
            {parseRow(row).map((cell: string, ci: number) => (
              <td key={ci} className="border border-border px-3 py-2">
                {formatInlineText(cell, key++)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default MathRenderer;
