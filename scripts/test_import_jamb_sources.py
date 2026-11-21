import json
import tempfile
import unittest
from pathlib import Path

from scripts.import_jamb_sources import build_all, parse_subject, split_question_blocks, parse_options_and_stem


class JambImportParserTests(unittest.TestCase):
    def test_parses_four_options_and_preserves_year_reference(self):
        raw = "1. A question about force? A. First option B. Second option C. Third option D. Fourth option (2018:Q33)"
        stem, options = parse_options_and_stem(raw)
        self.assertTrue(stem.startswith("1. A question about force?"))
        self.assertEqual([item["label"] for item in options], ["A", "B", "C", "D"])
        self.assertEqual(options[3]["text"], "Fourth option")

    def test_preserves_fifth_option_instead_of_dropping_it(self):
        raw = "1. Pick one A. First B. Second C. Third D. Fourth E. Fifth (1987:Q2)"
        _, options = parse_options_and_stem(raw)
        self.assertEqual([item["label"] for item in options], ["A", "B", "C", "D", "E"])

    def test_question_blocks_keep_source_numbering_and_line_position(self):
        text = "CHAPTER ONE\n1. First question A. a B. b C. c D. d (2001:Q1)\n\n2. Second question A. a B. b C. c D. d (2002:Q2)"
        blocks = split_question_blocks(text)
        self.assertEqual([item[1] for item in blocks], [1, 2])
        self.assertEqual(len(blocks), 2)

    def test_all_three_committed_sources_are_parseable_and_review_only(self):
        packages, report = build_all()
        self.assertEqual({package["subject"] for package in packages}, {"physics", "chemistry", "biology"})
        self.assertEqual(report["exam_program_id"], "jamb")
        self.assertEqual(
            {package["subject"]: package["candidate_count"] for package in packages},
            {"physics": 896, "chemistry": 1940, "biology": 1833},
        )
        self.assertEqual(sum(package["candidate_count"] for package in packages), 4669)
        for package in packages:
            self.assertEqual(len(package["source_sha256"]), 64)
            self.assertEqual(package["candidate_count"], len(package["items"]))
            self.assertGreater(package["candidate_count"], 0)
            self.assertTrue(all(item["correct_answer"] is None for item in package["items"]))
            self.assertTrue(all(item["explanation"] is None for item in package["items"]))
            self.assertTrue(all(item["review_status"] == "needs_review" for item in package["items"]))
        self.assertTrue(all(subject["publishable_without_human_review"] == 0 for subject in report["subjects"]))

    def test_source_question_number_never_falls_back_to_document_block_position(self):
        text = "\n".join([
            "1. Resolved question? A. a B. b C. c D. d (2018:Q33)",
            "2. Missing citation? A. a B. b C. c D. d",
            "3. Unknown question number? A. a B. b C. d (2019:Q?12)",
            "4. Multiple citations? A. a B. b C. c D. d (2020:Q4) (2021:Q5)",
        ])
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "Physics.txt"
            path.write_text(text, encoding="utf-8")
            package, _ = parse_subject("physics", path)

        first, missing, unknown, multiple = package["items"]
        self.assertEqual(first["source_question_number"], "33")
        self.assertEqual(first["year"], 2018)
        self.assertIsNone(missing["source_question_number"])
        self.assertIsNone(unknown["source_question_number"])
        self.assertIsNone(multiple["source_question_number"])
        self.assertIn("missing_or_ambiguous_source_question_number", missing["validation_errors"])
        self.assertIn("missing_or_ambiguous_source_question_number", unknown["validation_errors"])
        self.assertIn("missing_or_ambiguous_source_question_number", multiple["validation_errors"])

    def test_unreferenced_and_figure_questions_remain_ungraded_review_items(self):
        text = "1. Figure question [Figure: a labelled cell diagram] A. a B. b C. c D. d\n"
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "Biology.txt"
            path.write_text(text, encoding="utf-8")
            package, report = parse_subject("biology", path)
        item = package["items"][0]
        self.assertIsNone(item["year"])
        self.assertIsNone(item["correct_answer"])
        self.assertIsNone(item["explanation"])
        self.assertEqual(item["review_status"], "needs_review")
        self.assertIn("missing_source_year_reference", item["validation_errors"])
        self.assertIn("figure_description_requires_original_image_review", item["validation_errors"])
        self.assertEqual(report["publishable_without_human_review"], 0)


if __name__ == "__main__":
    unittest.main()
