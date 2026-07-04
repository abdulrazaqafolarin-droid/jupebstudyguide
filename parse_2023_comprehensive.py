"""Comprehensive 2023 math pre-processor: wrap all math in $...$ with proper LaTeX."""
import re, json, subprocess

with open(r'C:\Users\HP\Downloads\2023 math new.txt', encoding='utf-8') as f:
    text = f.read()

# Strip intro/footer from source
text = re.sub(r'^Got it.*?\n---\n', '', text, flags=re.DOTALL)
text = re.sub(r'\n---\n\*\*Flag:.*', '', text, flags=re.DOTALL)

# Parse into blocks
blocks = re.split(r'\*\*(\d+)\.\*\*\s+', text)
seen = {}
for i in range(1, len(blocks)-1, 2):
    seen[int(blocks[i])] = blocks[i+1]

# Unicode to LaTeX mapping
UNICODE_MAP = {
    '\u00B2': '^{2}',
    '\u00B3': '^{3}',
    '\u00B9': '^{1}',
    '\u2070': '^{0}',
    '\u2074': '^{4}',
    '\u2075': '^{5}',
    '\u2076': '^{6}',
    '\u2077': '^{7}',
    '\u2078': '^{8}',
    '\u2079': '^{9}',
    '\u207B': '^{-}',
    '\u2080': '_{0}',
    '\u2081': '_{1}',
    '\u2082': '_{2}',
    '\u2083': '_{3}',
    '\u2084': '_{4}',
    '\u2085': '_{5}',
    '\u2086': '_{6}',
    '\u2087': '_{7}',
    '\u2088': '_{8}',
    '\u2089': '_{9}',
    '\u00BD': '\\frac{1}{2}',
    '\u00BE': '\\frac{3}{4}',
    '\u2153': '\\frac{1}{3}',
    '\u2154': '\\frac{2}{3}',
    '\u00BC': '\\frac{1}{4}',
    '\u215B': '\\frac{1}{8}',
    '\u215C': '\\frac{3}{8}',
    '\u215D': '\\frac{5}{8}',
    '\u215E': '\\frac{7}{8}',
    '\u2229': '\\cap',
    '\u222A': '\\cup',
    '\u2208': '\\in',
    '\u2209': '\\notin',
    '\u2282': '\\subset',
    '\u2283': '\\supset',
    '\u2286': '\\subseteq',
    '\u2287': '\\supseteq',
    '\u2264': '\\leq',
    '\u2265': '\\geq',
    '\u2260': '\\neq',
    '\u2248': '\\approx',
    '\u221E': '\\infty',
    '\u221A': '\\sqrt{}',
    '\u222B': '\\int',
    '\u2211': '\\sum',
    '\u220F': '\\prod',
    '\u03C0': '\\pi',
    '\u03B8': '\\theta',
    '\u03B1': '\\alpha',
    '\u03B2': '\\beta',
    '\u03B3': '\\gamma',
    '\u03B4': '\\delta',
    '\u03B5': '\\varepsilon',
    '\u03BB': '\\lambda',
    '\u03BC': '\\mu',
    '\u03C3': '\\sigma',
    '\u03C6': '\\varphi',
    '\u03C9': '\\omega',
    '\u0394': '\\Delta',
    '\u03A3': '\\Sigma',
    '\u0398': '\\Theta',
    '\u03A0': '\\Pi',
    '\u03A9': '\\Omega',
    '\u00B1': '\\pm',
    '\u00D7': '\\times',
    '\u00F7': '\\div',
    '\u2192': '\\to',
    '\u2190': '\\leftarrow',
    '\u21D2': '\\Rightarrow',
    '\u21D0': '\\Leftarrow',
}

# Build regex for finding Unicode math chars
UNICODE_PATTERN = '|'.join(re.escape(c) for c in UNICODE_MAP)

MATH_FUNCTIONS = {'sin','cos','tan','log','ln','sec','csc','cot','lim','exp','det','mod','sinh','cosh','tanh','arcsin','arccos','arctan'}

def is_pure_math(text):
    """Check if text is purely mathematical (no English words)"""
    t = text.strip().strip('.,;:!? ')
    if not t:
        return False
    if re.match(r'^-?[\d.,\s/]+$', t):
        return True
    words = re.findall(r'[a-zA-Z]{2,}', t)
    for w in words:
        if w.lower() not in MATH_FUNCTIONS:
            return False
    # Has digits or math operators
    if not re.search(r'[\d\u00B2\u00B3\u00B9\u2229\u222A+=<>]', t):
        return False
    return len(t) >= 2

