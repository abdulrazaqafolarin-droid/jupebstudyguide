#!/usr/bin/env python3
"""Final merge: read from pickle cache, classify, output clean TS per subject."""
import json, re, pickle
from pathlib import Path

CACHE = Path(r"C:\Users\HP\Downloads\Physics and Math past questions year by year\_llama_cache\progress.pkl")
OUT = Path(r"C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\extracted")

PHYSICS_KW = [
    "velocity","mass","force","acceleration","speed","displacement",
    "energy","power","wavelength","frequency","electric","magnetic",
    "circuit","resistance","voltage","current","momentum","gravity",
    "friction","torque","oscillation","wave","refraction","diffraction",
    "interference","polarization","lens","mirror","optics","thermodynamics",
    "kinetic","potential","projectile","inclined","pulley","newton",
    "joule","watt","ampere","ohm","volt","nuclear","radioactive",
    "isotope","fission","fusion","kinematics","dynamics","density",
    "pressure","upthrust","boyle","charles","heat","temperature",
    "thermometer","specific heat","latent heat","conduction","convection",
    "radiation","refractive index","snell","focal","magnification",
    "pendulum","spring","capacitor","inductor","resistor","ammeter",
    "voltmeter","galvanometer","emf","transformer","generator","motor",
    "electromagnet","kgms","ms-2","m/s","hertz","coulomb",
]
MATH_KW = [
    "differentiate","derivative","integral","integration","gradient",
    "determinant","matrix","vector","logarithm","exponential","polynomial",
    "function","graph","ellipse","parabola","hyperbola","circle",
    "tangent","radius","centre","limit","summation","series","sequence",
    "probability","permutation","combination","binomial","set",
    "union","intersection","subset","complex","imaginary","modulus",
    "argument","trigonometric","sine","cosine","tangent","cosec",
    "secant","cotangent","coordinate","locus","midpoint","evaluate",
    "solve","calculus","statistics","mode","median","mean",
    "standard deviation","variance","correlation","regression",
    "partial fraction","quadratic","equation","inequality","arithmetic",
    "geometric","progression","sum","expansion","coefficient","angle",
    "triangle","diagram","axis","intercept","symmetry","domain","range",
    "inverse","conic","radius","diameter","chord","arc","sector",
    "segment","prism","pyramid","cone","sphere","cylinder",
    "factor","remainder","theorem","modulo","congruent",
    "log","ln","simplify","express",
]

def classify(text):
    t = text.lower()
    p = sum(1 for k in PHYSICS_KW if k in t)
    m = sum(1 for k in MATH_KW if k in t)
    if p >= 1 and m == 0: return "physics"
    if m >= 1 and p == 0: return "math"
    if p > m and p >= 2: return "physics"
    if m > p and m >= 2: return "math"
    if p == m and p >= 2: return "physics"
    return None

cache = pickle.load(open(CACHE, "rb"))

# Also load existing chemistry.ts if no chemistry in cache
chem_legacy_path = OUT / "chemistry.ts"
chem_legacy = []
if chem_legacy_path.exists():
    # Extract questions from existing chemistry.ts (they have inline format)
    text = chem_legacy_path.read_text("utf-8")
    # Quick regex to pull question dicts - handle nested braces
    depth = 0
    start = -1
    for i, ch in enumerate(text):
        if ch == '{':
            if depth == 0:
                start = i
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0 and start >= 0:
                block = text[start:i+1]
                # Extract fields
                def g(n):
                    m = re.search(n + r':\s*"((?:[^"\\]|\\.)*)"', block)
                    return m.group(1) if m else ""
                def gf(n):
                    m = re.search(n + r':\s*(\d+)', block)
                    return int(m.group(1)) if m else 0
                q = {
                    "subject": g("subject"),
                    "year": gf("year"),
                    "category": g("category"),
                    "question": g("question"),
                    "topic": g("topic"),
                }
                opts = re.findall(r'\{label:\s*"([^"]*)"[^}]*?text:\s*"((?:[^"\\]|\\.)*)"\}', block)
                if opts:
                    q["options"] = [{"label": l, "text": t} for l, t in opts]
                ca = re.search(r'correctAnswer:\s*"((?:[^"\\]|\\.)*)"', block)
                if ca: q["correctAnswer"] = ca.group(1)
                ex = re.search(r'explanation:\s*"((?:[^"\\]|\\.)*)"', block)
                if ex: q["explanation"] = ex.group(1)
                if q.get("question"):
                    chem_legacy.append(q)
                start = -1
    print(f"Loaded {len(chem_legacy)} legacy chemistry questions")

