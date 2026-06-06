#!/usr/bin/env python3
"""Generate final TypeScript files from cached Gemini-extracted questions."""
import json, pickle, re
from pathlib import Path

CACHE = Path(r"C:\Users\HP\Downloads\Physics and Math past questions year by year\_llama_cache\progress.pkl")
OUT = Path(r"C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\extracted")

cache = pickle.load(open(CACHE, "rb"))
all_qs = []
for k, v in cache.items():
    if k.endswith("_questions"):
        all_qs.extend(v)

print(f"Total in cache: {len(all_qs)}")

by_subj = {}
for q in all_qs:
    s = q.get("subject", "unknown")
    by_subj.setdefault(s, []).append(q)

for s, qs in by_subj.items():
    print(f"{s}: {len(qs)}")
    lines = [
        'import type { StudyQuestion } from "@/types/study-questions";',
        'import type { MCQOption } from "@/types/question";',
        "",
        f"const allQuestions: StudyQuestion[] = [",
    ]
    qs.sort(key=lambda q: (q.get("year") or 0, q.get("category", "")))
    
    cy, cc = None, None
    sc = {}
    for q in qs:
        y = q.get("year", 0) or 0
        c = q.get("category", "objective")
        if y != cy:
            lines.append("")
            lines.append(f"  // {'=' * 25} {y} {'=' * 25}")
            cy, cc = y, None
        if c != cc:
            lines.append(f"  // --- {c.title()} ---")
            cc = c
            sc[y] = {c: 0}
        sc.setdefault(y, {}).setdefault(c, 0)
        sc[y][c] += 1
        seq = sc[y][c]
        
        obj = {
            "id": f"{s}-{y}-{'obj' if c == 'objective' else 'theory'}-{seq}",
            "subject": s, "year": y, "category": c,
            "topic": q.get("topic", "") or q.get("_source", ""),
            "question": q.get("question", ""),
            "difficulty": "medium",
        }
        if c == "objective":
            opts = q.get("options", [])
            if opts:
                obj["options"] = opts
                obj["correctAnswer"] = q.get("correctAnswer", "") or ""
            obj["explanation"] = q.get("explanation") or ""
        else:
            obj["answerGuide"] = q.get("answerGuide") or q.get("explanation") or ""
            obj["totalMarks"] = q.get("totalMarks", 10)
        
        # Format as TS
        pad = "    "
        parts = ["{"]
        for k, v in obj.items():
            if v is None or v == "" or (isinstance(v, list) and not v):
                continue
            if k == "options":
                opts_str = []
                for o in v:
                    label = json.dumps(o.get("label",""), ensure_ascii=False)
                    text = json.dumps(o.get("text",""), ensure_ascii=False)
                    opts_str.append(f'{{ label: {label}, text: {text} }}')
                parts.append(f'{pad}  options: [{", ".join(opts_str)}],')
            elif k in ("year", "totalMarks"):
                parts.append(f"{pad}  {k}: {v},")
            elif isinstance(v, str):
                esc = v.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
                parts.append(f'{pad}  {k}: "{esc}",')
            else:
                parts.append(f'{pad}  {k}: {json.dumps(v, ensure_ascii=False)},')
        parts.append(f"{pad}}},")
        lines.append("\n".join(parts))
    
    lines.append("];\n")
    safe = s.lower().replace(" ", "_")
    title = s.title().replace("_", "")
    lines.append(f"export function get{title}Questions(year?: number): StudyQuestion[] {{")
    lines.append(f"  if (year) return allQuestions.filter(q => q.year === year);")
    lines.append(f"  return [...allQuestions];")
    lines.append("}\n")
    
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{safe}-extracted.ts").write_text("\n".join(lines), encoding="utf-8")
    print(f"  -> {safe}-extracted.ts")

print(f"\nFiles in {OUT}")
