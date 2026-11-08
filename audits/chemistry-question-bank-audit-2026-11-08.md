# Chemistry past-question bank audit baseline

**Audit date:** 2026-11-08  
**Scope:** Chemistry only; read-only inspection of the live question bank and repository.  
**Status:** Baseline audit in progress. No live question rows modified and no production deployment made.

## Source policy

StudentFirst was used as a **coverage cross-check**, not as a source from which to copy question text, answer explanations, diagrams or images. Its Terms of Use limit use of its resources to personal study and prohibit republication/distribution or creating a competing question library without permission. Its own site also cautions that its learning resources can be incomplete, adapted or different from official materials.

Use this source hierarchy for every repair:
1. Original JUPEB paper or a board-authorized copy for the exact question, numbering, options, layout and figures.
2. An official answer key, where available.
3. Independent subject-matter solution and a second check for the answer/explanation when no official key exists.
4. StudentFirst and other third-party platforms only as discovery/corroboration aids, not as permission to reproduce their content.

For any required illustration, restore it from an authorized original paper or create a fresh, faithful diagram from the official source. Do not download/reuse StudentFirst's protected image files unless permission is obtained.

## Live data inventory

The Rutex app's current question loader fetches visible rows from Supabase `public.study_questions`; generated `output/chemistry.ts` / JSON files are not the live runtime source.

| Metric | Chemistry |
|---|---:|
| Total database records | 773 |
| Currently visible | 704 |
| Hidden pending source/quality review | 69 |
| Visible objective records | 590 |
| Visible Chemistry records with `image_url` | 0 |
| Chemistry records for 2026 | 0 |

The 69 hidden records must not be indiscriminately restored. Existing audit notes indicate they include incomplete stems, duplicated choices, malformed structures, questionable answer keys and theory/practical content awaiting source reconciliation.

### Year and category inventory

Each cell is **visible / total records stored**. The counts are database inventory only; they do not prove that the correct original paper content is present.

| Year | Objective | Theory | Practical |
|---|---:|---:|---:|
| 2014 | 48 / 51 | 3 / 3 | 2 / 2 |
| 2015 | 50 / 50 | 6 / 6 | 0 / 0 |
| 2016 | 50 / 50 | 8 / 8 | 3 / 3 |
| 2017 | 48 / 52 | 10 / 10 | 3 / 3 |
| 2018 | 50 / 54 | 12 / 12 | 2 / 2 |
| 2019 | 49 / 51 | 7 / 8 | 2 / 2 |
| 2020 | 49 / 53 | 7 / 30 | 2 / 2 |
| 2021 | 50 / 59 | 6 / 8 | 2 / 2 |
| 2022 | 49 / 50 | 8 / 8 | 2 / 2 |
| 2023 | 50 / 51 | 8 / 8 | 2 / 2 |
| 2024 | 50 / 52 | 8 / 12 | 1 / 2 |
| 2025 | 47 / 50 | 8 / 12 | 2 / 3 |
| 2026 | 0 / 0 | 0 / 0 | 0 / 0 |

StudentFirst's public Chemistry index advertises 2014–2026. Its displayed objective-paper count is 50 questions; its theory display is generally 8 questions for older years and 32 for 2025–2026; 2015 is listed without a practical paper. Treat those figures as a **comparison signal**, not official confirmation of the JUPEB paper structure. In particular, the 2020 database has 30 theory records (23 hidden), so its rows need to be reconciled to the paper's actual top-level numbering rather than compared as a simple count.

## Structural QA of visible objective questions

A read-only SQL check parsed legacy options stored as JSON strings and tested the 590 visible Chemistry objective records for:
- exactly four option entries;
- distinct option labels;
- a `correct_answer` label that exists among those options; and
- a non-empty explanation.

All 590 passed those structural checks. This **does not** certify that the stems are faithful transcriptions, that the scientific answer is correct, or that the explanation is valid. Each question still needs comparison with its source and an independent solution check. Hidden rows include four 2020 objective records that fail key/option or explanation checks and require source review before restoration.

## First source-verified year: 2015

