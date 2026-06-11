#!/usr/bin/env python3
"""Extract JUPEB past questions from source text files and generate TypeScript data.

Usage:
    python3 extract_and_generate.py [--gemini] [--subject chemistry|physics|math]
"""

import re
import json
import sys
import os
from pathlib import Path
from collections import defaultdict

BASE_DIR = Path(__file__).resolve().parent
SRC_DATA = BASE_DIR / "src" / "data" / "study-questions"
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

SUBJECT_MAP = {
    "chemistry": {
        "source": r"C:\Users\HP\Downloads\Past questions main\chemistry 2014-2025.txt",
        "output": "chemistry.ts",
    },
    "physics": {
        "source": r"C:\Users\HP\Downloads\Past questions main\physics 2014-2023.txt",
        "output": "physics.ts",
    },
    "math": {
        "source": r"C:\Users\HP\Downloads\Past questions main\math.txt",
        "output": "math.ts",
    },
}


def read_source(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def clean_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text).strip()
    text = text.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
    return text


def normalize_block(text: str) -> str:
    """Normalize various question/option/answer formats."""
    # Normalize **N.** question numbers
    text = re.sub(r'\*\*(\d+)\.\*\*', r'__Q__\1', text)
    # Normalize plain N. question numbers
    text = re.sub(r'(?<!\d)(\d+)\.\s+(?=[A-Z])', r'__Q__\1 ', text)
    # Normalize **A.** **B.** **C.** **D.** options
    text = re.sub(r'\*\*([A-D])\.\*\*', r'__OPT__\1', text)
    # Normalize **Answer: X.** or **Answer: X. text**
    text = re.sub(r'\*\*Answer:?\s*([A-Da-d])[\.\)]?\s*(.*?)\*\*', r'__ANS__\1__ANSTEXT__\2__ENDANS__', text)
    return text


def extract_questions(text: str, subject: str) -> list[dict]:
    """Main extraction function for all subjects."""
    questions = []
    lines = normalize_block(text).split('\n')

    # State machine
    current_year = 0
    current_cat = "objective"
    q_num = None
    buffer = []
    years_seen = []

    for line in lines:
        # Track year
        ym = re.findall(r'(?:JUPEB|JUPEB)\s*(?:CHEMISTRY|PHYSICS|MATHEMATICS)?\s*(\d{4})', line, re.IGNORECASE)
        for y in ym:
            y_int = int(y)
            if 'PAGE' not in line.upper() and 'CONTINUED' not in line.upper():
                if y_int not in years_seen:
                    years_seen.append(y_int)
                current_year = y_int

        # Track category
        lower = line.upper()
        if 'ESSAY' in lower and 'ANSWERS' not in lower and 'MARKING' not in lower:
            current_cat = "theory"
        elif 'PRACTICAL' in lower and 'ANSWERS' not in lower and 'MARKING' not in lower:
            current_cat = "practical"
        elif ('MULTIPLE CHOICE' in lower or 'MCQ' in lower or 'OBJECTIVE' in lower) and 'ANSWERS' not in lower and 'MARKING' not in lower:
            current_cat = "objective"

        # Skip answer key sections, marking guides, tables
        if re.search(r'ANSWERS?\s+(TO|KEY|:)', line, re.IGNORECASE) and ('MULTIPLE' in lower or 'ESSAY' in lower or 'PRACTICAL' in lower):
            # This is an answer key header - don't treat as questions
            continue
        if re.search(r'MARKING GUIDE', line, re.IGNORECASE):
            continue
        if line.strip().startswith('|') and 'Test' in line:  # Skip tables
            continue

        # Detect question
        qm = re.match(r'^__Q__(\d+)\s', line)
        if qm:
            # Skip if we're in an answer key section (lines like "1. C 2. A 3. B")
            stripped = line.replace(f'__Q__{qm.group(1)}', '').strip()
            if re.match(r'^[A-D]\b', stripped) and len(stripped) < 5:
                # This is an answer key entry like "1. C"
                continue
            if re.match(r'^\d+\.\s*[A-D]', stripped):
                continue

            if buffer and q_num is not None:
                q = parse_block('\n'.join(buffer), q_num, current_year, current_cat, subject)
                if q:
                    questions.append(q)

            q_num = int(qm.group(1))
            buffer = [line.replace(f'__Q__{qm.group(1)}', f'**{qm.group(1)}.** ')]
        elif q_num is not None:
            # Skip answer key lines within question blocks  
            if re.match(r'^\d+[\.\)]?\s*[A-D][\.\)]?\s*$', line.strip()):
                continue
            if re.match(r'^\d+\s*[A-D]\s*$', line.strip()):
                continue
            # Skip table lines
            if line.strip().startswith('|'):
                continue
            buffer.append(line)

    # Last question
    if buffer and q_num is not None:
        q = parse_block('\n'.join(buffer), q_num, current_year, current_cat, subject)
        if q:
            questions.append(q)

    return questions


