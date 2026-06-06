#!/usr/bin/env python3
"""
Parse LlamaParse markdown output directly to extract questions.
Faster than Gemini and works when API keys are rate-limited.
Run after LlamaParse has cached markdowns in _llama_extracted/ dirs.
"""

import json
import re
import sys
from pathlib import Path

INPUT_DIR = Path(r"C:\Users\HP\Downloads\Physics and Math past questions year by year")
CHEM_DIR = INPUT_DIR / "chemistry  past question"
OUTPUT_DIR = Path(r"C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\extracted")


def guess_subject(filename: str) -> str:
    """Guess subject from filename or markdown content."""
    f = filename.lower()
    if "chem" in f: return "chemistry"
    if "phy" in f: return "physics"
    if "math" in f: return "math"
    if "bio" in f: return "biology"
    return "unknown"


def extract_year(text: str) -> int | None:
    m = re.search(r'(?:JUPEB|20\d{2})\s*(20[0-4]\d)', text)
    if m: return int(m.group(1))
    m = re.search(r'20([0-4]\d)\s+(?:JUPEB|QUESTION)', text)
    if m: return 2000 + int(m.group(1))
    return None


def parse_questions_from_markdown(text: str, subject_hint: str = "unknown") -> list[dict]:
    year = extract_year(text) or 0
    questions = []
    lines = text.split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        
        # Match question header: # 1. text or 1. text or #1) text
        qm = re.match(r'^#?\s*(\d+)[.)]\s+(.+)', line)
        if not qm:
            i += 1
            continue
        
        q_text = qm.group(2).strip()
        # Remove "QUESTION" or "OPTION" noise
        q_text = re.sub(r'^(?:QUESTION|QUESTIONS)\s*\d*\s*[):.]?\s*', '', q_text, flags=re.IGNORECASE).strip()
        
        # Scan next few lines for options
        options = []
        for j in range(i + 1, min(i + 8, len(lines))):
            opt_line = lines[j].strip()
            if not opt_line or opt_line.startswith('#') or re.match(r'^\d+[.)]', opt_line):
                break
            
            found = False
            
            # Table format: | A. text | B. text | C. text | D. text |
            if '|' in opt_line:
                cells = [c.strip() for c in opt_line.split('|') if c.strip()]
                for cell in cells:
                    m = re.match(r'\s*([A-D])[.)\s]\s*(.+?)\s*$', cell)
                    if m:
                        options.append({"label": m.group(1), "text": m.group(2).strip()})
                        found = True
                if found:
                    continue
            
            # Bullet format: - A. text or * A. text
            m = re.match(r'[-*•]\s*([A-D])[.)\s]\s*(.+)', opt_line)
            if m:
                options.append({"label": m.group(1), "text": m.group(2).strip()})
                found = True
                continue
            
            # Plain format: A. text or A) text
            m = re.match(r'([A-D])[.)]\s+(.+)', opt_line)
            if m:
                options.append({"label": m.group(1), "text": m.group(2).strip()})
                found = True
                continue
            
            if found:
                continue
            if options:
                break
        
        # Clean question text - remove leading labels
        q_text = re.sub(r'^(?:[A-D]\)\s*|\d+[.)]\s*)', '', q_text).strip()
        
        question = {
            "subject": subject_hint,
            "year": year,
            "category": "objective" if len(options) >= 2 else "theory",
            "topic": "",
            "question": q_text,
            "options": options[:4],
            "correctAnswer": None,
            "explanation": None,
            "_source": "markdown_parser",
        }
        
        # If we have unreasonably many options, something went wrong
        if len(options) > 6:
            question["options"] = []
            question["category"] = "theory"
        
        questions.append(question)
        i += 1
    
    return questions


