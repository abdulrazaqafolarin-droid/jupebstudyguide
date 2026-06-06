import React, { useMemo } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown content with LaTeX math support
 * Handles both inline math ($...$) and block math ($$...$$)
 * Also handles proper formatting for fractions, integrals, and chemical equations
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  const renderedContent = useMemo(() => {
    if (!content) return null;
    
    // Pre-process content to fix common formatting issues
    let processedContent = content;
    
    // Convert simple fractions like 8+3/2 to proper LaTeX
    // Match patterns like "number/number" not already in $ delimiters
    processedContent = processedContent.replace(
      /(?<!\$)(\d+)\s*\/\s*(\d+)(?!\$)/g, 
      (match, num, den) => `$\\frac{${num}}{${den}}$`
    );
    
    // Fix chemical equations - proper subscripts for formulas like H2O, CO2, NaCl
    const ELEMENTS = new Set(['H','He','Li','Be','B','C','N','O','F','Ne','Na','Mg','Al','Si','P','S','Cl','Ar','K','Ca','Sc','Ti','V','Cr','Mn','Fe','Co','Ni','Cu','Zn','Ga','Ge','As','Se','Br','Kr','Rb','Sr','Y','Zr','Nb','Mo','Tc','Ru','Rh','Pd','Ag','Cd','In','Sn','Sb','Te','I','Xe','Cs','Ba','La','Ce','Pr','Nd','Pm','Sm','Eu','Gd','Tb','Dy','Ho','Er','Tm','Yb','Lu','Hf','Ta','W','Re','Os','Ir','Pt','Au','Hg','Tl','Pb','Bi','Po','At','Rn','Fr','Ra','Ac','Th','Pa','U','Np','Pu','Am','Cm','Bk','Cf','Es','Fm','Md','No','Lr']);
    const SUBSCRIPT: Record<string, string> = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉'};
    processedContent = processedContent.replace(
      /\b([A-Z][a-z]?)(\d+)/g,
      (match, element, number) => {
        if (!ELEMENTS.has(element)) return match;
        if (processedContent.includes(`$${match}$`) || processedContent.includes(`$${element}_{${number}}`)) {
          return match;
        }
        return element + number.split('').map(c => SUBSCRIPT[c] || c).join('');
      }
    );
    
    // Split content into parts: regular text and math expressions
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let key = 0;
    
    // Pattern for block math ($$...$$) - needs to handle multiline
    const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
    // Pattern for inline math ($...$) - avoid matching $$ or empty
    // eslint-disable-next-line no-useless-escape
    const inlineMathRegex = /(?<!\$)\$([^\$\n]+?)\$(?!\$)/g;
    
    // Collect all math matches
    const mathMatches: { start: number; end: number; math: string; isBlock: boolean }[] = [];
    
    // First, handle block math
    let match;
    while ((match = blockMathRegex.exec(processedContent)) !== null) {
      mathMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        math: match[1].trim(),
        isBlock: true,
      });
    }
    
    // Then handle inline math (excluding block math regions)
    while ((match = inlineMathRegex.exec(processedContent)) !== null) {
      const isInsideBlock = mathMatches.some(
        block => match!.index >= block.start && match!.index < block.end
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
    
    // Sort by start position
    mathMatches.sort((a, b) => a.start - b.start);
    
    // Build the parts array
    for (const mathMatch of mathMatches) {
      // Add text before this math expression
      if (mathMatch.start > currentIndex) {
        const textBefore = processedContent.slice(currentIndex, mathMatch.start);
        if (textBefore.trim()) {
          parts.push(
            <span key={key++} className="whitespace-pre-wrap">
              {renderTextWithFormatting(textBefore, key)}
            </span>
          );
          key += 20;
        }
      }
      
      // Add the math expression with error handling
      try {
        // Pre-process LaTeX for common issues
        const latex = mathMatch.math
          // Fix double backslashes that might cause issues
          .replace(/\\\\/g, '\\')
          // Ensure proper spacing around operators
          .replace(/\\times/g, ' \\times ')
          .replace(/\\div/g, ' \\div ')
          .trim();
        
        if (mathMatch.isBlock) {
          parts.push(
            <div key={key++} className="my-4 overflow-x-auto max-w-full py-2">
              <div className="inline-block min-w-full text-center">
                <BlockMath math={latex} />
              </div>
            </div>
          );
        } else {
          parts.push(
            <InlineMath key={key++} math={latex} />
          );
        }
      } catch (error) {
        // If KaTeX fails to render, show styled fallback
        console.warn('KaTeX render error:', error, 'for:', mathMatch.math);
        parts.push(
          <code 
            key={key++} 
            className="text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono text-sm"
          >
            {mathMatch.math}
          </code>
        );
      }
      
      currentIndex = mathMatch.end;
    }
    
    // Add remaining text
    if (currentIndex < processedContent.length) {
      const remainingText = processedContent.slice(currentIndex);
      if (remainingText.trim()) {
        parts.push(
          <span key={key++} className="whitespace-pre-wrap">
            {renderTextWithFormatting(remainingText, key)}
          </span>
        );
      }
    }
    
    return parts.length > 0 ? parts : content;
  }, [content]);

  return <div className={`math-content max-w-full min-w-0 break-words [overflow-wrap:anywhere] ${className}`}>{renderedContent}</div>;
};

// Helper function to render basic text formatting (bold, italic, lists, etc.)
function renderTextWithFormatting(text: string, startKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let key = startKey;
  
  // Split by newlines first to handle line breaks and lists properly
  const lines = text.split('\n');
  
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      parts.push(<br key={`br-${key++}`} />);
    }
    
    // Check for list items
    const bulletMatch = line.match(/^(\s*)([-•*]|\d+\.)\s+(.*)$/);
    if (bulletMatch) {
      const [, indent, bullet, content] = bulletMatch;
      parts.push(
        <span key={key++} className="flex items-start gap-2">
          <span className="text-primary shrink-0">{bullet}</span>
          <span>{formatInlineText(content, key)}</span>
        </span>
      );
      key += 10;
      return;
    }
    
    // Check for headers
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = headerMatch[2];
      const HeaderTag = `h${Math.min(level + 2, 6)}` as keyof JSX.IntrinsicElements;
      parts.push(
        <span key={key++} className={`font-bold ${level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm'}`}>
          {formatInlineText(content, key)}
        </span>
      );
      key += 10;
      return;
    }
    
    // Regular text with inline formatting
    parts.push(...formatInlineText(line, key));
    key += 10;
  });
  
  return parts;
}

// Format inline text (bold, italic, code, emoji)
function formatInlineText(text: string, startKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let key = startKey;
  
  // Handle bold (**text** or __text__), italic (*text* or _text_), and code (`text`)
  const formatRegex = /(\*\*|__)(.*?)\1|(\*|_)([^*_]+?)\3|`([^`]+)`/g;
  let lastIndex = 0;
  let match;
  
  while ((match = formatRegex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    if (match[1]) {
      // Bold
      parts.push(<strong key={key++} className="font-semibold text-foreground">{match[2]}</strong>);
    } else if (match[3]) {
      // Italic
      parts.push(<em key={key++} className="italic">{match[4]}</em>);
    } else if (match[5]) {
      // Code
      parts.push(
        <code 
          key={key++} 
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