def convert_unicode_to_latex(text):
    """Convert Unicode math characters to LaTeX commands"""
    def repl(m):
        ch = m.group(0)
        return UNICODE_MAP.get(ch, ch)
    return re.sub(UNICODE_PATTERN, repl, text)

def wrap_math_expression(text):
    """Wrap a math expression in $...$ after converting Unicode to LaTeX.
    If text starts/ends with a non-math wrapper (like { }), include it outside $."""
    # Check if wrapped in braces like {x: ...}
    m = re.match(r'^(\{.*?\}:?\s*)(.*)$', text)
    if m:
        prefix = m.group(1)
        core = m.group(2)
        if core:
            latex = convert_unicode_to_latex(core)
            return prefix + '$' + latex + '$'
    # Normal wrap
    latex = convert_unicode_to_latex(text)
    return '$' + latex + '$'

def find_math_spans_in_question(text):
    """Find math sub-expressions within mixed English+math text.
    Returns list of (start, end, latex_wrapped) tuples in REVERSE order
    so we can replace from right to left without offset issues."""
    spans = []
    
    # Pattern 1: Set builder notation {x: ...} or {x|...} 
    for m in re.finditer(r'\{([xya-zA-Z])\s*[:|]\s*([^}]+)\}', text):
        inner = m.group(2)
        # Check if inner is math-like (contains digits, operators, or Unicode math)
        if re.search(r'[\d<>=+\u00B2\u00B3\u2229\u222A]', inner):
            variable = m.group(1)
            latex_inner = convert_unicode_to_latex(inner)
            latex = f'$\\{{{variable}: {latex_inner}\\}}$'
            spans.append((m.start(), m.end(), latex))
    
    # Pattern 2: Function expressions like f(x) = x² - 7x, n(P∪Q) + n(P∩Q)
    # Match: letter(s) + parens containing math, followed by = or + or -
    # Also match standalone math expressions with = or <>
    for m in re.finditer(
        r'((?:[a-zA-Z]\([^)]*\)\s*[+\-*/=])?\s*[a-zA-Z\d\u00B2\u00B3][a-zA-Z\d\u00B2\u00B3\u00B9\u2229\u222A+\-*/=<>()\s]*[=<>≤≥][a-zA-Z\d\u00B2\u00B3\u00B9\u2229\u222A+\-*/<>\s()]+)',
        text
    ):
        expr = m.group(1).strip()
        if len(expr) < 3:
            continue
        # Must contain a variable letter
        if not re.search(r'[a-zA-Z]', expr):
            continue
        # Must contain a comparison or operator
        if not re.search(r'[=<>+\-*/]', expr):
            continue
        # Skip if contains prose words
        if re.search(r'\b(and|the|for|that|this|with|which|what|determine|evaluate|find|given|solve|hence|note|where|when|using)\b', expr, re.I):
            continue
        # Ensure no overlap with set notation spans
        if any(s <= m.start() < e for s, e, _ in spans):
            continue
        latex = convert_unicode_to_latex(expr)
        spans.append((m.start(), m.end(), f'${latex}$'))
    
    # Pattern 3: Individual math expressions with operations
    # Like "n(P ∩ Q) + n(P ∪ Q)", "log2(x – 1) = log2(x²–2) – 1"
    for m in re.finditer(
        r'[a-zA-Z]\([^)]*\)\s*(?:[+\-*/]\s*[a-zA-Z]\([^)]*\))+',
        text
    ):
        expr = m.group(0).strip()
        if any(s <= m.start() < e for s, e, _ in spans):
            continue
        latex = convert_unicode_to_latex(expr)
        spans.append((m.start(), m.end(), f'${latex}$'))
    
    # Pattern 4: Variable with Unicode superscript (standalone)
    for m in re.finditer(r'(?:^|[\s(,;:=+\-])(\d*[a-zA-Z])([\u00B2\u00B3\u00B9])', text):
        full_start = m.start()
        if m.group(1):
            full_start = m.start() + m.group(0).index(m.group(1))
        expr = m.group(1) + m.group(2)
        if any(s <= full_start < e for s, e, _ in spans):
            continue
        digit = {'²': '2', '³': '3', '¹': '1'}.get(m.group(2), '')
        spans.append((full_start, full_start + len(expr), f'${m.group(1)}^{{{digit}}}$'))
    
    # Sort by position, replace from right to left
    spans.sort(key=lambda x: x[0], reverse=True)
    return spans