def generate_typescript(questions: list[dict], subject: str) -> str:
    lines = [
        'import type { StudyQuestion } from "@/types/study-questions";',
        'import type { MCQOption } from "@/types/question";',
        "",
        f"const allQuestions: StudyQuestion[] = [",
    ]
    questions.sort(key=lambda q: (q.get("year") or 0, q.get("category", "")))
    
    cy, cc = None, None
    sc = {}
    for q in questions:
        year = q.get("year", 0) or 0
        cat = q.get("category", "objective")
        if year != cy:
            lines.append(f"\n  // {'=' * 25} {year} {'=' * 25}")
            cy, cc = year, None
        if cat != cc:
            lines.append(f"  // --- {cat.title()} ---")
            cc, sc[year] = cat, {cat: 0}
        sc.setdefault(year, {}).setdefault(cat, 0)
        sc[year][cat] += 1
        seq = sc[year][cat]
        
        obj = {
            "id": f"{subject}-{year}-{'obj' if cat == 'objective' else 'theory'}-{seq}",
            "subject": subject, "year": year, "category": cat,
            "topic": q.get("topic", ""), "question": q.get("question", ""),
            "difficulty": "medium",
        }
        if cat == "objective":
            opts = q.get("options", [])
            if opts and isinstance(opts, list):
                obj["options"] = opts
                obj["correctAnswer"] = q.get("correctAnswer", "") or ""
            obj["explanation"] = q.get("explanation") or ""
        else:
            obj["answerGuide"] = q.get("answerGuide") or q.get("explanation") or ""
            obj["totalMarks"] = q.get("totalMarks", 10)
        lines.append(format_object(obj, 4))
    
    lines.append("];\n")
    safe = subject.lower().replace(" ", "_")
    title = subject.title().replace("_", "")
    lines.append(f"export function get{title}Questions(year?: number): StudyQuestion[] {{")
    lines.append(f"  if (year) return allQuestions.filter(q => q.year === year);")
    lines.append(f"  return [...allQuestions];")
    lines.append("}\n")
    return "\n".join(lines)


def format_object(obj: dict, indent: int = 4) -> str:
    pad = " " * indent
    parts = ["{"]
    for key, val in obj.items():
        if val is None or val == "" or (isinstance(val, list) and not val):
            continue
        if key == "options":
            opts_str = []
            for o in val:
                label = json.dumps(o.get("label", ""), ensure_ascii=False)
                text = json.dumps(o.get("text", ""), ensure_ascii=False)
                opts_str.append(f'{{ label: {label}, text: {text} }}')
            parts.append(f'{pad}  options: [{", ".join(opts_str)}],')
        elif key in ("year", "totalMarks"):
            parts.append(f'{pad}  {key}: {val},')
        elif isinstance(val, str):
            escaped = val.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
            parts.append(f'{pad}  {key}: "{escaped}",')
        else:
            parts.append(f'{pad}  {key}: {json.dumps(val, ensure_ascii=False)},')
    parts.append(f"{pad}}},")
    return "\n".join(parts)


def process_markdowns(image_dir: Path, subject_hint: str = None):
    md_dir = image_dir / "_llama_extracted"
    if not md_dir.exists():
        print(f"  No _llama_extracted in {image_dir.name}", file=sys.stderr)
        return {}
    
    mds = sorted(md_dir.glob("*.md"))
    print(f"  {len(mds)} markdown files", file=sys.stderr)
    
    all_questions = []
    for md in mds:
        text = md.read_text("utf-8")
        subject = guess_subject(md.stem)
        if subject == "unknown" and subject_hint:
            subject = subject_hint
        qs = parse_questions_from_markdown(text, subject)
        if qs:
            all_questions.extend(qs)
    
    # Deduplicate by question text first 80 chars
    seen = set()
    unique = []
    for q in all_questions:
        key = q.get("question", "")[:80]
        if key and key not in seen:
            seen.add(key)
            unique.append(q)
    
    print(f"  Parsed: {len(unique)} unique questions from {len(mds)} files", file=sys.stderr)
    
    by_subject = {}
    for q in unique:
        subj = q.get("subject", "unknown")
        by_subject.setdefault(subj, []).append(q)
    
    return by_subject


if __name__ == "__main__":
    all_by_subject = {}
    
    print("Physics & Math markdowns...", file=sys.stderr)
    by_subject = process_markdowns(INPUT_DIR)
    for subj, qs in by_subject.items():
        all_by_subject.setdefault(subj, []).extend(qs)
    
    print("Chemistry markdowns...", file=sys.stderr)
    by_subject = process_markdowns(CHEM_DIR, "chemistry")
    for subj, qs in by_subject.items():
        all_by_subject.setdefault(subj, []).extend(qs)
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    total = 0
    for subject, questions in all_by_subject.items():
        if not questions:
            continue
        safe = subject.lower().replace(" ", "_")
        ts = generate_typescript(questions, safe)
        (OUTPUT_DIR / f"{safe}-from-markdown.ts").write_text(ts, encoding="utf-8")
        yrs = sorted(set(q.get("year") for q in questions if q.get("year"))) or ["?"]
        print(f"  {subject}: {len(questions)} q, years={yrs}", file=sys.stderr)
        total += len(questions)
    
    summary = {}
    for subj, qs in all_by_subject.items():
        yrs = sorted(set(q.get("year") for q in qs if q.get("year"))) or ["?"]
        summary[subj] = {"count": len(qs), "years": yrs}
    (OUTPUT_DIR / "_markdown_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    
    print(f"\nTotal: {total} questions saved to {OUTPUT_DIR}", file=sys.stderr)