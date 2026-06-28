import React from 'react';
import 'katex/dist/katex.min.css';
import 'katex/contrib/mhchem';
import { InlineMath, BlockMath } from 'react-katex';

interface PreviewMathProps {
  content: string;
  className?: string;
}

export function PreviewMath({ content, className = '' }: PreviewMathProps) {
  if (!content) return null;

  const parts: React.ReactNode[] = [];
  const regex = /(?<!\$)\$(?!\$)((?:\\.|[^$\\])*)\$(?!\$)|\$\$((?:\\.|[^$\\])*)\$\$/g;
  let lastIdx = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(content)) !== null) {
    const before = content.slice(lastIdx, match.index);
    if (before) parts.push(<span key={key++}>{before}</span>);

    if (match[0].startsWith('$$')) {
      parts.push(<BlockMath key={key++}>{match[2]}</BlockMath>);
    } else {
      parts.push(<InlineMath key={key++}>{match[1]}</InlineMath>);
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < content.length) {
    parts.push(<span key={key++}>{content.slice(lastIdx)}</span>);
  }

  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      {parts.length > 0 ? parts : <span className="text-muted-foreground/50 italic">(empty)</span>}
    </div>
  );
}
