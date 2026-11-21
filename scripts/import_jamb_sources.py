#!/usr/bin/env python3
"""Build a conservative, review-only JAMB JSON staging pack from committed source text.

This script never invents answers, repairs OCR silently, or publishes questions.
Generated output is intentionally written beneath private-question-sources/generated-json
(which is gitignored) for the admin staging workflow.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "physics": ROOT / "Physics.txt",
    "chemistry": ROOT / "Chemistry.txt",
    "biology": ROOT / "Biology.txt",
}
REFERENCE_RE = re.compile(
    r"[\(\[]?\s*((?:19|20)\d{2})\s*:\s*Q\s*(\??\d+)?\s*[\)\]]?",
    re.IGNORECASE,
)
QUESTION_START_RE = re.compile(r"(?m)^\s*(\d{1,3})\.\s+(?=\S)")
OPTION_MARKER_RE = re.compile(r"(?<![A-Za-z0-9])([A-E])[\.)]\s+", re.IGNORECASE)
FIGURE_RE = re.compile(r"\[Figure:\s*(.*?)\]", re.IGNORECASE | re.DOTALL)


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def parse_options_and_stem(block: str) -> tuple[str, list[dict[str, str]]]:
    """Parse visible A-E options while preserving all supplied option wording."""
    markers = list(OPTION_MARKER_RE.finditer(block))
    if len(markers) < 2 or markers[0].group(1).upper() != "A":
        return block.strip(), []

    labels = [m.group(1).upper() for m in markers]
    # Only treat a contiguous, ordered A-B-C-D or A-B-C-D-E sequence as options.
    expected = ["A", "B", "C", "D", "E"][: len(labels)]
    if labels != expected:
        return block.strip(), []

    stem = block[: markers[0].start()].strip()
    options: list[dict[str, str]] = []
    for index, marker in enumerate(markers):
        start = marker.end()
        end = markers[index + 1].start() if index + 1 < len(markers) else len(block)
        option_text = block[start:end].strip()
        # A trailing year/question citation belongs to the source reference, not option text.
        option_text = REFERENCE_RE.sub("", option_text).strip()
        if not option_text:
            continue
        options.append({"label": marker.group(1).upper(), "text": option_text})
    return stem, options


def split_question_blocks(text: str) -> list[tuple[int, int, str]]:
    starts = list(QUESTION_START_RE.finditer(text))
    blocks: list[tuple[int, int, str]] = []
    for index, match in enumerate(starts):
        start = match.start()
        end = starts[index + 1].start() if index + 1 < len(starts) else len(text)
        blocks.append((match.start(1), int(match.group(1)), text[start:end].strip()))
    return blocks


def parse_subject(subject: str, source_path: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    text = source_path.read_text(encoding="utf-8-sig")
    source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
    items: list[dict[str, Any]] = []
    fingerprints: dict[str, int] = {}
    status_counts: Counter[str] = Counter()
    year_counts: Counter[str] = Counter()

    for item_index, (number_offset, original_number, raw_block) in enumerate(split_question_blocks(text), start=1):
        line_number = text.count("\n", 0, number_offset) + 1
        references = [
            {"year": int(match.group(1)), "question_number": match.group(2) or None, "raw": match.group(0)}
            for match in REFERENCE_RE.finditer(raw_block)
        ]
        years = sorted({ref["year"] for ref in references})
        year = years[0] if len(years) == 1 and len(references) == 1 else None

        stem, options = parse_options_and_stem(raw_block)
        # Remove only the source citation tokens from the stem; keep figure descriptions and all prose.
        stem = REFERENCE_RE.sub("", stem).strip()
        stem = re.sub(r"\s+", " ", stem).strip()
        figures = [re.sub(r"\s+", " ", value).strip() for value in FIGURE_RE.findall(raw_block)]

        errors: list[str] = []
        if not references:
            errors.append("missing_source_year_reference")
        elif len(references) > 1:
            errors.append("multiple_source_references_require_review")
        if year is None and references:
            errors.append("ambiguous_source_year_or_reference")
        if len(options) < 4:
            errors.append("fewer_than_four_parseable_options")
        if len(options) == 5:
            errors.append("five_option_source_requires_format_review_before_current_format_use")
        if not stem or len(stem) < 8:
            errors.append("question_stem_too_short_or_unparsed")
        if figures:
            errors.append("figure_description_requires_original_image_review")

        canonical = json.dumps(
            {"subject": subject, "year": year, "question": stem, "options": options},
            ensure_ascii=False,
            sort_keys=True,
        )
        fingerprint = sha256_text(canonical)
        if fingerprint in fingerprints:
            errors.append("duplicate_fingerprint_in_source")
            duplicate_of = fingerprints[fingerprint]
        else:
            fingerprints[fingerprint] = item_index
            duplicate_of = None

        source_q_numbers = [
            ref["question_number"]
            for ref in references
            if ref["question_number"] and re.fullmatch(r"\d+", str(ref["question_number"]))
        ]
        has_one_resolved_reference = len(references) == 1 and len(source_q_numbers) == 1
        if not has_one_resolved_reference:
            errors.append("missing_or_ambiguous_source_question_number")
        source_q_number = source_q_numbers[0] if has_one_resolved_reference else None
        source_reference = "; ".join(ref["raw"] for ref in references) or None
        category = "objective" if len(options) >= 2 else "unclassified"

        # Answers and explanations were not supplied in these source files.
        # They remain null until a reviewer explicitly adds and verifies them.
        item = {
            "item_number": item_index,
            "subject": subject,
            "year": year,
            "category": category,
            "question": stem,
            "options": options,
            "correct_answer": None,
            "explanation": None,
            "answer_key_verified": False,
            "difficulty": None,
            "topic": None,
            "source_document": source_path.name,
            "source_page": None,
            "source_question_number": source_q_number,
            "source_reference": source_reference,
            "source_line": line_number,
            "figure_descriptions": figures,
            "raw_source_text": raw_block,
            "content_hash": fingerprint,
            "duplicate_of_item_number": duplicate_of,
            "validation_errors": errors,
            "review_status": "needs_review",
        }
        items.append(item)
        status_counts["needs_review"] += 1
        year_counts[str(year) if year is not None else "unknown_or_ambiguous"] += 1

    package = {
        "schema_version": 1,
        "exam_program_id": "jamb",
        "subject": subject,
        "source_document": source_path.name,
        "source_sha256": source_hash,
        "source_character_count": len(text),
        "candidate_count": len(items),
        "answers_and_explanations_supplied": False,
        "items": items,
    }
    report = {
        "subject": subject,
        "source_document": source_path.name,
        "source_sha256": source_hash,
        "candidate_count": len(items),
        "year_distribution": dict(year_counts),
        "validation_issue_counts": dict(Counter(error for item in items for error in item["validation_errors"])),
        "figure_question_count": sum(bool(item["figure_descriptions"]) for item in items),
        "no_answer_key_count": len(items),
        "publishable_without_human_review": 0,
    }
    return package, report


def build_all(source_map: dict[str, Path] | None = None) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    source_map = source_map or SOURCES
    packages: list[dict[str, Any]] = []
    reports: list[dict[str, Any]] = []
    for subject, path in source_map.items():
        if not path.exists():
            raise FileNotFoundError(f"Missing {subject} source: {path}")
        package, report = parse_subject(subject, path)
        packages.append(package)
        reports.append(report)
    return packages, {"exam_program_id": "jamb", "subjects": reports}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out-dir", type=Path, default=ROOT / "private-question-sources" / "generated-json" / "jamb")
    parser.add_argument("--report", type=Path, default=None)
    args = parser.parse_args()

    packages, report = build_all()
    args.out_dir.mkdir(parents=True, exist_ok=True)
    for package in packages:
        output = args.out_dir / f"{package['subject']}.json"
        output.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{output.name}: {package['candidate_count']} staged candidates")
    report_path = args.report or args.out_dir / "import-audit.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Audit written to {report_path}")
    print("No answer keys were generated. Every candidate remains needs_review.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