# Collect all questions from cache
all_qs = []
for k, v in cache.items():
    if k.endswith("_questions"):
        all_qs.extend(v)
all_qs.extend(chem_legacy)

# Deduplicate
seen = set()
unique = []
for q in all_qs:
    key = q.get("question", "")[:80].lower()
    if key and key not in seen:
        seen.add(key)
        unique.append(q)

print(f"Total unique: {len(unique)} (from {len(all_qs)} raw)")

# Classify unknowns
reclassed = 0
for q in unique:
    s = q.get("subject", "unknown") or "unknown"
    if s == "unknown":
        ns = classify(q.get("question", ""))
        if ns:
            q["subject"] = ns
            reclassed += 1

print(f"Reclassified: {reclassed}")

# Also add chemistry source hint
for q in unique:
    src = q.get("_source", "")
    if "chemistry" in src and q.get("subject") in ("unknown", "math"):
        q["subject"] = "chemistry"

# Regroup
by_subj = {}
for q in unique:
    s = q.get("subject") or "unknown"
    by_subj.setdefault(s, []).append(q)

for s, qs in sorted(by_subj.items()):
    print(f"  {s}: {len(qs)}")

# Generate TS files
def esc(s):
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")

for s, qs in by_subj.items():
    lines = [
        'import type { StudyQuestion } from "@/types/study-questions";',
        'import type { MCQOption } from "@/types/question";\n',
        f"const {s}_questions: StudyQuestion[] = [",
    ]
    qs.sort(key=lambda q: (q.get("subject", ""), q.get("year") or 0, q.get("category", "")))
    cy = None
    for i, q in enumerate(qs, 1):
        y = q.get("year") or 0
        if y != cy:
            lines.append("")
            lines.append(f"  // {'=' * 30} {y if y else 'UNKNOWN'} {'=' * 30}")
            cy = y
        cat = q.get("category", "objective")
        qid = f"{s}-{y}-{'obj' if cat == 'objective' else 'theory'}-{i}"
        q_text = esc(q.get("question", ""))
        topic_text = esc(q.get("topic", "")) if q.get("topic") else None
        lines.append("  {")
        lines.append(f'    id: "{qid}",')
        lines.append(f'    subject: "{s}",')
        lines.append(f'    year: {y},')
        lines.append(f'    category: "{cat}",')
        if topic_text:
            lines.append(f'    topic: "{topic_text}",')
        lines.append(f'    question: "{q_text}",')
        lines.append('    difficulty: "medium",')
        opts = q.get("options", [])
        if opts:
            os_list = []
            for o in opts:
                l = o.get("label", "")
                t = esc(o.get("text", ""))
                os_list.append(f'{{ label: "{l}", text: "{t}" }}')
            lines.append(f'    options: [{", ".join(os_list)}],')
        ca = q.get("correctAnswer")
        if ca:
            lines.append(f'    correctAnswer: "{esc(ca)}",')
        ex = q.get("explanation")
        if ex and ex.strip():
            lines.append(f'    explanation: "{esc(ex)}",')
        lines.append("  },")
    lines.append("];\n")
    safe = s.lower().replace(" ", "_")
    title = s.title().replace("_", "")
    lines.append(f"export function get{title}Questions(year?: number): StudyQuestion[] {{")
    lines.append(f"  if (year) return {s}_questions.filter(q => q.year === year);")
    lines.append(f"  return [...{s}_questions];")
    lines.append("}\n")
    (OUT / f"{safe}.ts").write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {safe}.ts ({len(qs)} questions)")

print("\nDone!")
