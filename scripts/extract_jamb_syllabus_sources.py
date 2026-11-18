#!/usr/bin/env python3
"""Extract the committed JAMB syllabus PDFs into a reviewable, page-preserving pack.

This deliberately does not guess syllabus topics. It preserves text page by page,
records source hashes/metadata and renders page previews so the extracted content
can be reviewed before it becomes application data.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import shutil
from pathlib import Path
from typing import Any

SOURCE_COMMIT = "e1d9b81b82be717567f47972c39a6ce702bf6b92"
SUBJECT_FILES = {
    "biology": "Biology-1.pdf",
    "chemistry": "Chemistry-1.pdf",
    "mathematics": "Mathematics.pdf",
    "physics": "Physics-1.pdf",
    "english": "Use of English.pdf",
}


def normalize_page_text(value: str) -> str:
    """Normalize extraction noise while preserving meaningful line boundaries."""
    value = value.replace("\x00", "").replace("\u00a0", " ")
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in value.split("\n")]
    while lines and not lines[0]:
        lines.pop(0)
    while lines and not lines[-1]:
        lines.pop()
    output: list[str] = []
    blank = False
    for line in lines:
        if not line:
            if not blank:
                output.append("")
            blank = True
        else:
            output.append(line)
            blank = False
    return "\n".join(output).strip()


def _safe_metadata(metadata: dict[str, Any] | None) -> dict[str, str]:
    if not metadata:
        return {}
    return {
        str(key): str(value)
        for key, value in metadata.items()
        if value not in (None, "")
    }


def extract_one_pdf(pdf_path: Path, subject: str, output_dir: Path) -> dict[str, Any]:
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError(
            "PyMuPDF is required. Install it with: python -m pip install pymupdf"
        ) from exc

    if not pdf_path.is_file():
        raise FileNotFoundError(f"Missing {subject} syllabus PDF: {pdf_path}")
    raw = pdf_path.read_bytes()
    if not raw.startswith(b"%PDF-"):
        raise ValueError(f"{pdf_path.name} is not a valid PDF file")

    document = fitz.open(stream=raw, filetype="pdf")
    if document.is_encrypted:
        raise ValueError(f"{pdf_path.name} is encrypted and cannot be extracted")
    if document.page_count < 1:
        raise ValueError(f"{pdf_path.name} contains no pages")

    subject_dir = output_dir / subject
    preview_dir = subject_dir / "previews"
    preview_dir.mkdir(parents=True, exist_ok=True)

    pages: list[dict[str, Any]] = []
    text_parts: list[str] = []
    page_text_count = 0
    table_count = 0
    for index, page in enumerate(document):
        # Blocks sorted by page position retain a more useful reading order than
        # a single raw string for the multi-column syllabus tables.
        blocks = page.get_text("blocks", sort=True)
        block_text = "\n".join(
            str(block[4]).strip()
            for block in blocks
            if len(block) > 4 and str(block[4]).strip()
        )
        page_text = normalize_page_text(block_text or page.get_text("text", sort=True))
        if page_text:
            page_text_count += 1
        # Preserve source table cells as structured data where PyMuPDF can
        # detect their grid. These cells are raw extracted text, not yet a
        # semantically approved topic mapping.
        extracted_tables: list[dict[str, Any]] = []
        try:
            for table_index, table in enumerate(page.find_tables().tables, start=1):
                rows = table.extract()
                normalized_rows = [
                    [normalize_page_text(cell or "") for cell in row]
                    for row in rows
                ]
                if any(any(cell for cell in row) for row in normalized_rows):
                    extracted_tables.append({
                        "table": table_index,
                        "bbox": [round(float(value), 2) for value in table.bbox],
                        "rows": normalized_rows,
                    })
        except Exception:
            # Text and page previews remain the authoritative fallback if a
            # PDF page has a non-standard table or an unsupported border style.
            extracted_tables = []
        table_count += len(extracted_tables)
        pages.append({
            "page": index + 1,
            "text": page_text,
            "character_count": len(page_text),
            "tables": extracted_tables,
        })
        text_parts.append(f"\n\n===== PDF PAGE {index + 1} =====\n\n{page_text}\n")

        # Render every page for visual QA. Syllabus tables often continue
        # across pages, so limiting previews to the opening pages would hide
        # later topic sections and could conceal extraction/layout problems.
        pix = page.get_pixmap(matrix=fitz.Matrix(1.0, 1.0), alpha=False)
        pix.save(preview_dir / f"page-{index + 1:03d}.png")

    full_text = "".join(text_parts).strip() + "\n"
    if len(full_text.strip()) < 500:
        raise ValueError(
            f"{pdf_path.name} produced too little text ({len(full_text.strip())} chars); "
            "it may be image-only or extraction failed"
        )

    (subject_dir / f"{subject}.txt").write_text(full_text, encoding="utf-8")
    source_copy_dir = output_dir / "source-pdfs"
    source_copy_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(pdf_path, source_copy_dir / pdf_path.name)
    payload = {
        "subject": subject,
        "source_file": pdf_path.name,
        "source_commit": SOURCE_COMMIT,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "file_size_bytes": len(raw),
        "page_count": document.page_count,
        "preview_page_count": document.page_count,
        "preview_scale": 1.0,
        "pages_with_text": page_text_count,
        "text_character_count": len(full_text),
        "detected_table_count": table_count,
        "metadata": _safe_metadata(document.metadata),
        "table_of_contents": document.get_toc(),
        "pages": pages,
    }
    (subject_dir / f"{subject}.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    document.close()
    return {
        key: payload[key]
        for key in (
            "subject", "source_file", "source_commit", "sha256",
            "file_size_bytes", "page_count", "preview_page_count", "preview_scale",
            "pages_with_text", "text_character_count", "detected_table_count",
            "metadata", "table_of_contents",
        )
    }


def extract_all(source_dir: Path, output_dir: Path) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    subjects = []
    errors = []
    for subject, filename in SUBJECT_FILES.items():
        try:
            subjects.append(extract_one_pdf(source_dir / filename, subject, output_dir))
        except Exception as exc:  # report all missing/corrupt inputs in one run
            errors.append({"subject": subject, "file": filename, "error": str(exc)})

    manifest = {
        "schema_version": 1,
        "source_commit": SOURCE_COMMIT,
        "source_repository": "abdulrazaqafolarin-droid/jupebstudyguide",
        "subjects": subjects,
        "errors": errors,
        "complete": len(subjects) == len(SUBJECT_FILES) and not errors,
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    if errors:
        details = "; ".join(f"{item['subject']}: {item['error']}" for item in errors)
        raise RuntimeError(f"Syllabus extraction incomplete: {details}")
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    manifest = extract_all(args.source_dir, args.output_dir)
    for item in manifest["subjects"]:
        print(
            f"{item['subject']}: {item['page_count']} pages; "
            f"{item['pages_with_text']} pages with text; "
            f"{item['text_character_count']} extracted characters; "
            f"sha256={item['sha256']}"
        )
    print(f"Complete: extracted all {len(manifest['subjects'])} syllabus PDFs.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