def process_text(text, is_option=False):
    """Process a text string: detect math, convert Unicode, wrap in $...$"""
    text = text.strip()
    if not text:
        return text
    
    # Clean up known issues
    text = re.sub(r'\s+\*?\(Note:.*', '', text)
    text = re.sub(r'\s*---.*', '', text)
    text = text.rstrip('*').strip()
    
    # If pure math, wrap the entire text
    if is_pure_math(text):
        return wrap_math_expression(text)
    
    # If it's an option with mixed content, try to detect math sub-expressions
    if is_option:
        spans = find_math_spans_in_question(text)
        result = text
        for start, end, replacement in spans:
            result = result[:start] + replacement + result[end:]
        # If no spans found but text has math-like content, still try to wrap
        if not spans and re.search(r'[\u00B2\u00B3\u00B9\u2229\u222A]', text):
            latex = convert_unicode_to_latex(text)
            result = f'${latex}$'
        return result
    
    return text

# Parse and process
questions = []
for num in sorted(seen.keys()):
    content = seen[num].strip()
    lines = content.split('\n')
    
    # Find option start
    opt_start = None
    for idx, line in enumerate(lines):
        if re.search(r'(?:^|\s)\*{0,2}[A-D]\.\s', line):
            opt_start = idx
            break
    
    if opt_start is None:
        questions.append({'id': f'mat-2023-mq-{num:04d}', 'number': num,
            'question': content[:100], 'options': [], 'correct_answer': 'A', 'explanation': ''})
        continue
    
    q_text = ' '.join(lines[:opt_start]).strip()
    q_text = re.sub(r'\s+', ' ', q_text)
    
    opt_line = ' '.join(lines[opt_start:])
    
    # Parse options
    options = {}
    correct_label = None
    cm = re.search(r'\*\*([A-D])\s*[.✓]\s*(.*?)\s*✓\s*\*\*', opt_line)
    if cm:
        correct_label = cm.group(1)
        txt = cm.group(2).strip().rstrip('*').strip()
        if txt:
            options[cm.group(1)] = txt
    
    opt_matches = list(re.finditer(r'(?:\*{0,2})([A-D])\.\s+', opt_line))
    for idx, m in enumerate(opt_matches):
        label = m.group(1)
        start_pos = m.end()
        end_pos = opt_matches[idx+1].start() if idx + 1 < len(opt_matches) else len(opt_line)
        txt = opt_line[start_pos:end_pos].strip().rstrip('*').strip()
        if label not in options:
            options[label] = txt
    
    # Process question text: find math spans and replace
    q_processed = q_text
    spans = find_math_spans_in_question(q_text)
    for start, end, replacement in spans:
        q_processed = q_processed[:start] + replacement + q_processed[end:]
    
    # Also try to wrap any remaining Unicode superscripts/symbols in question
    # that weren't caught by the spans
    # Actually, the MathRenderer will handle those at render time
    # So just process the spans
    
    ordered = []
    for label in ['A', 'B', 'C', 'D']:
        if label in options:
            opt_text = options[label]
            opt_processed = process_text(opt_text, is_option=True)
            ordered.append({'label': label, 'text': opt_processed})
    
    questions.append({
        'id': f'mat-2023-mq-{num:04d}',
        'number': num,
        'question': q_processed,
        'options': ordered,
        'correct_answer': correct_label or 'A',
        'explanation': ''
    })

questions.sort(key=lambda x: x['number'])

# Save
with open('2023_math_comprehensive.json', 'w', encoding='utf-8') as f:
    json.dump(questions, f, indent=2, ensure_ascii=False)

# Stats
total_opts = sum(len(q['options']) for q in questions)
wrapped = sum(1 for q in questions for o in q['options'] if o['text'].startswith('$') and o['text'].endswith('$'))
q_wrapped = sum(1 for q in questions if '$' in q['question'])

# Print samples
print(f'Questions with $: {q_wrapped}/{len(questions)}')
print(f'Options wrapped: {wrapped}/{total_opts}')
print()
for q in questions[:5]:
    print(f"Q{q['number']}: {q['question'][:120]}")
    for o in q['options']:
        print(f"  {o['label']}: {o['text'][:80]}")
    print()
