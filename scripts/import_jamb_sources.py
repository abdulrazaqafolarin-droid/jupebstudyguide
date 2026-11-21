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
ENGLISH_SOURCE = ROOT / "JAMB_english_READABLE.txt"
ENGLISH_HEADER_RE = re.compile(
    r"(?m)^JAMB ENGLISH\s+((?:19|20)\d{2})\s+-\s+OBJECTIVE\s*$",
    re.IGNORECASE,
)
ENGLISH_QUESTION_RE = re.compile(r"(?m)^\s*(\d{1,3})\.\s+(?=\S)")
ENGLISH_OPTION_RE = re.compile(r"(?m)^[ \t]*([A-E])[.)][ \t]+", re.IGNORECASE)
ENGLISH_PASSAGE_RE = re.compile(
    r"---\s*PASSAGE\s*---(.*?)---\s*END PASSAGE\s*---",
    re.IGNORECASE | re.DOTALL,
)
ENGLISH_ANSWER_RE = re.compile(r"(?im)^\s*ANSWER\s*:\s*([A-E])\s*$")
ENGLISH_EXPLANATION_RE = re.compile(r"(?ims)^\s*EXPLANATION\s*:\s*(.*?)(?=^\s*---\s*PASSAGE\s*---|\Z)")
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


def _extract_passage_blocks(text: str) -> tuple[str, list[str]]:
    """Remove explicit passage blocks and return their cleaned source text."""
    passages: list[str] = []

    def replace(match: re.Match[str]) -> str:
        passage = re.sub(r"\s+", " ", match.group(1)).strip()
        if passage:
            passages.append(passage)
        return "\n"

    return ENGLISH_PASSAGE_RE.sub(replace, text), passages