Primary source: [JUPEB 2015 Chemistry — MCQ & Essay (official PDF)](https://jupeb.edu.ng/past_questions/2015%20Chemistry%20-%20MCQ%20%26%20Essay.pdf).

The official paper has 50 multiple-choice questions and eight essay questions. Rutex currently stores 50 objective records and six theory records.

### Objective paper
- Question 1's stem, four options and answer/explanation are aligned with the official paper; the neutral-solution calculation gives approximately (1.55 \\times 10^{-7}) M for both ions, matching option D.
- Question 12 is explicitly a graph-selection question about the mass of a copper cathode over time. The Rutex entry replaces the four graph choices with text descriptions and has no attached figure. The conceptual key (a straight line with positive slope under constant current) is plausible, but the actual original option graphics/layout must be restored or represented by a newly drawn, source-faithful diagram.
- Question 31's citric-acid condensed structural formula is represented in the Rutex stem; its answer of zero chiral centres is consistent with the two identical \\(-CH_2COOH\\) groups attached to the central carbon. This is a case where a clear formula can preserve the information without copying the page image.

### Essay paper
Direct comparison shows a serious year/source-alignment defect:
- Rutex theory row 01 matches official essay question 1 on chemical equilibrium.
- Row 02 overlaps the hydrocarbon topic of official question 2 but diverges in details (including a different alkene in one reaction) and contains material not present in the corresponding official question.
- Rows 03–06 do not match the official paper's corresponding essay questions. For example, the official question 3 concerns precision/accuracy and nickel-concentration data, whereas Rutex row 03 concerns gas density and osmotic pressure. The official questions 4–6 also cover different material from the corresponding Rutex rows.
- Official questions 7 and 8, on a carboxylic-acid/esterification problem and electrolysis, are not represented as faithful, separately numbered Rutex theory entries.

**2015 disposition:** Do not add two generic theory rows or simply relabel the six existing entries. Quarantine the misaligned records from the 2015 paper view, rebuild the eight official essay prompts from the official source, and independently produce answer guides/mark schemes. Preserve the original row IDs and data in an audit trail until a reviewed migration is ready.

## Repository/runtime findings

- `src/data/study-questions/index.ts` reads `study_questions` from Supabase, excludes `hidden = true`, and has a fixed year list ending at 2025.
- `src/types/study-questions.ts` also defines the years as 2014–2025. Both need a controlled update when a verified 2026 paper has been added; exposing an empty year prematurely would be misleading.
- `output/chemistry.ts` is an auto-generated export reporting 465 questions and includes 2025 records with `correctAnswer: "TBD"` and empty explanations. Do not import/deploy this export as a verified question bank.
- `scripts/import-questions.mjs` creates empty answers and explanations and has a simplified text parser; it is not safe for a direct production question-bank import without a redesigned validation/review flow.
- No Chemistry database row currently has an attached `image_url`.

## Next work sequence

1. Finish 2015: reconcile all 50 MCQs and eight essay questions against the official PDF; restore the graph-based options for MCQ 12; independently verify every key and explanation; review the two current missing theory prompts and quarantine misattributed rows.
2. Audit 2014 next, but mark it **primary-source pending** until an original/authorized 2014 paper is found. Do not infer its missing questions from StudentFirst.
3. Proceed chronologically through 2016–2026. For each year, record source file/link, paper sections, official numbering, question count, option count, figures, answer provenance, independent calculation/check, and review status.
4. Only import reviewed batches through a staging/branch workflow. Run structural validation, paper-number continuity checks, duplicate detection, image-link checks, answer verification and representative UI tests before any production data change.
5. After Chemistry is fully reconciled, apply the same process to Mathematics, Physics and Biology.

## Sources

- StudentFirst Chemistry index: https://studentfirst.ng/jupeb/chemistry
- StudentFirst Terms of Use: https://studentfirst.ng/terms/
- JUPEB official past-question repository: https://jupeb.edu.ng/questions
- JUPEB 2015 Chemistry source PDF: https://jupeb.edu.ng/past_questions/2015%20Chemistry%20-%20MCQ%20%26%20Essay.pdf
