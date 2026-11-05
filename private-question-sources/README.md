# Private question-source files

Place locally held source documents and OCR/extracted text under this directory, for example:

- `private-question-sources/extracted-text/*.txt`

The importer reads from `private-question-sources/extracted-text` but these source files are intentionally ignored by Git. Do not commit original PDFs, scans, extracted question text, API keys, or answer-bank exports here.

The running application continues to deliver eligible questions from Supabase. Keep private source material in a private local backup or a private storage bucket with access controls.
