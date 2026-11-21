import json
import tempfile
import unittest
from pathlib import Path

from scripts.import_jamb_sources import (
    build_all,
    parse_english_source,
    parse_subject,
    split_question_blocks,
    parse_options_and_stem,
    SOURCES,
)


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

    def test_all_science_sources_are_parseable_and_review_only(self):
        packages, report = build_all({subject: path for subject, path in SOURCES.items()})
        science = {package["subject"]: package for package in packages}
        self.assertEqual(set(science), {"physics", "chemistry", "biology"})
        self.assertEqual(report["exam_program_id"], "jamb")
        self.assertEqual(
            {subject: package["candidate_count"] for subject, package in science.items()},
            {"physics": 896, "chemistry": 1940, "biology": 1833},
        )
        self.assertEqual(sum(package["candidate_count"] for package in science.values()), 4669)
        for package in science.values():
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

    def test_english_parser_preserves_years_passages_answers_and_unverified_status(self):
        fixture = """JAMB ENGLISH 1997 - OBJECTIVE
Questions: 2/2 | Duration: 45 min
==============================================================================
--- PASSAGE ---
Title: A short passage
The passage text is preserved for learners.
--- END PASSAGE ---

1. According to the passage, what is true?
   A. First choice
   B. Second choice
   C. Third choice
   D. Fourth choice
   ANSWER: B
   EXPLANATION: The passage directly supports the second choice.
   
2. Which statement is correct?
   A. Alpha
   B. Beta
   C. Gamma
   D. Delta
   ANSWER: D
   EXPLANATION: The source explanation describes why Delta is correct.
"""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "JAMB_english_READABLE.txt"
            path.write_text(fixture, encoding="utf-8")
            package, report = parse_english_source(path)

        self.assertEqual(package["subject"], "use_of_english")
        self.assertEqual(package["candidate_count"], 2)
        self.assertEqual(package["items"][0]["year"], 1997)
        self.assertEqual(package["items"][0]["source_reference"], "1997:Q1")
        self.assertEqual(package["items"][0]["options"][1]["label"], "B")
        self.assertTrue(package["items"][0]["passage"].startswith("Title: A short passage"))
        self.assertEqual(package["items"][0]["correct_answer"], "B")
        self.assertIn("directly supports", package["items"][0]["explanation"])
        self.assertFalse(package["items"][0]["answer_key_verified"])
        self.assertEqual(package["items"][0]["review_status"], "needs_review")
        self.assertEqual(report["publishable_without_human_review"], 0)

    def test_english_parser_flags_missing_key_malformed_options_and_count_mismatch(self):
        fixture = """JAMB ENGLISH 2017 - OBJECTIVE
Questions: 2/2 | Source: fixture
==============================================================================
1. First item
   A. Alpha
   B. Beta
   C. Gamma

2. Second item
   A. One
   B. Two
   C. Three
   D. Four
"""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "english.txt"
            path.write_text(fixture, encoding="utf-8")
            package, report = parse_english_source(path)

        self.assertEqual(package["candidate_count"], 2)
        self.assertIn("options_must_be_contiguous_a_to_d_or_a_to_e", package["items"][0]["validation_errors"])
        self.assertIn("answer_key_not_supplied_in_source", package["items"][0]["validation_errors"])
        self.assertIn("meaningful_explanation_not_supplied_in_source", package["items"][1]["validation_errors"])
        self.assertFalse(any(item["answer_key_verified"] for item in package["items"]))
        self.assertEqual(report["publishable_without_human_review"], 0)

    def test_committed_english_source_if_available_stays_review_only(self):
        from scripts.import_jamb_sources import ENGLISH_SOURCE

        if not ENGLISH_SOURCE.exists():
            self.skipTest("The English source file is present on the base branch, not this isolated source checkout.")
        package, report = parse_english_source(ENGLISH_SOURCE)
        self.assertEqual(package["subject"], "use_of_english")
        self.assertEqual(package["candidate_count"], len(package["items"]))
        self.assertGreater(package["candidate_count"], 3000)
        self.assertEqual(report["publishable_without_human_review"], 0)
        self.assertTrue(all(not item["answer_key_verified"] for item in package["items"]))
        self.assertTrue(all(item["review_status"] == "needs_review" for item in package["items"]))


if __name__ == "__main__":
    unittest.main()
