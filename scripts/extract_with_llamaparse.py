#!/usr/bin/env python3
"""
Extract JUPEB past questions from image photos using LlamaParse + Gemini.
Step 1: LlamaParse converts images to markdown (excellent at LaTeX/math)
Step 2: Gemini parses markdown into structured JSON questions
Step 3: Generates TypeScript files matching the app's StudyQuestion format

Usage:
  python extract_with_llamaparse.py                          # Full run
  python extract_with_llamaparse.py --resume                  # Resume from cache
  python extract_with_llamaparse.py --gemini-only [--resume]  # Only do Gemini extraction from cached markdown
  python extract_with_llamaparse.py --save-only               # Regenerate TS files from cache only
  python extract_with_llamaparse.py --max N                   # Max N images per dir
"""

import base64
import io
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
import ssl
import pickle
from pathlib import Path

import requests
from PIL import Image

# ─── CONFIG ───────────────────────────────────────────────────────────────────

LLAMA_PARSE_KEY = "llx-ctDSnI63AD6lFeTVSIDzL2920vNXNh1JITVebI5zqPpqTjsS"

GEMINI_KEYS = [
    "AQ.Ab8RN6K8Vn_tUD6uLEb52S6xfKyz7r-ohpvn_ueaL3qem1402Q",
    "AQ.Ab8RN6JiTF8D7fgiQoeNskU21QrXe8v2oK96jUbpnbcrNqahMQ",
    "AQ.Ab8RN6IIKKkS03k5ocgwQeqJh1up0zWVmxRt1Jn1XXpTHNCIvQ",
    "AQ.Ab8RN6J3PH-1b7UWYQfD0KSbiZu0aRgEtAiqA1c6KDob6eGfKg",
]

GEMINI_MODEL = "gemini-flash-latest"
GEMINI_FALLBACK_MODELS = ["gemini-1.5-flash", "gemini-2.5-flash-lite", "gemini-flash-lite-latest", "gemini-2.5-flash"]
SLEEP_BETWEEN = 1.0
MAX_RETRIES = 6
RATE_LIMIT_WAIT = 65

INPUT_DIR = Path(r"C:\Users\HP\Downloads\Physics and Math past questions year by year")
CHEM_DIR = INPUT_DIR / "chemistry  past question"
OUTPUT_DIR = Path(r"C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\extracted")

ctx = ssl._create_unverified_context()
_key_idx = 0

# ─── LLAMAPARSE ────────────────────────────────────────────────────────────────

LLAMAPARSE_UPLOAD = "https://api.cloud.llamaindex.ai/api/v1/parsing/upload"
LLAMAPARSE_JOB = "https://api.cloud.llamaindex.ai/api/v1/parsing/job/{job_id}"
LLAMAPARSE_RESULT = "https://api.cloud.llamaindex.ai/api/v1/parsing/job/{job_id}/result/markdown"
LLAMA_HEADERS = {"Authorization": f"Bearer {LLAMA_PARSE_KEY}"}

