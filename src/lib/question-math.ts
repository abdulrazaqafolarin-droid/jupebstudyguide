/**
 * Pure math-text pipeline shared by QuestionMath and MathRenderer.
 * No JSX here (keeps react-refresh lint quiet and logic unit-testable).
 */

const TEX_COMMANDS = new Set([
  "alpha", "beta", "gamma", "delta", "epsilon", "theta", "lambda", "mu",
  "nu", "pi", "rho", "sigma", "tau", "phi", "varphi", "chi", "psi",
  "omega", "Gamma", "Delta", "Theta", "Lambda", "Sigma", "Phi", "Psi",
  "Omega", "frac", "dfrac", "tfrac", "sqrt", "times", "cdot", "div",
  "pm", "mp", "le", "leq", "ge", "geq", "neq", "approx", "equiv",
  "sim", "propto", "infty", "partial", "nabla", "mathbf", "boldsymbol",
  "mathbb", "mathcal", "mathrm", "mathsf", "mathtt", "textrm", "text",
  "operatorname", "overrightarrow", "vec", "begin", "end", "left", "right",
  "lim", "int", "iint", "oint", "sum", "prod", "log", "ln", "sin", "cos",
  "tan", "sec", "csc", "cot", "arcsin", "arccos", "arctan", "exp", "binom",
  "overline", "underline", "hat", "bar", "widehat", "widetilde", "dot",
  "ddot", "prime", "dots", "ldots", "cdots", "vdots", "ddots", "quad",
  "qquad", "space", "overset", "underset", "stackrel", "boxed", "tag",
  "ce", "rightarrow", "leftarrow", "leftrightarrow", "Rightarrow",
  "Leftarrow", "Leftrightarrow", "therefore", "forall", "exists", "subset",
  "subseteq", "supset", "supseteq", "cup", "cap", "emptyset", "in", "notin",
  "mid", "perp", "parallel", "angle", "degree", "ell", "hbar", "Re", "Im",
  "det", "gcd", "max", "min"
]);

/**
 * Imported database rows sometimes contain doubled command slashes. A run
 * of four slashes before an ordinary symbol is an escaped row break, not a
 * command: preserve it as two TeX row-break slashes. Before a known command,
 * normalize doubled slashes to one and longer runs to row-break + command.
 */
function collapseBackslashes(latex: string): string {
  return latex
    .replace(/\\{2,}([A-Za-z]+)/g, (match, command: string) => {
      const slashCount = match.length - command.length;
      if (!TEX_COMMANDS.has(command)) {
        return slashCount >= 3 ? "\\\\" + command : match;
      }
      if (slashCount === 2) return "\\" + command;
      if (slashCount >= 3) return "\\\\" + "\\" + command;
      return match;
    })
    .replace(/\\{4,}(?=[^A-Za-z])/g, "\\\\");
}

function convertCe(latex: string): string {
  return latex.replace(/\\ce\{([^{}]*)\}/g, (_m, inner: string) => {
    let s = inner as string;
    // ionic charges first: Fe3+ -> Fe^{3+}
    s = s.replace(/([A-Za-z)\]])(\d+)([+-])/g, "$1^{$2$3}");
    // formula digits: H2O -> H_{2}O (skip already-subscripted)
    s = s.replace(/([A-Za-z)\]])(\d+)/g, "$1_{$2}");
    return `\\mathrm{${s}}`;
  });
}

export function normalizeMath(latex: string): string {
  let s = collapseBackslashes(latex);
  s = convertCe(s);
  s = s.replace(/->/g, "\\rightarrow");
  s = s.trim();
  // KaTeX rejects a leading ^/_ with no base (common in option fragments
  // like $^{2}$) — supply an empty base group.
  if (/^[\^_]/.test(s)) s = `{}${s}`;
  return s;
}

const SUBSCRIPT: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
};

/** Prose-only transforms (never applied inside math spans). */
export function transformProse(text: string): string {
  let s = text;
  // chemical formulas -> unicode subscripts: CO2 -> CO₂, H2O2 -> H₂O₂.
  // Requires an uppercase-led element run containing a digit, so plain
  // words (Question), years (2020) and _italic_ are untouched.
  s = s.replace(/\b(?=[A-Za-z]*\d)(?:[A-Z][a-z]?[0-9]*)+/g, (run) =>
    run.replace(/[0-9]/g, (d) => SUBSCRIPT[d] || d)
  );
  s = s.replace(/->/g, "→");
  return s;
}

export interface Segment {
  text: string;
  isMath: boolean;
  isBlock: boolean;
}

