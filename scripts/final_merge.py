#!/usr/bin/env python3
"""Merge Gemini + markdown-parsed questions, classify unknowns, generate final TS."""

import json
import pickle
import re
import sys
from collections import Counter
from pathlib import Path

INPUT_DIR = Path(r"C:\Users\HP\Downloads\Physics and Math past questions year by year")
CHEM_DIR = INPUT_DIR / "chemistry  past question"
CACHE = INPUT_DIR / "_llama_cache" / "progress.pkl"
OUTPUT_DIR = Path(r"C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\extracted")

# ─── KEYWORD CLASSIFICATION ───────────────────────────────────────────────

PHYSICS_KW = set("""
velocity mass force acceleration speed displacement energy power work done
wavelength frequency electric magnetic circuit resistance voltage current
capacitor momentum gravity friction torque oscillation wave refraction
diffraction interference polarization lens mirror optics thermodynamics
kinetic potential elastic projectile inclined pulley newton joule watt
ampere ohm volt tesla farad henry photon electron nuclear radioactive
isotope fission fusion kinematics dynamics statics hydraulic density
pressure upthrust boyle charles ideal gas heat temperature thermometer
specific heat latent heat conduction convection radiation refractive index
snell focal magnification pendulum spring capacitor inductor resistor
ammeter voltmeter galvanometer emf transformer generator motor electromagnet
""".split())

MATH_KW = set("""
differentiate derivative integral integration gradient determinant matrix
vector logarithm exponential polynomial function graph ellipse parabola
hyperbola circle tangent normal radius centre limit summation series
sequence probability permutation combination binomial set union intersection
subset complex number imaginary modulus argument trigonometric sine cosine
tangent cosec secant cotangent coordinate locus midpoint evaluate solve
mathematical induction differential equation calculus statistics mode median
mean standard deviation variance correlation regression partial fraction
""".split())


def classify_subject(q_text: str, md_header: str = "") -> str | None:
    t = q_text.lower()
    h = md_header.lower()
    
    # Direct header hints
    if "chemistry" in h: return "chemistry"
    if "physics" in h: return "physics"
    if "mat" in h and ("calcul" in h or "stat" in h): return "math"
    
    # Keyword scoring
    phys = sum(1 for k in PHYSICS_KW if k in t)
    math = sum(1 for k in MATH_KW if k in t)
    
    if phys >= math and phys >= 2: return "physics"
    if math > phys and math >= 2: return "math"
    if phys >= 1 and math == 0: return "physics"
    if math >= 1 and phys == 0: return "math"
    return None


# ─── MARKDOWN PARSER ─────────────────────────────────────────────────────

def extract_year(text: str) -> int | None:
    m = re.search(r'(?:JUPEB|20\d{2}|^|\n)\s*(20[0-4]\d)', text)
    if m: return int(m.group(1))
    return None


def parse_questions_from_markdown(text: str) -> list[dict]:
    year = extract_year(text) or 0
    questions = []
    lines = text.split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
        
        qm = re.match(r'^#?\s*(\d+)[.)]\s+(.+)', line)
        if not qm:
            i += 1
            continue
        
        q_text = qm.group(2).strip()
        q_text = re.sub(r'^(?:QUESTION|QUESTIONS|SELECTED)\s*\d*\s*[):.]?\s*', '', q_text, flags=re.IGNORECASE).strip()
        
        options = []
        for j in range(i + 1, min(i + 8, len(lines))):
            opt_line = lines[j].strip()
            if not opt_line or opt_line.startswith('#') or re.match(r'^\d+[.)]', opt_line):
                break
            found = False
            
            # Table: | A. text | B. text | ...
            if '|' in opt_line:
                cells = [c.strip() for c in opt_line.split('|') if c.strip()]
                for cell in cells:
                    m = re.match(r'([A-D])[.)\s]\s*(.+)', cell)
                    if m and m.group(1) in 'ABCD':
                        options.append({"label": m.group(1), "text": m.group(2).strip()})
                        found = True
                if found:
                    continue
            
            # Bullet: - A. text or * A. text
            m = re.match(r'[-*]\s*([A-D])[.)\s]\s*(.+)', opt_line)
            if m and m.group(1) in 'ABCD':
                options.append({"label": m.group(1), "text": m.group(2).strip()})
                found = True
                continue
            
            # Plain: A. text
            m = re.match(r'([A-D])[.)]\s+(.+)', opt_line)
            if m and m.group(1) in 'ABCD':
                options.append({"label": m.group(1), "text": m.group(2).strip()})
                found = True
                continue
            
            if options:
                break
        
        if 2 <= len(options) <= 6:
            question = {
                "subject": "unknown", "year": year, "category": "objective",
                "topic": "", "question": q_text, "options": options[:4],
                "correctAnswer": None, "explanation": None, "_source": "markdown"
            }
            questions.append(question)
    
    return questions


