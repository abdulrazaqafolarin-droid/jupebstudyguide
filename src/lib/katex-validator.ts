import katex from 'katex';
import 'katex/contrib/mhchem';

export interface KaTeXValidationError {
  block: string;
  error: string;
  position: number;
}

export function validateKaTeX(text: string): KaTeXValidationError[] {
  const errors: KaTeXValidationError[] = [];
  const blocks = extractMathBlocks(text);
  for (const block of blocks) {
    try {
      katex.renderToString(block.math, {
        throwOnError: true,
        macros: {
          "\\ce": "\\ce{#1}",
          "\\pu": "\\pu{#1}",
        },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ block: block.math, error: msg, position: block.position });
    }
  }
  return errors;
}

function extractMathBlocks(text: string): { math: string; position: number }[] {
  const blocks: { math: string; position: number }[] = [];
  const blockRe = /\$\$([\s\S]*?)\$\$/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(text)) !== null) {
    blocks.push({ math: match[1].trim(), position: match.index });
  }
  const inlineRe = /(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)\$(?!\$)/g;
  while ((match = inlineRe.exec(text)) !== null) {
    if (match[0].startsWith('$$')) continue;
    blocks.push({ math: match[1].trim(), position: match.index });
  }
  return blocks;
}

export function validateOptionsKaTeX(
  options: { label: string; text: string }[] | null
): KaTeXValidationError[] {
  if (!options) return [];
  const errors: KaTeXValidationError[] = [];
  for (const opt of options) {
    const innerErrors = validateKaTeX(opt.text);
    for (const e of innerErrors) {
      errors.push({ ...e, block: `Option ${opt.label}: ${e.block}` });
    }
  }
  return errors;
}

const COMMON_FIXES: Array<{ pattern: RegExp; replacement: string; desc: string }> = [
  { pattern: /\\(?=(?:mathrm|ce|pu|text|bf|it|sf|tt|cal|scr|frak|Bbb|bold|mathit|mathnormal|mathcal|mathfrak|mathbb|mathbf|mathsf|mathtt|mathscr|mathfrak|mathbb|mathbfsf|mathbfit))/g, replacement: '\\', desc: 'forward-slash LaTeX commands' },
  { pattern: /(?<!\$)(\b)(Cl2|F2|Br2|I2|N2|O2|H2)(?!\$)/g, replacement: '$1\\ce{$2}$', desc: 'diatomic elements' },
  { pattern: /(?<!\$|\\)\b(H2O|CO2|SO2|SO3|NO2|N2O|CH4|NH3|H2S|HCl|HF|HI|HBr)\b(?!\$)/g, replacement: '\\ce{$1}', desc: 'simple molecular formulas' },
  { pattern: /(?<!\$|\\)\b(H2SO4|HNO3|H2CO3|H3PO4|NaOH|KOH|NaCl|KCl|CaCO3|NaHCO3|MgSO4|CaCl2|KMnO4|K2Cr2O7|FeCl3|FeCl2|CuSO4|BaSO4|AgCl|AgNO3|NaNO3|NH4Cl|NH4NO3|Na2CO3|Na2SO4|MgO|Al2O3|Fe2O3|FeO|ZnO|CuO|MnO2|P2O5|SO2|SO3|NO2|N2O5|CO2|CO)\b(?!\$)/g, replacement: '\\ce{$1}', desc: 'common compounds' },
  { pattern: /(?<!\$|\\)\b(Fe2\+|Fe3\+|Mg2\+|Ca2\+|Na\+|K\+|Cl-|OH-|SO42-|CO32-|NO3-|NH4\+|H3O\+|Al3\+|Cu2\+|Zn2\+|Ag\+|Ba2\+|Pb2\+|Mn2\+|Cr3\+|Ni2\+|Co2\+|Sn2\+|Sr2\+|O2-|S2-|PO43-)\b(?!\$)/g, replacement: '\\ce{$1}', desc: 'common ions' },
  { pattern: /(?<!\$|\\)\b(\d)([spdf])(\d+)\b(?!\$)/g, replacement: '$1$2^{$3}', desc: 'electronic configurations' },
  { pattern: /(?<!\$|\\)(\d+\.?\d*)\s*[xX×]\s*10\s*([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)\b(?!\$)/g, replacement: '\\$1 \\times 10^{$2}$', desc: 'scientific notation with unicode exponents' },
  { pattern: /(?<!\$|\\)(\d+\.?\d*)\s*[xX×]\s*10\s*\^(-?\d+)\b(?!\$)/g, replacement: '\\$1 \\times 10^{$2}$', desc: 'scientific notation with ^' },
  { pattern: /(?<!\$)(\d+)\s*\/\s*(\d+)(?!\$)/g, replacement: '\\frac{$1}{$2}', desc: 'simple fractions' },
  { pattern: /([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)/g, replacement: (m: string) => { const d: Record<string, string> = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-'}; return '^{' + m.split('').map(c => d[c] || c).join('') + '}'; }, desc: 'unicode superscripts in math mode' },
  { pattern: /([₂₃₄₅₆₇₈₉₁₀]+)/g, replacement: (m: string) => { const d: Record<string, string> = {'₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','₁':'1','₀':'0'}; return '_{' + m.split('').map(c => d[c] || c).join('') + '}'; }, desc: 'unicode subscripts in math mode' },
];

export function postProcessLaTeX(text: string): string {
  let result = text;

  if (!result.includes('$') && !result.includes('$$')) {
    for (const fix of COMMON_FIXES) {
      result = result.replace(fix.pattern, fix.replacement as string);
    }
    return result;
  }

  const protectedBlocks: string[] = [];
  const placeholderIndex: number[] = [];
  result = result.replace(/\$\$[\s\S]*?\$\$|\$[^$]*?\$/g, (match) => {
    protectedBlocks.push(match);
    placeholderIndex.push(protectedBlocks.length - 1);
    return `\x00MATH${protectedBlocks.length - 1}\x00`;
  });

  for (const fix of COMMON_FIXES) {
    result = result.replace(fix.pattern, fix.replacement as string);
  }

  result = result.replace(/\x00MATH(\d+)\x00/g, (_, idx) => {
    return protectedBlocks[parseInt(idx)];
  });

  return result;
}

export async function validateAndFixKaTeX(
  text: string,
  maxRetries: number = 2,
  retryFn?: (brokenLaTeX: string, error: string) => Promise<string>,
): Promise<{ fixed: string; errors: KaTeXValidationError[] }> {
  let current = text;
  let allErrors: KaTeXValidationError[] = [];

  current = postProcessLaTeX(current);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const errors = validateKaTeX(current);
    allErrors = errors;

    if (errors.length === 0) return { fixed: current, errors: [] };

    if (!retryFn || attempt >= maxRetries) break;

    const firstError = errors[0];
    const fixResult = await retryFn(firstError.block, firstError.error);
    current = current.replace(firstError.block, fixResult);
    current = postProcessLaTeX(current);
  }

  return { fixed: current, errors: allErrors };
}