def split_options(text: str) -> list[dict]:
    """Split text with option markers into option dicts."""
    result = []

    # Handle __OPT__ format (was **X.**)
    parts = re.split(r'(__OPT__[A-D])', text)
    i = 1
    while i < len(parts):
        marker = parts[i].replace('__OPT__', '')
        opt_text = parts[i + 1] if i + 1 < len(parts) else ''
        # Check if this opt_text contains more options
        # Look for "B." style within text
        sub_parts = re.split(r'(?<![A-Z])([B-D])\.\s', opt_text)
        if len(sub_parts) > 1:
            # Has embedded options
            first_text = sub_parts[0]
            if first_text.strip() and len(first_text.strip()) > 1:
                result.append({"label": marker, "text": clean_text(first_text.strip())})
            j = 1
            while j < len(sub_parts):
                label = sub_parts[j]
                rest = sub_parts[j + 1] if j + 1 < len(sub_parts) else ''
                if rest.strip() and len(rest.strip()) > 1:
                    result.append({"label": label, "text": clean_text(rest.strip())})
                j += 2
        else:
            if opt_text.strip() and len(opt_text.strip()) > 1:
                # Remove embedded **B.** etc from the text
                cleaned = re.sub(r'\*\*([A-D])\.\*\*.*', '', opt_text).strip()
                if cleaned:
                    result.append({"label": marker, "text": clean_text(cleaned)})

    if not result:
        # Try splitting on "X. " pattern
        parts = re.split(r'(?=[A-D]\.\s)', text.strip())
        for part in parts:
            m = re.match(r'^([A-D])[\.\)]\s*(.*)', part.strip())
            if m:
                label = m.group(1).upper()
                opt_text = clean_text(m.group(2))
                if opt_text and len(opt_text) > 1 and 'ANSWER' not in opt_text.upper() and 'PAGE' not in opt_text.upper():
                    # Check for embedded options
                    # Remove anything like " [B]. " in the text
                    cleaned = re.sub(r'\s*[B-D]\.\s.*$', '', opt_text)
                    if cleaned.strip() and len(cleaned.strip()) > 1:
                        result.append({"label": label, "text": cleaned.strip()})

    return result


