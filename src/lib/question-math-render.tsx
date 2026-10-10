import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { normalizeMath, MATH_TOKEN_RE, indexDecode, type MathEntry } from './question-math';

export interface KeyRef { key: number }

function mathNode(entry: MathEntry, keyRef: KeyRef): React.ReactNode {
  const latex = normalizeMath(entry.latex);
  if (!latex) return null;
  if (entry.isBlock) {
    return (
      <React.Fragment key={keyRef.key++}>
        <div className="my-4 overflow-x-auto max-w-full py-2">
          <div className="inline-block min-w-full text-center">
            <BlockMath math={latex} errorColor="#f87171" />
          </div>
        </div>
      </React.Fragment>
    );
  }
  return (
    <React.Fragment key={keyRef.key++}>
      <InlineMath math={latex} errorColor="#f87171" />
    </React.Fragment>
  );
}

/** Replace placeholder tokens with KaTeX nodes, recursively. */
export function substituteMath(node: React.ReactNode, maths: MathEntry[], keyRef: KeyRef, out: React.ReactNode[]): void {
  if (typeof node === "string") {
    MATH_TOKEN_RE.lastIndex = 0;
    let last = 0;
    let m: RegExpExecArray | null;
    let pushed = false;
    while ((m = MATH_TOKEN_RE.exec(node)) !== null) {
      if (m.index > last) { out.push(node.slice(last, m.index)); pushed = true; }
      const entry = maths[indexDecode(m[1])];
      if (entry) {
        const rendered = mathNode(entry, keyRef);
        if (rendered) { out.push(rendered); pushed = true; }
      }
      last = m.index + m[0].length;
    }
    if (!pushed) out.push(node);
    else if (last < node.length) out.push(node.slice(last));
    return;
  }
  if (React.isValidElement(node)) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    const kids = React.Children.toArray(el.props.children);
    if (kids.length === 0) { out.push(node); return; }
    const replaced: React.ReactNode[] = [];
    for (const k of kids) substituteMath(k, maths, keyRef, replaced);
    out.push(React.cloneElement(el, { key: keyRef.key++ }, replaced));
    return;
  }
  out.push(node);
}

