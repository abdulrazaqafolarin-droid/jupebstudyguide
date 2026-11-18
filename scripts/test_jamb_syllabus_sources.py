import tempfile
import unittest
from pathlib import Path

import fitz

from scripts.extract_jamb_syllabus_sources import (
    SUBJECT_FILES,
    extract_all,
    normalize_page_text,
)


class JambSyllabusExtractionTests(unittest.TestCase):
    def test_normalizes_whitespace_without_joining_meaningful_lines(self):
        actual = normalize_page_text("  Topic   One  \r\n\r\n  (a)   Detail  \n")
        self.assertEqual(actual, "Topic One\n\n(a) Detail")

    def test_source_manifest_requires_all_five_subjects(self):
        with tempfile.TemporaryDirectory() as tmp:
            source_dir = Path(tmp) / "input"
            output_dir = Path(tmp) / "output"
            source_dir.mkdir()
            sample = ("JAMB syllabus content and learning objectives. " * 30)
            for filename in SUBJECT_FILES.values():
                document = fitz.open()
                page = document.new_page()
                page.insert_textbox((60, 60, 540, 700), sample, fontsize=10)
                document.save(source_dir / filename)
                document.close()

            manifest = extract_all(source_dir, output_dir)
            self.assertTrue(manifest["complete"])
            self.assertEqual(
                {item["subject"] for item in manifest["subjects"]},
                set(SUBJECT_FILES),
            )
            self.assertTrue((output_dir / "manifest.json").is_file())
            for subject in SUBJECT_FILES:
                self.assertTrue((output_dir / subject / f"{subject}.txt").is_file())
                self.assertTrue((output_dir / subject / f"{subject}.json").is_file())
                self.assertTrue(
                    (output_dir / subject / "previews" / "page-001.png").is_file()
                )

    def test_missing_source_is_reported_not_silently_ignored(self):
        with tempfile.TemporaryDirectory() as tmp:
            source_dir = Path(tmp) / "input"
            output_dir = Path(tmp) / "output"
            source_dir.mkdir()
            with self.assertRaises(RuntimeError):
                extract_all(source_dir, output_dir)
            manifest = __import__("json").loads(
                (output_dir / "manifest.json").read_text(encoding="utf-8")
            )
            self.assertFalse(manifest["complete"])
            self.assertEqual(len(manifest["errors"]), len(SUBJECT_FILES))


if __name__ == "__main__":
    unittest.main()