def parse_block(block: str, num: int, year: int, category: str, subject: str) -> dict | None:
    """Parse a question block into structured data."""
    if not block.strip():
        return None

    lines = block.strip().split('\n')
    correct_answer = None
    answer_explanation = ""
    options = []

    # Extract inline answer markers __ANS__X__ANSTEXT__...__ENDANS__
    ans_match = re.search(r'__ANS__([A-Da-d])\s*__ANSTEXT__\s*(.*?)__ENDANS__', block)
    if ans_match:
        correct_answer = ans_match.group(1).upper()
        answer_explanation = clean_text(ans_match.group(2))
    else:
        # Try simple **Answer: X.**
        simple_ans = re.search(r'\*\*Answer:?\s*([A-Da-d])[\.\)]?\s*\*{0,2}', block)
        if simple_ans:
            correct_answer = simple_ans.group(1).upper()
            # Also extract text after it
            after = block[simple_ans.end():]
            # Get text until next ** or end
            m2 = re.match(r'([^*]*?)(?:\*\*|\Z)', after)
            if m2:
                answer_explanation = clean_text(m2.group(1))

    # Extract explanation section
    expl_match = re.search(r'(?:Explanation|Explanations?)[:\s]*(.*?)(?=\n\n|\Z)', block, re.DOTALL | re.IGNORECASE)
    explanation = clean_text(expl_match.group(1)) if expl_match else ""

    # Extract options - look for __OPT__ markers
    opt_match = re.search(r'__OPT__[A-D].*?(?=\n\n|__ANS__|\Z)', block, re.DOTALL)
    if opt_match:
        opt_text = opt_match.group(0)
        options = split_options(opt_text)

    # If no __OPT__ found, look for standard "A. text B. text" patterns
    if not options:
        for line in lines:
            stripped = line.strip()
            if re.match(r'^[A-D]\.\s', stripped):
                opts = split_options(stripped)
                options.extend(opts)

    # Deduplicate
    seen = set()
    unique_opts = []
    for o in options:
        if o["label"] not in seen:
            seen.add(o["label"])
            unique_opts.append(o)
    options = unique_opts

    # If we still have bad options (single chars, answer codes), clear them
    if options and all(
        len(o["text"]) < 3 or re.match(r'^[A-D]\d{3}$', o["text"]) for o in options
    ):
        options = []

    # Extract question text - remove answer, option markers
    qtext = block
    # Remove __ANS__...__ENDANS__ blocks
    qtext = re.sub(r'__ANS__[A-Da-d]\s*__ANSTEXT__\s*.*?__ENDANS__', '', qtext, flags=re.DOTALL)
    qtext = re.sub(r'\*\*Answer:?\s*[A-Da-d][\.\)]?\s*[^*]*?\*\*', '', qtext, flags=re.DOTALL)
    # Remove __OPT__ markers
    qtext = re.sub(r'__OPT__[A-D]\s*', '', qtext)
    # Remove explanation
    qtext = re.sub(r'(?:Explanation|Explanations?)[:\s]*.*?(?=\n\n|\Z)', '', qtext, flags=re.DOTALL | re.IGNORECASE)
    # Remove option-containing lines
    cleaned_lines = []
    for line in qtext.split('\n'):
        s = line.strip()
        if re.match(r'^[A-D]\.\s', s):
            continue
        if re.match(r'^#+\s', s):
            continue
        if re.match(r'^\(?[a-z]\)?\.?\s*CHECK\s+JUPEB', s, re.IGNORECASE):
            continue
        if re.match(r'^PAGE\s+\d+', s, re.IGNORECASE):
            continue
        if re.match(r'\*\*Answer', s, re.IGNORECASE):
            continue
        if re.match(r'^---+\s*$', s):
            continue
        cleaned_lines.append(line)
    qtext = '\n'.join(cleaned_lines)
    qtext = clean_text(qtext)

    # Remove trailing CHECK JUPEB references
    qtext = re.sub(r'\([a-z]\)\.?\s*CHECK\s+JUPEB.*', '', qtext, flags=re.IGNORECASE)
    # Remove option-like trailing text from question
    qtext = re.sub(r'\s*[A-D]\.\s+.*$', '', qtext)
    qtext = qtext.strip()

    if not qtext or len(qtext) < 5:
        return None

    # Skip if question looks like an answer key entry
    if re.match(r'^\d+[\.\)]?\s*[A-D][\.\)]?\s*$', qtext):
        return None

    qid = f"{subject}-{year}-{category}-{num:03d}"

    return {
        "id": qid,
        "question": qtext,
        "subject": subject,
        "year": year,
        "category": category,
        "options": options,
        "correctAnswer": correct_answer or "TBD",
        "explanation": explanation or "",
        "answerGuide": answer_explanation or "",
        "difficulty": "medium",
        "tags": [subject],
    }


