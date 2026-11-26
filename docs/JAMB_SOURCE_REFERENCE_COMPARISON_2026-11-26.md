# JAMB source-reference comparison — 26 November 2026

This is a fresh exact-parser comparison of the four CI source-review packages against current JAMB rows in the shared Supabase project. It is a **forensic reconciliation snapshot**, not an instruction to import, publish, approve, deduplicate or change existing questions.

## Counts

| Measure | Count |
|---|---:|
| Unique strict source subject/reference pairs | 8067 |
| Source pairs not found in the live JAMB bank | 542 |
| Live reference groups absent from the four strict source packages | 97 |
| Live question rows in those out-of-source groups | 97 |
| Live repeated-reference groups | 8 |
| Live question rows in repeated-reference groups | 16 |
| Repeated source-reference groups in the source packages | 99 |

## Why the established 526 queue is not replaced

The prior detailed audit's working queue remains **526**. This fresh comparison yields 542 exact missing subject/reference pairs, 97 out-of-source reference groups and 8 repeated live groups. The counts differ from the earlier reconciliation (526 / 76 / 8), so this file is retained as a comparison snapshot until the difference is resolved against the original detailed audit manifest. Do not use its 542-row list as a replacement import target without that reconciliation.

Reference numbers are scoped by subject. Reused references in different subjects are not duplicates. The two known Biology reused-reference groups (1981:Q47 and 1995:Q26) also contain distinct questions and must be retained. The six known same-subject duplicate pairs remain pending soft deduplication; the database has not been changed by this report.

## Files

- `JAMB_SOURCE_REFERENCE_MISSING_REVIEW_2026-11-26.csv`: exact subject/reference pairs absent from the live bank, with matching source excerpts.
- `JAMB_SOURCE_REFERENCE_OUTSIDE_SOURCE_2026-11-26.csv`: live rows whose subject/reference pair is not in the strict four-source package.
- `JAMB_SOURCE_REFERENCE_DATABASE_REPEATS_2026-11-26.csv`: every row in each repeated live subject/reference group.
- `JAMB_SOURCE_REFERENCE_SOURCE_REPEATS_2026-11-26.csv`: repeated printed references inside the source files, with each source occurrence retained.

All 7,630 live JAMB questions remain hidden and `needs_review`; all protected answer keys remain `needs_review`. This report does not attest to source-use rights or academic correctness.
