# Private question-source files

Place locally held source documents and OCR/extracted text under this directory, for example:

- `private-question-sources/extracted-text/*.txt`

The importer reads from `private-question-sources/extracted-text` and writes temporary JSON output to `private-question-sources/generated-json`. Both folders are intentionally ignored by Git and sit outside `src/`, so generated question data cannot be picked up as app source or bundled through ordinary imports. Do not commit original PDFs, scans, extracted question text, API keys, or answer-bank exports here.

The running application continues to deliver eligible questions from Supabase. Keep private source material in a private local backup or a private storage bucket with access controls.