def llamaparse_image(image_path: str) -> str | None:
    for upload_attempt in range(5):
        try:
            with open(image_path, "rb") as f:
                files = {"file": (Path(image_path).name, f, "image/jpeg")}
                resp = requests.post(LLAMAPARSE_UPLOAD, headers=LLAMA_HEADERS, files=files, timeout=180)
                if resp.status_code != 200:
                    if "DNS" in str(resp.text) or "resolve" in str(resp.text).lower() or upload_attempt < 4:
                        time.sleep(3)
                        continue
                    return None
                data = resp.json()
                job_id = data.get("id") or data.get("job_id")
                if not job_id:
                    return None
                break
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            if upload_attempt < 4:
                time.sleep(3)
                continue
            return None
        except Exception:
            return None

    for attempt in range(45):
        time.sleep(2)
        for poll_retry in range(3):
            try:
                resp = requests.get(LLAMAPARSE_JOB.format(job_id=job_id), headers=LLAMA_HEADERS, timeout=30)
                if resp.status_code != 200:
                    if poll_retry < 2:
                        time.sleep(3)
                        continue
                    break
                status = resp.json().get("status", "")
                if status == "SUCCESS":
                    for result_retry in range(3):
                        try:
                            result_resp = requests.get(LLAMAPARSE_RESULT.format(job_id=job_id), headers=LLAMA_HEADERS, timeout=30)
                            if result_resp.status_code == 200:
                                result_data = result_resp.json()
                                md = result_data.get("markdown", "") if isinstance(result_data, dict) else str(result_data)
                                if md.strip():
                                    return md
                            if result_retry < 2:
                                time.sleep(3)
                                continue
                        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
                            if result_retry < 2:
                                time.sleep(3)
                                continue
                    return None
                elif status in ("FAILED", "ERROR"):
                    return None
                break
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
                if poll_retry < 2:
                    time.sleep(3)
                    continue
                break
        else:
            continue
        break
    return None


# ─── GEMINI QUESTION EXTRACTION ────────────────────────────────────────────────

EXTRACT_PROMPT = """You are analyzing a JUPEB past question paper that has been OCR'd into markdown.
Extract ALL questions from the text.

For EACH question, return a JSON object with these fields:
- subject: "physics", "chemistry", "biology", or "math"
- year: the exam year (number, e.g. 2015)
- category: "objective" for MCQ, "theory" for essay
- topic: the topic area (be specific)
- question: the full question text (preserve all LaTeX math notation exactly with $...$)
- options: [{"label":"A","text":"Option text"}, ...] for MCQ, or [] for theory
- correctAnswer: the correct option letter for MCQ if discernible, or null
- explanation: brief explanation of the answer or null

Rules:
- Preserve ALL LaTeX math exactly as $...$ or $$...$$
- For theory questions without multiple choice, set options to []
- If you can determine the correct answer from the text, include it
- If options are labelled but no answer key is visible, set correctAnswer to null
- Keep the question text clean and well-formatted
- Return ONLY a valid JSON array. No other text."""

def call_gemini_extract(markdown_text: str) -> list[dict]:
    full_prompt = EXTRACT_PROMPT + "\n\nHere is the extracted text from the past question paper:\n\n" + markdown_text
    
    if not hasattr(call_gemini_extract, "exhausted"):
        call_gemini_extract.exhausted = {}  # combo_key -> retry_at (unix ts)
    if not hasattr(call_gemini_extract, "dead"):
        call_gemini_extract.dead = set()  # combos with exhausted daily quota
    
    models = [GEMINI_MODEL] + GEMINI_FALLBACK_MODELS
    import random
    combos = [(m, k) for m in models for k in GEMINI_KEYS]
    random.shuffle(combos)
    # 3 full rounds
    all_attempts = combos * 3
    
    for model, api_key in all_attempts:
        combo_key = f"{model}_{api_key}"
        now = time.time()
        
        if combo_key in call_gemini_extract.dead:
            continue
        if combo_key in call_gemini_extract.exhausted:
            if now < call_gemini_extract.exhausted[combo_key]:
                continue
            del call_gemini_extract.exhausted[combo_key]
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 65536}
        }
        try:
            resp = requests.post(url, headers={"Content-Type": "application/json", "X-goog-api-key": api_key}, json=payload, timeout=300)
            if resp.status_code == 200:
                data = resp.json()
                text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                result = extract_json_from_text(text)
                if result:
                    return result
            elif resp.status_code == 503:
                time.sleep(5)
                continue
            elif resp.status_code == 429:
                err_body = resp.text[:500]
                if "free_tier_requests" in err_body:
                    call_gemini_extract.dead.add(combo_key)
                    print(f"  (DEAD {model})", file=sys.stderr, end=" ")
                else:
                    retry_s = 60
                    m = re.search(r'retryDelay[\s\S]*?(\d+(?:\.\d+)?)s', err_body)
                    if m:
                        retry_s = float(m.group(1)) + 2
                    call_gemini_extract.exhausted[combo_key] = time.time() + retry_s
                    print(f"  (429 {model}/{retry_s:.0f}s)", file=sys.stderr, end=" ")
                time.sleep(1)
                continue
            elif resp.status_code == 404:
                call_gemini_extract.dead.add(combo_key)
                continue
        except Exception as e:
            print(f"  Error: {e}", file=sys.stderr, end=" ")
            time.sleep(3)
    return []