def parse_english_source(source_path: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    """Parse year-bounded Use of English questions without inventing missing keys.

    Question blocks and explicit passage blocks are preserved. A supplied answer
    and explanation are extracted as source suggestions, but answer_key_verified
    remains false until a human reviewer independently checks them.
    """
    text = source_path.read_text(encoding="utf-8-sig")
    source_hash = hashlib.sha256(source_path.read_bytes()).hexdigest()
    headings = list(ENGLISH_HEADER_RE.finditer(text))
    if not headings:
        raise ValueError(f"No JAMB English year headings found in {source_path}")

    items: list[dict[str, Any]] = []
    fingerprints: dict[str, int] = {}
    year_counts: Counter[str] = Counter()
    issue_counts: Counter[str] = Counter()
    year_reports: list[dict[str, Any]] = []

    for section_index, heading in enumerate(headings):
        year = int(heading.group(1))
        section_end = headings[section_index + 1].start() if section_index + 1 < len(headings) else len(text)
        section_text = text[heading.end():section_end]
        declared = re.search(r"(?im)^Questions\s*:\s*(\d+)\s*/\s*(\d+)", section_text)
        declared_count = int(declared.group(2)) if declared else None
        source_q_starts = list(ENGLISH_QUESTION_RE.finditer(section_text))
        if not source_q_starts:
            year_reports.append({
                "year": year,
                "declared_question_count": declared_count,
                "parsed_question_count": 0,
                "issues": ["no_numbered_questions_found"],
            })
            issue_counts["no_numbered_questions_found"] += 1
            continue

        prefix = section_text[:source_q_starts[0].start()]
        _, initial_passages = _extract_passage_blocks(prefix)
        active_passage = initial_passages[-1] if initial_passages else ""
        year_start_index = len(items)
        year_issues: Counter[str] = Counter()

        for question_index, question_match in enumerate(source_q_starts):
            block_start = question_match.start()
            block_end = source_q_starts[question_index + 1].start() if question_index + 1 < len(source_q_starts) else len(section_text)
            raw_block = section_text[block_start:block_end].strip()
            block_without_passages, embedded_passages = _extract_passage_blocks(raw_block)
            if embedded_passages:
                # A passage between question N and N+1 is context for the next question.
                # The active passage is updated after the current item is parsed below.
                pending_passage = embedded_passages[-1]
            else:
                pending_passage = ""

            original_number = int(question_match.group(1))
            # Strip only the leading source number; question text and passage wording remain intact.
            question_body = re.sub(r"^\s*\d{1,3}\.\s*", "", block_without_passages, count=1).strip()

            answer_match = ENGLISH_ANSWER_RE.search(question_body)
            explanation_match = ENGLISH_EXPLANATION_RE.search(question_body)
            answer = answer_match.group(1).upper() if answer_match else None
            explanation = re.sub(r"\s+", " ", explanation_match.group(1)).strip() if explanation_match else None

            option_markers = list(ENGLISH_OPTION_RE.finditer(question_body))
            first_meta = min(
                [match.start() for match in (answer_match, explanation_match) if match] or [len(question_body)]
            )
            option_markers = [marker for marker in option_markers if marker.start() < first_meta]
            option_errors: list[str] = []
            options: list[dict[str, str]] = []
            if option_markers:
                stem = question_body[:option_markers[0].start()].strip()
                for marker_index, marker in enumerate(option_markers):
                    option_start = marker.end()
                    option_end = option_markers[marker_index + 1].start() if marker_index + 1 < len(option_markers) else first_meta
                    option_text = question_body[option_start:option_end].strip()
                    option_text = re.sub(r"\s+", " ", option_text).strip()
                    options.append({"label": marker.group(1).upper(), "text": option_text})
            else:
                stem = question_body[:first_meta].strip()
                option_errors.append("no_line_anchored_option_markers_found")

            expected_labels = ["A", "B", "C", "D"] if len(options) == 4 else ["A", "B", "C", "D", "E"] if len(options) == 5 else []
            if not expected_labels or [option["label"] for option in options] != expected_labels:
                option_errors.append("options_must_be_contiguous_a_to_d_or_a_to_e")
            if any(not option["text"] for option in options):
                option_errors.append("one_or_more_options_are_empty")

            question = re.sub(r"\s+", " ", stem).strip()
            # Some older sets embed the passage in question 1 rather than using
            # explicit PASSAGE markers. Reuse that visible context for subsequent
            # comprehension questions in the same section.
            inline_passage = ""
            if not active_passage and re.search(r"(?i)read the passage above.*title:", question):
                inline_passage = question
            passage_for_item = active_passage or inline_passage
            if passage_for_item and question and passage_for_item != question:
                question = passage_for_item + "\n\n" + question
            elif not passage_for_item and re.search(r"(?i)read the passage above|from the passage|according to the passage", question):
                option_errors.append("passage_context_missing_or_not_separately_extractable")

            errors = list(option_errors)
            if len(question.strip()) < 8:
                errors.append("question_text_missing_or_too_short")
            if not answer:
                errors.append("answer_key_not_supplied_in_source")
            elif answer not in [option["label"] for option in options]:
                errors.append("source_answer_does_not_match_parsed_option")
            if not explanation or len(explanation) < 12:
                errors.append("meaningful_explanation_not_supplied_in_source")
            if answer and explanation and answer in [option["label"] for option in options]:
                errors.append("source_answer_and_explanation_require_independent_human_verification")

            source_question_number = original_number
            source_reference = f"{year}:Q{source_question_number}"
            canonical = json.dumps(
                {"subject": "use_of_english", "year": year, "question": question, "options": options},
                ensure_ascii=False,
                sort_keys=True,
            )
            fingerprint = sha256_text(canonical)
            duplicate_of = fingerprints.get(fingerprint)
            if duplicate_of is not None:
                errors.append("duplicate_fingerprint_in_source")
            else:
                fingerprints[fingerprint] = len(items) + 1

            source_offset = heading.end() + block_start + question_match.start(1)
            line_number = text.count("\n", 0, source_offset) + 1
            item = {
                "item_number": len(items) + 1,
                "subject": "use_of_english",
                "year": year,
                "category": "objective",
                "question": question,
                "passage": passage_for_item or None,
                "options": options,
                "correct_answer": answer,
                "explanation": explanation,
                "answer_key_verified": False,
                "difficulty": None,
                "topic": None,
                "source_document": source_path.name,
                "source_page": None,
                "source_question_number": str(source_question_number),
                "source_reference": source_reference,
                "source_line": line_number,
                "figure_descriptions": [],
                "raw_source_text": raw_block,
                "content_hash": fingerprint,
                "duplicate_of_item_number": duplicate_of,
                "validation_errors": list(dict.fromkeys(errors)),
                "review_status": "needs_review",
            }
            items.append(item)
            year_counts[str(year)] += 1
            for error in item["validation_errors"]:
                issue_counts[error] += 1
                year_issues[error] += 1

            if pending_passage:
                active_passage = pending_passage
            elif inline_passage:
                active_passage = inline_passage

        parsed_count = len(items) - year_start_index
        section_issues: list[str] = []
        if declared_count is not None and parsed_count != declared_count:
            section_issues.append("declared_question_count_mismatch")
            issue_counts["declared_question_count_mismatch"] += 1
        year_reports.append({
            "year": year,
            "declared_question_count": declared_count,
            "parsed_question_count": parsed_count,
            "issue_counts": dict(year_issues),
            "issues": section_issues,
        })

    package = {
        "schema_version": 1,
        "exam_program_id": "jamb",
        "subject": "use_of_english",
        "source_document": source_path.name,
        "source_sha256": source_hash,
        "source_character_count": len(text),
        "candidate_count": len(items),
        "answers_and_explanations_supplied": any(item["correct_answer"] and item["explanation"] for item in items),
        "answer_keys_independently_verified": False,
        "years": year_reports,
        "items": items,
    }
    report = {
        "subject": "use_of_english",
        "source_document": source_path.name,
        "source_sha256": source_hash,
        "candidate_count": len(items),
        "year_distribution": dict(year_counts),
        "year_reports": year_reports,
        "validation_issue_counts": dict(issue_counts),
        "source_answer_count": sum(bool(item["correct_answer"]) for item in items),
        "source_explanation_count": sum(bool(item["explanation"]) for item in items),
        "publishable_without_human_review": 0,
    }
    return package, report


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

    english_source = source_map.get("use_of_english", ENGLISH_SOURCE)
    if english_source.exists():
        english_package, english_report = parse_english_source(english_source)
        packages.append(english_package)
        reports.append(english_report)

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
    print("All generated packages remain needs_review. Source-supplied English answers are unverified and require independent human verification.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