def get_md_header(raw_text: str) -> str:
    for line in raw_text.split('\n'):
        s = line.strip()
        if s and not s.startswith('|') and not s.startswith('-'):
            return s
    return ""


# ─── GENERATE TYPESCRIPT ─────────────────────────────────────────────────

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
            "topic": q.get("topic", "") or q.get("_source", ""),
            "question": q.get("question", ""), "difficulty": "medium",
        }
        if cat == "objective":
            opts = q.get("options", [])
            if opts:
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
        if val is None or val == "" or (isinstance(val, list) and not val) or key == "_source":
            continue
        if key == "options":
            opts = []
            for o in val:
                label = json.dumps(o.get("label", ""), ensure_ascii=False)
                text = json.dumps(o.get("text", ""), ensure_ascii=False)
                opts.append(f'{{ label: {label}, text: {text} }}')
            parts.append(f'{pad}  options: [{", ".join(opts)}],')
        elif key in ("year", "totalMarks"):
            parts.append(f'{pad}  {key}: {val},')
        elif isinstance(val, str):
            escaped = val.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
            parts.append(f'{pad}  {key}: "{escaped}",')
        else:
            parts.append(f'{pad}  {key}: {json.dumps(val, ensure_ascii=False)},')
    parts.append(f"{pad}}},")
    return "\n".join(parts)


# ─── MAIN ─────────────────────────────────────────────────────────────────

def main():
    # 1. Load Gemini-extracted questions
    gemini_qs = []
    if CACHE.exists():
        cache = pickle.load(open(CACHE, "rb"))
        for k, v in cache.items():
            if k.endswith("_questions"):
                gemini_qs.extend(v)
    print(f"Gemini: {len(gemini_qs)} q", file=sys.stderr)
    
    # 2. Parse markdowns from both directories
    md_qs = []
    for d, hint in [(INPUT_DIR, None), (CHEM_DIR, "chemistry")]:
        md_dir = d / "_llama_extracted"
        if not md_dir.exists():
            continue
        for md in sorted(md_dir.glob("*.md")):
            raw = md.read_text("utf-8")
            header = get_md_header(raw)
            qs = parse_questions_from_markdown(raw)
            for q in qs:
                # Try to classify subject
                subj = classify_subject(q["question"], header)
                if subj:
                    q["subject"] = subj
                elif hint:
                    q["subject"] = hint
                q["_source"] = md.stem
                qs = qs  # keep reference
            md_qs.extend(qs)
    print(f"Markdown-parsed: {len(md_qs)} q", file=sys.stderr)
    
    # 3. Merge: Gemini takes priority (deduplicate by question text)
    gemini_texts = {q.get("question", "")[:100] for q in gemini_qs}
    merged = list(gemini_qs)
    added = 0
    for q in md_qs:
        key = q.get("question", "")[:100]
        if key and key not in gemini_texts:
            merged.append(q)
            added += 1
    print(f"Merged: {len(merged)} ({len(gemini_qs)} Gemini + {added} markdown)", file=sys.stderr)
    
    # 4. Group by subject and save
    by_subject = {}
    for q in merged:
        subj = q.get("subject", "unknown")
        by_subject.setdefault(subj, []).append(q)
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    total = 0
    summary = {}
    for subject, questions in sorted(by_subject.items()):
        if not questions or subject == "unknown":
            continue
        safe = subject.lower().replace(" ", "_")
        ts = generate_typescript(questions, safe)
        (OUTPUT_DIR / f"{safe}-final.ts").write_text(ts, encoding="utf-8")
        yrs = sorted(set(q.get("year") for q in questions if q.get("year"))) or ["?"]
        obj = sum(1 for q in questions if q.get("category") == "objective")
        thy = sum(1 for q in questions if q.get("category") == "theory")
        summary[subject] = {"count": len(questions), "objective": obj, "theory": thy, "years": yrs}
        print(f"  {subject}: {len(questions)} q ({obj} obj, {thy} thy) years={yrs}", file=sys.stderr)
        total += len(questions)
    
    (OUTPUT_DIR / "_final_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    
    # Also save unknown ones separately
    unknown = by_subject.get("unknown", [])
    if unknown:
        ts = generate_typescript(unknown, "unknown")
        (OUTPUT_DIR / "unknown-final.ts").write_text(ts, encoding="utf-8")
        print(f"  unknown: {len(unknown)} q (saved separately)", file=sys.stderr)
    
    print(f"\nTotal saved: {total} questions", file=sys.stderr)
    print(json.dumps(summary, indent=2), file=sys.stderr)


if __name__ == "__main__":
    main()