def extract_json_from_text(text: str) -> list[dict]:
    json_part = text.strip()
    if "```" in json_part:
        json_part = re.sub(r'^```(?:json)?\s*', '', json_part)
        json_part = re.sub(r'\s*```$', '', json_part)
    
    for marker in ["[", "{\""]:
        idx = json_part.find(marker)
        if idx >= 0:
            candidate = json_part[idx:]
            try:
                parsed = json.loads(candidate)
                return parsed if isinstance(parsed, list) else [parsed]
            except json.JSONDecodeError:
                pass
    
    questions = []
    lines = json_part.split("\n")
    in_json, depth, current = False, 0, []
    for line in lines:
        if "{" in line:
            in_json = True
        if in_json:
            current.append(line)
            depth += line.count("{") - line.count("}")
            if depth == 0 and current:
                try:
                    questions.append(json.loads("\n".join(current)))
                except json.JSONDecodeError:
                    pass
                current, in_json = [], False
    return questions


# ─── GENERATE TYPESCRIPT ──────────────────────────────────────────────────────

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
                obj["correctAnswer"] = q.get("correctAnswer", "")
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
            opts = [f'{{ label: {json.dumps(o.get("label",""), ensure_ascii=False)}, text: {json.dumps(o.get("text",""), ensure_ascii=False)} }}' for o in val]
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


def save_results(by_subject: dict):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for subject, questions in by_subject.items():
        if not questions:
            continue
        safe = subject.lower().replace(" ", "_")
        ts = generate_typescript(questions, safe)
        (OUTPUT_DIR / f"{safe}-extracted.ts").write_text(ts, encoding="utf-8")
        print(f"  Saved {subject}: {len(questions)} q", file=sys.stderr)


# ─── CACHE ──────────────────────────────────────────────────────────────────

CACHE_DIR = INPUT_DIR / "_llama_cache"
CACHE_FILE = CACHE_DIR / "progress.pkl"

def save_cache(all_q: list, processed: set, dir_name: str):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache = pickle.load(open(CACHE_FILE, "rb")) if CACHE_FILE.exists() else {}
    cache[f"{dir_name}_questions"] = all_q
    cache[f"{dir_name}_processed"] = processed
    pickle.dump(cache, open(CACHE_FILE, "wb"))

def load_cache(dir_name: str):
    if CACHE_FILE.exists():
        cache = pickle.load(open(CACHE_FILE, "rb"))
        return cache.get(f"{dir_name}_questions", []), cache.get(f"{dir_name}_processed", set())
    return [], set()


# ─── PROCESSING ──────────────────────────────────────────────────────────────

