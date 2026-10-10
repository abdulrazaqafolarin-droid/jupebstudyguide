import React, { useMemo } from "react";
import "katex/dist/katex.min.css";
import { maskMath, mathPlaceholder, splitProseScripts, transformProse, type MathEntry } from "@/lib/question-math";
import { substituteMath, type KeyRef } from "@/lib/question-math-render";

/** Split bare scripts/fractions out of masked prose into new math entries. */
function remaskScripts(masked: string, maths: MathEntry[]): string {
  let out = "";
  for (const seg of splitProseScripts(masked)) {
    if (seg.isMath) {
      out += mathPlaceholder(maths.length);
      maths.push({ latex: seg.text, isBlock: false });
    } else {
      out += seg.text;
    }
  }
  return out;
}

function renderLines(text: string, keyRef: KeyRef): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  text.split("\n").forEach((line, i) => {
    if (i > 0) parts.push(<br key={`br-${keyRef.key++}`} />);
    const bullet = line.match(/^\s*([-•*]|\d+\.)\s+(.*)$/);
    if (bullet) {
      parts.push(
        <span key={keyRef.key++} className="flex items-start gap-2">
          <span className="text-primary shrink-0">{bullet[1]}</span>
          <span>{renderInlineText(bullet[2], keyRef.key)}</span>
        </span>
      );
      keyRef.key += 10;
      return;
    }
    parts.push(...renderInlineText(line, keyRef.key));
    keyRef.key += 10;
  });
  return parts;
}

interface QuestionMathProps {
  content: string;
  className?: string;
  /** Render spans only (safe inside <button>/<p> — avoids div-in-button nesting). */
  inline?: boolean;
}

/**
 * Renders question-bank content (stems, options, explanations).
 *
 * DB content mixes styles: `$...$` LaTeX (often with over-escaped `\\`),
 * bare `x^2` / `CO_2` scripts, `n/m` fractions, `\ce{...}` chemistry
 * (mhchem is NOT available in KaTeX), and plain prose.
 *
 * Pipeline (order matters):
 *   1. Split out existing `$...$` / `$$...$$` spans FIRST so later
 *      transforms can never corrupt valid LaTeX.
 *   2. Normalize math spans: collapse `\\` runs, `\ce` -> `\mathrm`
 *      with subscripted digits, ASCII `->` -> `\rightarrow`.
 *   3. Split bare `^`/`_` scripts and `n/m` fractions out of text spans
 *      into their own math nodes.
 *   4. Render math via KaTeX with a per-node plain-text fallback
 *      (a failing node can never blank the question).
 *   5. Render text with light inline formatting (bold/italic/code).
 */
function renderInlineText(text: string, startKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let key = startKey;
  const re = /(\*\*|__)(.*?)\1|(\*|_)([^*_]+?)\3|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={key++} className="font-semibold text-foreground">{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={key++} className="italic">{m[4]}</em>);
    else if (m[5]) {
      parts.push(
        <code key={key++} className="bg-secondary/70 text-primary px-1.5 py-0.5 rounded font-mono text-sm">
          {m[5]}
        </code>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : [text];
}

export const QuestionMath: React.FC<QuestionMathProps> = ({ content, className = "", inline = false }) => {
  const nodes = useMemo(() => {
    if (!content) return null;
    // Mask math spans first so prose transforms can never corrupt LaTeX,
    // and bold/italic can span across math.
    const { masked, maths } = maskMath(content);
    // Lone $ (all paired spans are masked) + prose transforms.
    const cleaned = transformProse(masked.replace(/\$/g, ""));
    // Split bare scripts/fractions into additional math nodes.
    const remasked = remaskScripts(cleaned, maths);
    const keyRef: KeyRef = { key: 0 };
    const parts: React.ReactNode[] = [];
    for (const n of renderLines(remasked, keyRef)) substituteMath(n, maths, keyRef, parts);
    return parts.length > 0 ? parts : content;
  }, [content]);

  if (inline) {
    return <span className={className}>{nodes}</span>;
  }
  return (
    <div className={`max-w-full min-w-0 break-words [overflow-wrap:anywhere] ${className}`}>
      {nodes}
    </div>
  );
};

export default QuestionMath;
