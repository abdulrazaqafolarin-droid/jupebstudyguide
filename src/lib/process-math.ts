const MATH_PH = '__MATH_PLACEHOLDER_';
const PROTECT_PH = '__PROTECTED_';

function hasPH(s: string): boolean {
  return s.includes(MATH_PH) || s.includes(PROTECT_PH);
}

const UNICODE_SUB: Record<string, string> = {
  '\u2080': '0', '\u2081': '1', '\u2082': '2', '\u2083': '3', '\u2084': '4',
  '\u2085': '5', '\u2086': '6', '\u2087': '7', '\u2088': '8', '\u2089': '9',
};
const UNICODE_SUP: Record<string, string> = {
  '\u2070': '0', '\u00B9': '1', '\u00B2': '2', '\u00B3': '3',
  '\u2074': '4', '\u2075': '5', '\u2076': '6', '\u2077': '7',
  '\u2078': '8', '\u2079': '9', '\u207B': '-',
};

const UNIT_FALSE_POSITIVES = new Set([
  'and/or', 'give/receive', 'input/output', 'true/false',
  'yes/no', 'on/off', 'up/down', 'in/out', 'win/lose',
  'a/an', 'is/are',
]);

function unicodeSubToDigits(s: string): string {
  return s.replace(/[\u2080-\u2089]/g, c => UNICODE_SUB[c] || c);
}
function unicodeSupToDigits(s: string): string {
  return s.replace(/[\u2070-\u2079\u207B\u00B9\u00B2\u00B3]/g, c => UNICODE_SUP[c] || c);
}

function protectExistingMath(text: string): { text: string; blocks: string[] } {
  const blocks: string[] = [];
  let t = text;
  t = t.replace(/\$\$[^$]*\$\$/g, m => {
    const ph = `${PROTECT_PH}${blocks.length}__`;
    blocks.push(m);
    return ph;
  });
  t = t.replace(/(?<!\$|\d)\$(?!\$)((?:\\.|[^$\\])*)\$/g, m => {
    const inner = m.slice(1, -1).trim();
    if (!inner) return m;
    const hasLC = /\\[a-z]|\^|_|\{|\}|\\\\/.test(inner);
    const isNum = /^\d+(?:[.,]\d+)?$/.test(inner);
    if (!hasLC || isNum) return m;
    const ph = `${PROTECT_PH}${blocks.length}__`;
    blocks.push(m);
    return ph;
  });
  return { text: t, blocks };
}

function restoreBlocks(text: string, blocks: string[]): string {
  let t = text;
  for (let i = 0; i < blocks.length; i++) {
    t = t.replace(`${PROTECT_PH}${i}__`, blocks[i]);
  }
  return t;
}