/** Split content into math spans and prose spans. */
export function splitMathSpans(content: string): Segment[] {
  const { masked, maths } = maskMath(content);
  const segs: Segment[] = [];
  let cur = 0;
  MATH_TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MATH_TOKEN_RE.exec(masked)) !== null) {
    if (m.index > cur) segs.push({ text: masked.slice(cur, m.index), isMath: false, isBlock: false });
    const entry = maths[indexDecode(m[1])];
    if (entry) segs.push({ text: entry.latex, isMath: true, isBlock: entry.isBlock });
    cur = m.index + m[0].length;
  }
  if (cur < masked.length) segs.push({ text: masked.slice(cur), isMath: false, isBlock: false });
  return segs;
}

const FRACTION_RE = /(\d+)\s*\/\s*(\d+)/g;
// bare superscript: x^2, 10^-4, e^{x}  (but not inside words)
const SUPER_RE = /([A-Za-z0-9)\]}])\^(\{[^{}]*\}|-?[0-9A-Za-z]+)/g;
// bare subscript with digit/braces only (so _italic_ is untouched)
const SUB_RE = /([A-Za-z])_(\{[^{}]*\}|\d\w*)/g;

/** Split bare scripts/fractions out of a prose span. */
export function splitProseScripts(text: string): Segment[] {
  const matches: { start: number; end: number; math: string }[] = [];
  const pushRe = (re: RegExp, build: (m: RegExpExecArray) => string) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const inside = matches.some((b) => m!.index >= b.start && m!.index < b.end);
      if (!inside) matches.push({ start: m.index, end: m.index + m[0].length, math: build(m) });
    }
  };
  pushRe(SUPER_RE, (m) => {
    const exp = m[2].startsWith("{") ? m[2] : `{${m[2]}}`;
    return `${m[1]}^${exp}`;
  });
  pushRe(SUB_RE, (m) => {
    const sub = m[2].startsWith("{") ? m[2] : `{${m[2]}}`;
    return `${m[1]}_${sub}`;
  });
  pushRe(FRACTION_RE, (m) => `\\frac{${m[1]}}{${m[2]}}`);
  matches.sort((a, b) => a.start - b.start);
  const segs: Segment[] = [];
  let cur = 0;
  for (const mm of matches) {
    if (mm.start > cur) segs.push({ text: text.slice(cur, mm.start), isMath: false, isBlock: false });
    segs.push({ text: mm.math, isMath: true, isBlock: false });
    cur = mm.end;
  }
  if (cur < text.length) segs.push({ text: text.slice(cur), isMath: false, isBlock: false });
  return segs.length > 0 ? segs : [{ text, isMath: false, isBlock: false }];
}

export interface MathEntry { latex: string; isBlock: boolean }

export const MATH_SENT = String.fromCharCode(0xe000);
const MATH_TOKEN = `${MATH_SENT}MATH`;
export const MATH_TOKEN_RE = new RegExp(`${MATH_TOKEN}([A-Z]+)${MATH_SENT}`, "g");

// Index encoded as letters (A=0, B=1, ...) so placeholders contain no
// digits/slashes that prose transforms (fractions, element subscripts)
// could latch onto.
function indexCode(i: number): string {
  let code = "";
  let n = i;
  while (true) {
    code = String.fromCharCode(65 + (n % 26)) + code;
    n = Math.floor(n / 26) - 1;
    if (n < 0) break;
  }
  return code;
}

export function indexDecode(code: string): number {
  let n = 0;
  for (const ch of code) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function mathPlaceholder(i: number): string {
  return `${MATH_TOKEN}${indexCode(i)}${MATH_SENT}`;
}

/** Replace math spans with placeholders; returns masked text + entries. */
export function maskMath(content: string): { masked: string; maths: MathEntry[] } {
  const maths: MathEntry[] = [];
  const spans: { start: number; end: number; math: string; isBlock: boolean }[] = [];
  const patterns: { regex: RegExp; isBlock: boolean }[] = [
    { regex: /\$\$([\s\S]*?)\$\$/g, isBlock: true },
    { regex: /\\\[([\s\S]*?)\\\]/g, isBlock: true },
    { regex: /\\\(([\s\S]*?)\\\)/g, isBlock: false },
    // Support multi-line inline delimiters used by imported matrices and
    // piecewise functions; avoid escaped dollars and display delimiters.
    { regex: /(?<!\\)\$(?!\$)([\s\S]+?)(?<!\\)\$(?!\$)/g, isBlock: false },
  ];

  for (const { regex, isBlock } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = spans.some((span) => start < span.end && end > span.start);
      if (!overlaps && match[1].trim().length > 0) {
        spans.push({ start, end, math: match[1], isBlock });
      }
    }
  }

  spans.sort((a, b) => a.start - b.start);
  let masked = "";
  let cursor = 0;
  for (const span of spans) {
    masked += content.slice(cursor, span.start);
    masked += mathPlaceholder(maths.length);
    maths.push({ latex: span.math, isBlock: span.isBlock });
    cursor = span.end;
  }
  masked += content.slice(cursor);
  return { masked, maths };
}