def process_images(image_dir: Path, subject_hint: str = None, max_images: int = None, resume: bool = False, gemini_only: bool = False, parse_only: bool = False):
    images = sorted([f for f in image_dir.iterdir() if f.suffix.lower() in ('.jpg', '.jpeg', '.png')])
    if max_images:
        images = images[:max_images]
    
    if resume:
        all_questions, processed = load_cache(image_dir.name)
        remaining = [img for img in images if img.name not in processed]
        print(f"Resume: {len(processed)} done, {len(remaining)} remaining", file=sys.stderr)
    else:
        all_questions, processed, remaining = [], set(), images
    
    if gemini_only:
        md_dir = image_dir / "_llama_extracted"
        if md_dir.exists():
            md_stems = set(f.stem for f in md_dir.glob("*.md"))
            # Find images with cached markdowns that haven't contributed questions yet
            already_done = set()
            for q in all_questions:
                src = q.get("_source", "")
                if src:
                    already_done.add(Path(src).stem)
            new_stems = md_stems - already_done
            if new_stems:
                remaining = [img for img in images if img.stem in new_stems]
                print(f"Gemini-only: {len(md_stems)} markdowns, {len(already_done)} done, {len(remaining)} to process", file=sys.stderr)
            else:
                print(f"Gemini-only: {len(md_stems)} markdowns, all done.", file=sys.stderr)
                return {}
    
    print(f"Processing {len(remaining)} images from {image_dir.name}", file=sys.stderr)
    errors = 0
    
    for i, img_path in enumerate(remaining):
        print(f"\n[{i+1}/{len(remaining)}] {img_path.name}", file=sys.stderr, end=" ")
        sys.stderr.flush()
        
        if gemini_only:
            md_path = image_dir / "_llama_extracted" / f"{img_path.stem}.md"
            if md_path.exists():
                markdown = md_path.read_text(encoding="utf-8")
                print(f"(cached markdown {len(markdown)}c)", file=sys.stderr, end=" ")
            else:
                print("  (no cached markdown, skip)", file=sys.stderr)
                processed.add(img_path.name)
                continue
        else:
            markdown = llamaparse_image(str(img_path))
            if not markdown:
                print("FAILED", file=sys.stderr)
                errors += 1
                processed.add(img_path.name)
                save_cache(all_questions, processed, image_dir.name)
                continue
            md_dir = image_dir / "_llama_extracted"
            md_dir.mkdir(exist_ok=True)
            (md_dir / f"{img_path.stem}.md").write_text(markdown, encoding="utf-8")
            print(f"({len(markdown)}c)", file=sys.stderr, end=" ")
        
        sys.stderr.flush()
        
        if parse_only:
            print("→ (parse only, saved markdown)", file=sys.stderr)
            processed.add(img_path.name)
            save_cache(all_questions, processed, image_dir.name)
            continue
        
        questions = call_gemini_extract(markdown)
        if questions:
            for q in questions:
                q["_source"] = img_path.name
            all_questions.extend(questions)
            print(f"→ {len(questions)} q", file=sys.stderr)
        else:
            print(f"→ 0 q", file=sys.stderr)
            errors += 1
        
        processed.add(img_path.name)
        save_cache(all_questions, processed, image_dir.name)
        time.sleep(SLEEP_BETWEEN)
    
    # Deduplicate
    seen = set()
    unique = []
    for q in all_questions:
        key = q.get("question", "")[:100]
        if key and key not in seen:
            seen.add(key)
            unique.append(q)
    
    print(f"\nRaw: {len(all_questions)}, Unique: {len(unique)}, Errors: {errors}", file=sys.stderr)
    
    by_subject = {}
    for q in unique:
        subj = q.get("subject", subject_hint or "unknown")
        by_subject.setdefault(subj, []).append(q)
    
    for subj, qs in by_subject.items():
        yrs = sorted(set(q.get("year") for q in qs if q.get("year"))) or ["?"]
        obj = sum(1 for q in qs if q.get("category") == "objective")
        thy = sum(1 for q in qs if q.get("category") == "theory")
        print(f"  {subj}: {len(qs)} q ({obj} obj, {thy} theory) years={yrs}", file=sys.stderr)
    
    return by_subject


