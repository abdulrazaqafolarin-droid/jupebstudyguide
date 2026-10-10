import React, { useMemo } from 'react';
import 'katex/dist/katex.min.css';
import { substituteMath, type KeyRef } from '@/lib/question-math-render';
import { normalizeMath, maskMath, mathPlaceholder } from '@/lib/question-math';

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders AI-generated markdown with LaTeX math support.
 *
 * Math spans are masked with placeholders BEFORE any text transform runs,
 * so fraction/element/bold transforms can never corrupt valid LaTeX
 * (and bold/italic can span across math spans).
 */

const SUBSCRIPT: Record<string, string> = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉'};


export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  const renderedContent = useMemo(() => {
    if (!content) return null;

    // 1. Mask math spans so text transforms can't touch LaTeX.
    const { masked, maths } = maskMath(content);

    // 2. Pre-process prose (math is safely masked out).
    let processed = masked;

    // Convert simple fractions like 3/2 to proper LaTeX.
    processed = processed.replace(
      /(?<!\$)(\d+)\s*\/\s*(\d+)(?!\$)/g,
      (match, num, den) => `$\\frac{${num}}{${den}}$`
    );

    // Fix chemical formulas - proper subscripts for formulas like H2O, CO2
    const ELEMENTS = new Set(['H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe','Cs','Ba','La','Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb','Lu','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi','Po','At','Rn','Fr','Ra','Ac','Th','Pa','U','Np','Pu','Am','Cm','Bk','Cf','Es','Fm','Md','No','Lr']);
    processed = processed.replace(
      /\b([A-Z][a-z]?)(\d+)/g,
      (match, element, number) => {
        if (!ELEMENTS.has(element)) return match;
        return element + (number as string).split('').map(c => SUBSCRIPT[c] || c).join('');
      }
    );

    // 3. Newly created $...$ fractions also become math nodes: re-mask them.
    const fragRe = /(?<!\$)\$([^$\n]+?)\$(?!\$)/g;
    const withFractions = processed.replace(fragRe, (_mm, latex: string) => {
      const i = maths.length;
      maths.push({ latex, isBlock: false });
      return mathPlaceholder(i);
    });

    // 4. Render text (quotes/rules/bold spanning placeholders), then swap math back in.
    const keyRef: KeyRef = { key: 0 };
    const textNodes = renderTextWithFormatting(withFractions, keyRef);
    const parts: React.ReactNode[] = [];
    for (const n of textNodes) substituteMath(n, maths, keyRef, parts);
    return parts.length > 0 ? parts : content;
  }, [content]);

  return <div className={`math-content max-w-full min-w-0 break-words [overflow-wrap:anywhere] ${className}`}>{renderedContent}</div>;
};

// Helper function to render basic text formatting (bold, italic, lists, quotes, rules, etc.)
function renderTextWithFormatting(text: string, keyRef: KeyRef): React.ReactNode[] {
  const parts: React.ReactNode[] = [];

  // Split by newlines first to handle line breaks, lists, quotes, rules
  const lines = text.split('\n');

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      parts.push(<br key={`br-${keyRef.key++}`} />);
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      parts.push(<hr key={keyRef.key++} className="my-3 border-border/60" />);
      return;
    }

    // Blockquote
    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      parts.push(
        <span key={keyRef.key++} className="block border-l-2 border-primary/50 pl-3 text-muted-foreground">
          {formatInlineText(quoteMatch[1], keyRef)}
        </span>
      );
      return;
    }

    // Check for list items
    const bulletMatch = line.match(/^(\s*)([-•*]|\d+\.)\s+(.*)$/);
    if (bulletMatch) {
      const [, , bullet, content] = bulletMatch;
      parts.push(
        <span key={keyRef.key++} className="flex items-start gap-2">
          <span className="text-primary shrink-0">{bullet}</span>
          <span>{formatInlineText(content, keyRef)}</span>
        </span>
      );
      return;
    }

    // Check for headers
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = headerMatch[2];
      parts.push(
        <span key={keyRef.key++} className={`font-bold ${level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm'}`}>
          {formatInlineText(content, keyRef)}
        </span>
      );
      return;
    }

    // Regular text with inline formatting
    parts.push(...formatInlineText(line, keyRef));
  });

  return parts;
}

// Format inline text (bold, italic, code)
function formatInlineText(text: string, keyRef: KeyRef): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const formatRegex = /(\*\*|__)(.*?)\1|(\*|_)([^*_]+?)\3|`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = formatRegex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // Bold
      parts.push(<strong key={keyRef.key++} className="font-semibold text-foreground">{match[2]}</strong>);
    } else if (match[3]) {
      // Italic
      parts.push(<em key={keyRef.key++} className="italic">{match[4]}</em>);
    } else if (match[5]) {
      // Code
      parts.push(
        <code
          key={keyRef.key++}
          className="bg-secondary/70 text-primary px-1.5 py-0.5 rounded font-mono text-sm"
        >
          {match[5]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export default MathRenderer;
