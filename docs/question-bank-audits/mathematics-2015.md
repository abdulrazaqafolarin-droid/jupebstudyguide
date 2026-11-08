# JUPEB Mathematics 2015 — source reconciliation audit

**Status:** Open; not certified complete  
**Audit date:** 2026-11-08  
**Scope:** Mathematics 2015 only  
**Production changes:** None. This document records an audit; it does not modify Supabase question records or deploy the app.

## Sources and authority

1. **Primary source:** JUPEB's official 2015 Mathematics paper: https://jupeb.edu.ng/past_questions/2015%20Mathematics.pdf
2. **Official archive index:** https://jupeb.edu.ng/questions
3. **Coverage comparator only:** StudentFirst Mathematics archive: https://studentfirst.ng/jupeb/mathematics

Use the official JUPEB paper as the authority for original wording, numbering, options, diagrams and paper structure. StudentFirst is useful for identifying coverage/count discrepancies and locating visible previews, but its gated question bank must not be bulk-copied. Answers and explanations must be independently solved and checked. Do not import third-party material or image assets without permission; recreate necessary diagrams as original assets from the source paper where practical.

## Counts checked

| Source / bank | Objective | Essay / theory | Status |
|---|---:|---:|---|
| Official JUPEB 2015 paper | 50 | 8 numbered essay questions | Source structure confirmed |
| StudentFirst 2015 archive | 50 | 8 | Comparator count |
| Rutex live Mathematics bank | 50 | 0 | Incomplete |

The 2015 Rutex objective rows are all currently visible. All 50 have `sort_order = 0`, so the database does not preserve the paper's one-based question sequence. No 2015 Mathematics rows currently have an `image_url`. No 2015 theory rows exist.

**Important:** this is a source-count reconciliation, not a claim that all 50 Rutex stems/options/keys/explanations have passed a complete independent mathematical review.

## Internal row-to-paper numbering map

Use this map as the source-number reference when the stored `sort_order` values are corrected. The mapping below follows the official 2015 PDF's question order, not the ID suffix order.

| Official question numbers | Existing Rutex IDs |
|---|---|
| 1–8 | `mat-2015-mq-0001` through `mat-2015-mq-0008` |
| 9 | `mat-2015-mq-0008a` |
| 10–28 | `mat-2015-mq-0009` through `mat-2015-mq-0027` |
| 29 | `mat-2015-mq-0028a` |
| 30 | `mat-2015-mq-0028` |
| 31–50 | `mat-2015-mq-0029` through `mat-2015-mq-0048` |

This is a numbering map only. It does not certify the affected records' content or answer keys.

## Confirmed source discrepancies requiring correction or explicit flagging

| Paper question | Rutex ID | Finding | Safe disposition |
|---:|---|---|---|
| 5 | `mat-2015-mq-0005` | The official stem says the circle is `2x² + 2y² = 30` and asks for a tangent at `(-3, 6)`. That point is not on the stated circle. Rutex replaces an original option with an explanatory non-option. | Preserve original paper wording/options and mark as a source-paper defect pending an authoritative erratum or verified alternative source. Do not grade a fabricated option. |
| 13 | `mat-2015-mq-0012` | The official paper asks for the “range for which y = 0” and its options do not express the real zero set `{-1, 0, 1}`. Rutex rewrites the stem and replaces an option with that set. | Preserve the original separately; flag the source defect. Any student-friendly correction must be labelled as an editorial correction, not the original paper. |
| 14 | `mat-2015-mq-0013` | Official denominator is `x + 35`; Rutex stores `x + 3`. The official-paper limit is 0 (option C), while the stored altered expression produces -18. | Restore the official expression and verify the key/explanation against it. |
| 29 | `mat-2015-mq-0028a` | Rutex replaces an original option with the computed scalar-projection expression `10.8/√13.41`; the official option list does not contain that expression. | Preserve original options and flag that the paper/options do not match the computed result. |
| 37 | `mat-2015-mq-0035` | Rutex changes one option to 11. The official options are 8, 9, 10 and 7, while the dot-product condition gives `λ = 11`. | Preserve original options and flag the no-correct-option source defect. |
| 40 | `mat-2015-mq-0038` | The official correct Spearman-rank formula is option C. Rutex alters/reorders the options and stores B as correct. | Restore the official option text/order and set the verified key to C. |

## Editorial normalisations that need provenance

- **Q33 — `mat-2015-mq-0031`:** official paper prints retardation as `1.2 m/s`; Rutex uses `1.2 m/s²`. This is dimensionally sensible, but should be documented as a unit correction.
- **Q36 — `mat-2015-mq-0034`:** the official option text contains a likely N/W unit typo; Rutex normalises the force units to newtons. Record this as editorial normalisation.
- **Q38 — `mat-2015-mq-0036`:** Rutex adds an independence assumption needed for the “exactly one passes” calculation. Keep that assumption explicit rather than silently inserting it into the original stem.

## Theory-paper gap

The official 2015 paper contains eight numbered essay questions (with subparts and mark allocations). Rutex currently contains none of them. Import each original question in source order, preserve every subpart and mark allocation, and independently prepare worked answer guides/mark schemes before exposing them to students.

The TypeScript `StudyQuestion` type supports `answerGuide`, `markScheme` and `totalMarks`, but the live `study_questions` table and the current row mapper do not persist/map those fields. A separate schema/data-layer review is required before treating a structured theory import as complete. Do not pack an unverified marking scheme into objective `correct_answer` fields.

## Completion gates for 2015

- [ ] All 50 objective stems and all four options compared line-by-line with the official paper.
- [ ] Original option order preserved, except for clearly labelled/approved editorial errata.
- [ ] Every objective key independently solved; discrepancies reviewed by a second pass.
- [ ] Every explanation checked for mathematical correctness and consistency with the exact stem/options.
- [ ] All 8 essay questions and every subpart captured in source order.
- [ ] Theory answer guides and mark allocations independently checked.
- [ ] Every table, graph or diagram checked against the official PDF; required figures recreated as original assets and linked to the correct question.
- [ ] Source numbering 1–50 persisted in `sort_order` and verified in the viewer.
- [ ] Duplicate/missing question checks pass.
- [ ] Final database counts and app display match the official source paper.

Until these gates are met, label Mathematics 2015 **in progress**, not complete.