# ─── MAIN ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--max", "-m", type=int, default=None)
    parser.add_argument("--resume", "-r", action="store_true")
    parser.add_argument("--gemini-only", action="store_true")
    parser.add_argument("--save-only", action="store_true")
    parser.add_argument("--parse-only", "-p", action="store_true")
    parser.add_argument("--retry-failed", action="store_true",
        help="Remove images from processed set if they lack cached markdown, so they get retried")
    parser.add_argument("--chemistry-only", action="store_true",
        help="Only process chemistry images, skip physics/math")
    args = parser.parse_args()
    
    if args.retry_failed:
        cache = pickle.load(open(CACHE_FILE, "rb")) if CACHE_FILE.exists() else {}
        total_removed, total_removed_q = 0, 0
        for dir_name in [INPUT_DIR.name, CHEM_DIR.name]:
            subdir = INPUT_DIR if dir_name == INPUT_DIR.name else CHEM_DIR
            md_dir = subdir / "_llama_extracted"
            md_stems = set(f.stem for f in md_dir.glob("*.md")) if md_dir.exists() else set()
            processed_key = f"{dir_name}_processed"
            questions_key = f"{dir_name}_questions"
            processed = cache.get(processed_key, set())
            questions = cache.get(questions_key, [])
            before_p = len(processed)
            before_q = len(questions)
            cache[processed_key] = {p for p in processed if Path(p).stem in md_stems}
            cache[questions_key] = [q for q in questions if Path(q.get("_source", q.get("_source", ""))).stem in md_stems]
            removed = before_p - len(cache[processed_key])
            removed_q = before_q - len(cache[questions_key])
            total_removed += removed
            total_removed_q += removed_q
            if removed or removed_q:
                print(f"{dir_name}: removed {removed} failed images, {removed_q} orphan questions", file=sys.stderr)
        if total_removed or total_removed_q:
            pickle.dump(cache, open(CACHE_FILE, "wb"))
        print(f"Cleaned {total_removed} failed images, {total_removed_q} orphan questions.", file=sys.stderr)
        sys.exit(0)
    
    if args.save_only:
        print("Regenerating TypeScript from cache...", file=sys.stderr)
        all_by_subject = {}
        for dir_name in [INPUT_DIR.name, CHEM_DIR.name]:
            qs, _ = load_cache(dir_name)
            for q in qs:
                subj = q.get("subject", "unknown")
                all_by_subject.setdefault(subj, []).append(q)
        save_results(all_by_subject)
        print(f"Done. Files in {OUTPUT_DIR}", file=sys.stderr)
        sys.exit(0)
    
    all_by_subject = {}
    
    if not args.chemistry_only:
        print("=" * 50, file=sys.stderr)
        print("PHYSICS & MATH", file=sys.stderr)
        print("=" * 50, file=sys.stderr)
        by_subject = process_images(INPUT_DIR, max_images=args.max, resume=args.resume, gemini_only=args.gemini_only, parse_only=args.parse_only)
        for subj, qs in by_subject.items():
            all_by_subject.setdefault(subj, []).extend(qs)
    
    print("\n" + "=" * 50, file=sys.stderr)
    print("CHEMISTRY", file=sys.stderr)
    print("=" * 50, file=sys.stderr)
    by_subject = process_images(CHEM_DIR, subject_hint="chemistry", max_images=args.max, resume=args.resume, gemini_only=args.gemini_only, parse_only=args.parse_only)
    for subj, qs in by_subject.items():
        all_by_subject.setdefault(subj, []).extend(qs)
    
    if not args.parse_only:
        print("\n" + "=" * 50, file=sys.stderr)
        print("SAVING RESULTS", file=sys.stderr)
        save_results(all_by_subject)
        
        summary = {}
        for subj, qs in all_by_subject.items():
            yrs = sorted(set(q.get("year") for q in qs if q.get("year"))) or ["?"]
            summary[subj] = {"count": len(qs), "years": yrs}
        (OUTPUT_DIR / "_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
        print(json.dumps(summary, indent=2), file=sys.stderr)
    
    print(f"\nDone! Results in {OUTPUT_DIR}", file=sys.stderr)