function step2_chemical(text: string): string {
  let t = text;

  // Multi-element with Unicode subscripts: H₂SO₄, Al₂O₃ → $H_2SO_4$
  t = t.replace(/([A-Z][a-z]?)([\u2080-\u2089]+)((?:[A-Z][a-z]?(?:[\u2080-\u2089]+)?)+)/g, (m, e1, s1, rest) => {
    if (hasPH(m)) return m;
    const sub = unicodeSubToDigits(s1);
    const restNorm = rest.replace(/([\u2080-\u2089]+)/g, s => `_{${unicodeSubToDigits(s)}}`);
    return `$${e1}_{${sub}}${restNorm}$`;
  });

  // Single element: H₂, O₂ → $H_2$
  t = t.replace(/(?<!\$)([A-Z][a-z]?)([\u2080-\u2089])(?!\w|\))/g, (m, elem, sub) => {
    if (hasPH(m)) return m;
    if (elem.length === 1 && 'CHONPS'.includes(elem)) {
      return `$${elem}_{${unicodeSubToDigits(sub)}}$`;
    }
    return m;
  });

  // Multi-element formulas with regular digits: H2SO4, Al2O3, CH4, C2H5OH
  t = t.replace(/\b([A-Z][a-z]?)(\d+)((?:[A-Z][a-z]?(?:\d+)?)+)\b/g, (m, e1, d1, rest) => {
    if (hasPH(m)) return m;
    if (m.length > 12) return m;
    const restNorm = rest.replace(/([A-Z][a-z]?)(\d+)/g, (_, el, d) => `${el}_{${d}}`);
    return `$${e1}_{${d1}}${restNorm}$`;
  });

  // Multi-element: H2O, CO2 → $H_2O$
  t = t.replace(/\b([A-Z][a-z]?)(\d+)([A-Za-z\u00b0])/g, (m, elem, num, rest) => {
    if (hasPH(m)) return m;
    if (m.length > 8) return m;
    return `$${elem}_{${num}}${rest}$`;
  });

  // Single element with digit: Cl2, O2, N2 → $Cl_2$
  t = t.replace(/\b([A-Z][a-z]?)(\d+)\b/g, (m, elem, num) => {
    if (hasPH(m)) return m;
    if (elem.length > 2) return m;
    if (/[aeiou]/i.test(elem) && elem.length > 1) return m;
    return `$${elem}_{${num}}$`;
  });

  // Electronic configs: 1s²2s²2p⁶ → $1s^2 2s^2 2p^6$
  t = t.replace(/(\d+(?:[spdfg])(?:[\u00B2\u00B3\u2070\u2071\u2074-\u2079]+|(?:\^\{?\d+\}?))(?:\d+(?:[spdfg])(?:[\u00B2\u00B3\u2070\u2071\u2074-\u2079]+|(?:\^\{?\d+\}?)))*)/g, m => {
    if (hasPH(m)) return m;
    const normalized = m.replace(/([\u00B2\u00B3\u2070\u2071\u2074-\u2079]+)/g, s => `^{${unicodeSupToDigits(s)}}`);
    return `$${normalized}$`;
  });

  // Scientific notation
  t = t.replace(/\b(\d+(?:\.\d+)?)\s*[\u00D7x]\s*10\s*(?:\^\{?(-?\d+)\}?|([\u2070-\u2079\u207B\u00B9\u00B2\u00B3]+))/g, (m, coeff, expNum, expUni) => {
    if (hasPH(m)) return m;
    const exp = expNum || unicodeSupToDigits(expUni);
    if (coeff === '10') return `$10^{${exp}}$`;
    return `$${coeff} \\times 10^{${exp}}$`;
  });

  // Chemical states: (g), (s), (l), (aq)
  t = t.replace(/(?<!\$)\(([glsaq])\)(?!\$\}\{)/g, (m, state) => {
    if (hasPH(m)) return m;
    return `$\\mathrm{(${state})}$`;
  });

  // Units with slash: g/mol, cm/s
  t = t.replace(/\b([a-zA-Z]{1,2})\/([a-z]{2,5}(?:\^\{?\d+\}?)?)\b/g, (m, num, den) => {
    if (hasPH(m)) return m;
    if (UNIT_FALSE_POSITIVES.has(m)) return m;
    if (!/^(g|kg|mg|L|mL|cm|m|s|mol|J|N|Pa|W|V|A|Hz|K)$/i.test(num)) return m;
    return `$${m}$`;
  });

  // Nuclear isotopes: ²³⁸U → $^{238}U$
  t = t.replace(/([\u2070-\u2079\u207B\u00B9\u00B2\u00B3]+)([A-Z][a-z]?)/g, (m, sup, elem) => {
    if (hasPH(m)) return m;
    return `$^{${unicodeSupToDigits(sup)}}${elem}$`;
  });

  return t;
}

export function processMathText(raw: string): string {
  if (!raw || typeof raw !== 'string') return raw;
  let t = raw;

  const { text: t1, blocks } = protectExistingMath(t);
  t = t1;

  t = step2_chemical(t);

  t = restoreBlocks(t, blocks);

  return t;
}

export interface KaTeXifyResult {
  original: string;
  processed: string;
  changed: boolean;
  changes: string[];
}

export function kaTeXifyText(text: string): KaTeXifyResult {
  const processed = processMathText(text);
  const changed = processed !== text;
  const changes: string[] = [];
  if (changed) {
    const mathCount = (processed.match(/\$[^$]+\$/g) || []).length;
    const stateCount = (processed.match(/\$\\mathrm\{\(/g) || []).length;
    const sciCount = (processed.match(/\\times 10\^\{/g) || []).length;
    if (mathCount) changes.push(`Wrapped ${mathCount} expressions in math mode`);
    if (stateCount) changes.push(`Formatted ${stateCount} chemical states`);
    if (sciCount) changes.push(`Formatted ${sciCount} scientific notation expressions`);
  }
  return { original: text, processed, changed, changes };
}

export function previewDiff(original: string, processed: string): string {
  if (original === processed) return original;
  const lines: string[] = [];
  lines.push('--- Original');
  lines.push('+++ KaTeXified');
  const oWords = original.split(/(\$\$[^$]*\$\$|\$[^$]*\$|\s+)/);
  const pWords = processed.split(/(\$\$[^$]*\$\$|\$[^$]*\$|\s+)/);
  lines.push(`Changes detected: ${original.length} → ${processed.length} chars`);
  return lines.join('\n');
}
