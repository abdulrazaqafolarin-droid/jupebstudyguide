# JAMB answer-queue and source recovery — 27 November 2026

## What was recovered

The GitHub Actions artifact `jamb-source-intake-bundle` (artifact ID `15095018017`, run `45774184243`, created 26 November 2026) was downloaded and inspected. The 2.4 MB ZIP contains the four generated review-only subject packages, the four matching original text files, a README and an import audit. It is a source-intake bundle, not the missing hand-edited v17 answer queue.

| Source package | Candidate records |
|---|---:|
| Physics | 896 |
| Chemistry | 1,940 |
| Biology | 1,833 |
| Use of English | 3,914 |
| **Total** | **8,583** |

The candidate packages preserve source question text, options, source references, figure descriptions, passage data (where extracted) and validation errors. They do not supply independently verified answer keys. The importer intentionally leaves answer keys and explanations blank and keeps every candidate in review.

## Historical 526 target versus current strict-parser comparison

The saved v9 manifest and v17 progress summary preserve the historical 526-question work target:

| Subject | Historical 526 target |
|---|---:|
| Physics | 130 |
| Chemistry | 111 |
| Biology | 175 |
| Use of English | 110 |
| **Total** | **526** |

A newer exact-parser/source-to-database reconciliation on 26 November identifies 542 missing strict subject/reference pairs:

| Subject | Current strict comparison | Difference |
|---|---:|---:|
| Physics | 133 | +3 |
| Chemistry | 124 | +13 |
| Biology | 175 | 0 |
| Use of English | 110 | 0 |
| **Total** | **542** | **+16** |

The 16-pair discrepancy is confined to Physics and Chemistry. The old per-question v17 master queue and subject JSONs were not found in the current repository tree or the fully enumerated Library. The v17 summary records 169 letter drafts, 51 concept-only solutions and 306 still without answer/concept, but does not contain the identities of those 526 records. Therefore the new 542 rows must not be represented as a recovered v17 queue, and they must not silently replace the 526 work target.

Two of the 542 missing pairs overlap repeated printed source references: Physics 1981:Q4 and 1993:Q12. Each occurs twice in the source text with different question wording, so source occurrence must be reviewed before deciding whether a single source reference represents one item or a variant.

## Current source/database exceptions

The 26 November comparison records:

- 97 live reference groups outside the current strict four-source packages.
- Eight repeated live subject/reference groups (16 rows).
- 99 repeated source-reference groups (199 source occurrences) within the source files.

The 97 out-of-source groups have heuristic text-comparison classes:

| Class | Groups |
|---|---:|
| Strong wording match under the same reference | 27 |
| Partial wording match under the same reference | 7 |
| Reference token present, but wording differs or remains diagram-sensitive | 38 |
| Strong wording match under another reference | 5 |
| Partial wording match under another reference | 4 |
| No meaningful source-block match | 16 |
| **Total** | **97** |

These text-similarity classes are triage only, not proof of identity, correctness or a safe source-reference change. The five strong and four partial alternate-reference matches require manual source comparison. Do not bulk-correct references or insert the 542 items based on this table.

## Answer-key status and safe boundary

Current Supabase read-only checks confirm:

- 7,630 JAMB questions.
- All 7,630 questions remain `hidden=true` and `review_status='needs_review'`.
- All 7,630 have a protected answer-key row; all remain `needs_review`; zero are approved.
- The migration `20261125194350_add_jamb_answer_draft_confidence` is applied and the columns `confidence_level`, `confidence_note`, `evidence_reference` and `draft_version` are present.
- The migration `20261126101025_jamb_protect_answer_key_storage` is applied. It cleared legacy JAMB answer/explanation values from `study_questions`, preserving the protected rows in `study_question_answer_keys`.
- The live `question-import` Edge Function is active at v8 and includes the answer-draft-only action with hidden/needs-review guards and version conflict checks.
- The answer-key and JAMB admin audit tables have RLS enabled; anon/authenticated have no SELECT privilege; service_role retains its server-side access.

The six previously reviewed records retain their saved confidence/evidence metadata. This remains triage metadata, not verification. No question was approved or published in this reconciliation pass.

## Next work sequence

1. Recover or regenerate the exact per-question v17 work file if it is still available elsewhere; otherwise reconstruct a **new** candidate-level queue from the recovered source bundle and clearly keep it separate from the historical 526 target.
2. Explain the +3 Physics / +13 Chemistry discrepancy using source occurrence, section boundaries and question numbering—not counts alone.
3. Resolve the nine alternate-reference matches and 38 wording/diagram-sensitive out-of-source records individually.
4. Review missing diagrams and English passage/literary context before assigning answers.
5. Only save answer drafts with exact option matching, evidence, a confidence note and audit history; keep all keys unapproved until an independent human review and source-rights confirmation.

No questions were inserted, deleted, approved, unhidden or published by this source reconciliation.