def generate_ts_file(questions: list[dict], subject: str) -> str:
    lines = []
    lines.append('import type { StudyQuestion } from "@/types/study-questions";')
    lines.append('')
    lines.append(f'// Auto-generated: {subject}')
    lines.append(f'// Total: {len(questions)} questions')
    lines.append('')

    lines.append(f'const allQuestions: StudyQuestion[] = [')
    for q in questions:
        lines.append('  {')
        lines.append(f'    id: "{q["id"]}",')
        lines.append(f'    question: `{q["question"]}`,')
        lines.append(f'    subject: "{q["subject"]}",')
        lines.append(f'    year: {q["year"]},')
        lines.append(f'    category: "{q["category"]}",')
        lines.append(f'    correctAnswer: "{q["correctAnswer"]}",')
        lines.append(f'    difficulty: "{q.get("difficulty", "medium")}",')
        if q.get("tags") and len(q["tags"]) > 0:
            tags_str = ", ".join(f'"{t}"' for t in q["tags"])
            lines.append(f'    tags: [{tags_str}],')
        if q.get("options") and len(q["options"]) > 0:
            lines.append(f'    options: [')
            for opt in q["options"]:
                ot = opt["text"].replace('`', '\\`').replace('${', '\\${')
                lines.append(f'      {{ label: "{opt["label"]}", text: `{ot}` }},')
            lines.append(f'    ],')
        if q.get("explanation"):
            e = q["explanation"].replace('`', '\\`').replace('${', '\\${')
            lines.append(f'    explanation: `{e}`,')
        if q.get("answerGuide"):
            g = q["answerGuide"].replace('`', '\\`').replace('${', '\\${')
            lines.append(f'    answerGuide: `{g}`,')
        lines.append('  },')
    lines.append('];')
    lines.append('')

    lines.append('export function getSubjectQuestions(year: number): {')
    lines.append('  objective: StudyQuestion[];')
    lines.append('  theory: StudyQuestion[];')
    lines.append('  practical: StudyQuestion[];')
    lines.append('} {')
    lines.append('  const yearQs = allQuestions.filter((q) => q.year === year);')
    lines.append('  return {')
    lines.append('    objective: yearQs.filter((q) => q.category === "objective"),')
    lines.append('    theory: yearQs.filter((q) => q.category === "theory"),')
    lines.append('    practical: yearQs.filter((q) => q.category === "practical"),')
    lines.append('  };')
    lines.append('}')

    return '\n'.join(lines)


def main():
    subject_filter = None
    use_gemini = False

    for arg in sys.argv[1:]:
        if arg.startswith("--subject="):
            subject_filter = arg.split("=", 1)[1]
        elif arg == "--gemini":
            use_gemini = True
        elif arg == "--help":
            print("Usage: python3 extract_and_generate.py [--subject=chemistry|physics|math] [--gemini]")
            return

    subjects = [subject_filter] if subject_filter else list(SUBJECT_MAP.keys())

    for subject in subjects:
        if subject not in SUBJECT_MAP:
            print(f"Unknown: {subject}")
            continue

        info = SUBJECT_MAP[subject]
        path = info["source"]
        print(f"\n=== {subject} ===")

        if not os.path.exists(path):
            print(f"File not found: {path}")
            continue

        text = read_source(path)
        questions = extract_questions(text, subject)
        print(f"Extracted: {len(questions)} questions")

        # Stats
        cats = defaultdict(int)
        opt_dist = defaultdict(int)
        ans_count = {"known": 0, "TBD": 0}
        for q in questions:
            cats[q["category"]] += 1
            n = len(q.get("options", []))
            opt_dist[str(n)] += 1
            if q["correctAnswer"] == "TBD":
                ans_count["TBD"] += 1
            else:
                ans_count["known"] += 1

        print(f"  Categories: {dict(cats)}")
        print(f"  Options: {dict(sorted(opt_dist.items()))}")
        print(f"  Answers: {ans_count}")

        # Save raw JSON
        json_path = OUTPUT_DIR / f"{subject}_raw.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
        print(f"  JSON: {json_path}")

        # Generate TS
        ts_content = generate_ts_file(questions, subject)
        ts_path = OUTPUT_DIR / info["output"]
        with open(ts_path, "w", encoding="utf-8") as f:
            f.write(ts_content)
        print(f"  TS: {ts_path}")


if __name__ == "__main__":
    main()
