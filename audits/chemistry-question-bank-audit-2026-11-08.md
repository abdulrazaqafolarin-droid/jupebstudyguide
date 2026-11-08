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

## 2014 status — primary source still required

StudentFirst's public 2014 pages advertise 50 objective questions, 8 theory questions and 2 practical questions. Rutex stores 51 objective rows (48 visible, 3 hidden), only 3 theory rows, and 2 practical rows. The first three visible objective questions and the first theory prompt resemble the public preview, but this is limited corroboration only; it does not establish the complete official paper or grant permission to reproduce StudentFirst's content.

Additional defects found in the current 2014 records:
- Hidden objective Q12 has duplicate answer-choice text, so the item cannot be safely graded.
- Hidden objective Q36 depends on a missing chemical structure.
- Hidden objective Q50 has no option matching the scientifically correct increasing-acidity order.
- The three visible theory rows have no usable answer guides/explanations (the stored explanation field contains an import/AI failure message).
- Theory row 03 combines aluminium-extraction/ethanoic-acid material with alcohol/polymer/dipeptide subparts that also appear in the official 2015 Chemistry essay paper. This is a strong indication that content from different year papers has been merged or misattributed.

**2014 disposition:** keep the year open. Obtain an original or board-authorized 2014 paper, map each question to its true year/course/number, recover missing diagrams and complete answer guides. Do not fill the five-question theory gap by generating generic questions or copying StudentFirst.

## First source-verified year: 2015

Primary source: [JUPEB 2015 Chemistry — MCQ & Essay (official PDF)](https://jupeb.edu.ng/past_questions/2015%20Chemistry%20-%20MCQ%20%26%20Essay.pdf).

The official paper has 50 multiple-choice questions and eight essay questions. Rutex currently stores 50 objective records and six theory records.

### Objective paper
- Question 1's stem, four options and answer/explanation are aligned with the official paper; the neutral-solution calculation gives approximately (1.55 \\times 10^{-7}) M for both ions, matching option D.
- Question 12 is explicitly a graph-selection question about the mass of a copper cathode over time. The Rutex entry replaces the four graph choices with text descriptions and has no attached figure. The conceptual key (a straight line with positive slope under constant current) is plausible, but the actual original option graphics/layout must be restored or represented by a newly drawn, source-faithful diagram.
- Question 31's citric-acid condensed structural formula is represented in the Rutex stem; its answer of zero chiral centres is consistent with the two identical \\(-CH_2COOH\\) groups attached to the central carbon. This is a case where a clear formula can preserve the information without copying the page image.

### 2015 objective paper — first-pass item audit

All 50 rows were inspected in sequence against the official paper. The first-pass review is **not a clean pass**; the following need source-aware repair or explicit errata:

| Item | Finding | Required treatment |
|---|---|---|
| Q3 | The official paper lists 35.4 g Cu and 63.5 g mol⁻¹. Calculation gives about 3.36 × 10²³ atoms, but none of the listed choices is exact. In addition, the Rutex option A exponent is 10²³ while the official PDF prints 10²⁴. | Treat as a source-paper answer-choice defect plus a Rutex transcription defect. Do not silently key the nearest option; seek an authorized corrected paper or record an explicit erratum. |
| Q8 | Rutex key is B, while its explanation says the stronger metallic bond (option C) explains sodium's higher melting point. | Resolve the key/explanation conflict against the chemistry and source. C is the direct explanation, but preserve an audit note before changing the key. |
| Q10 | The official item asks for the number of equivalent sp² hybrid orbitals. Rutex changes this to the number of sigma bonds. Both lead to three, but the stem is no longer faithful. | Restore the official stem; keep the answer only after confirming options and explanation. |
| Q11 | The original refers to an underlined carbon in a displayed structure. Rutex substitutes a condensed butanoic-acid formula and verbalizes the alpha-carbon interpretation. | Confirm the marked atom against the original figure; restore a clear structure or faithful text representation. |
| Q12 | The official choices are four graphs. Rutex substitutes verbal descriptions and has no attached image. | Recreate the four graph choices from the authorized paper, test their rendering, and verify the key. |
| Q21 | Rutex's explanation says both CaCO₃ and Mg(OH)₂ precipitate, but only CaCO₃ appears among the choices. | Review for an ambiguous stem or incomplete options; correct only after the intended precipitate is established. |
| Q26 | Stored key is C, but the explanation says the dominant cause is the weaker H–I bond, which is option D. | Correct the key/explanation after an independent Hess-law/bond-energy check; do not leave the internal contradiction. |
| Q28 | The source wording says cryolite lowers the melting point of bauxite; the explanation correctly discusses dissolving alumina/lowering alumina's operating melt temperature. | Treat as an inherited source wording defect. Add a transparent chemistry correction (alumina, not raw bauxite) while retaining the original-paper transcription in the audit trail. |
| Q37 | The copied reaction is unbalanced: Na₂O₂ + 2H₂O should produce 2NaOH + H₂O₂. | Correct the equation with an erratum and retain the original wording in the source audit trail. |

Other checked examples (Q1, Q2, Q4–7, Q13–20, Q22–25, Q27, Q29–35, Q38–50) were broadly consistent on the first pass, but this is not a substitute for a second independent review. In particular, Q3's numerical defect and Q11–12's visual dependence mean the year must not be marked complete.

### Essay paper
Direct comparison shows a serious year/source-alignment defect:
- Rutex theory row 01 matches official essay question 1 on chemical equilibrium.
- Row 02 overlaps the hydrocarbon topic of official question 2 but diverges in details (including a different alkene in one reaction) and contains material not present in the corresponding official question.
- Rows 03–06 do not match the official paper's corresponding essay questions. For example, the official question 3 concerns precision/accuracy and nickel-concentration data, whereas Rutex row 03 concerns gas density and osmotic pressure. The official questions 4–6 also cover different material from the corresponding Rutex rows.
- Official questions 7 and 8, on a carboxylic-acid/esterification problem and electrolysis, are not represented as faithful, separately numbered Rutex theory entries.

**2015 disposition:** Do not add two generic theory rows or simply relabel the six existing entries. Quarantine the misaligned records from the 2015 paper view, rebuild the eight official essay prompts from the official source, and independently produce answer guides/mark schemes. Preserve the original row IDs and data in an audit trail until a reviewed migration is ready.

## 2019 status — official paper proves objective-year contamination

A primary source is available: [JUPEB June 2019 Chemistry — MCQ & Essay PDF](https://jupeb.edu.ng/past_questions/2019%20Chemistry%20-%20MCQ%20%26%20Essay.pdf). The paper identifies itself as June 2019 Chemistry SCI-J153, contains 50 objective questions and eight essay questions. The official past-question index lists a Chemistry MCQ & Essay paper for 2019, but no separate 2019 Chemistry practical paper in the year listing.

Rutex currently stores 51 objective records (49 visible), 8 theory records (7 visible) and 2 practical records. The objective sequence does **not** correspond to the official 2019 paper:
- Official 2019 Q1 is about precision in measurement; Rutex Q1 is a body-temperature water-ion calculation from the older question set.
- Official Q2 is about Bohr's atomic model; Rutex Q2 is a group/valence-electron question.
- Official Q3 asks which factor does not affect ionization energy; Rutex Q3 is the copper atom-count calculation from the 2015 set.
- Official Q4 is the ionization energy of gaseous lithium; Rutex Q4 is NaCl solution preparation.
- Official Q5 is the electronic configuration of Zn²⁺; Rutex Q5 asks the shape of PCl₃.
- The Rutex records around Q11–Q50 continue to repeat the 2015 question-bank sequence (for example the alpha-carbon question, copper electrorefining graph question, ideal-gas question, Solvay calculation, oxidation-state and isomerism items). A normalized exact-stem comparison found 15 exact matches between the Rutex 2019 and 2015 objective sets, with further near-identical/reformatted repeats.
- Official 2019 Q44 is an IUPAC naming task with a branched structural diagram, and Q50 is a reaction-product question with pictured alkene structures. Rutex Q44 is instead an Arrhenius-base question and Q50 is an isomerism question from the earlier bank. Neither has an attached image.
- Official Q12 is a diagonal-relationship question, while the Rutex Q12 is the old copper-electrorefining graph question and offers only text descriptions instead of the four plotted choices.
- The hidden Q6 record has duplicate/incomplete thorium choices. A replacement version exists at sort_order 51 rather than 6. Q8 is also hidden and has no explanation. These must not be treated as a complete 50-question set.

There is also a content defect within the old material that was carried into 2019:
- Q1's key is A (2.5 × 10⁻⁷), but the explanation computes 1.55 × 10⁻⁷ and identifies option D.
- Q3 computes about 3.36 × 10²³ atoms but accepts 3.27 × 10²³ as the approximate option, preserving the 2015 answer-choice problem.

Essay/theory section:
- The official 2019 essay paper has eight questions across CHM001–CHM004. Rutex theory-01 starts at subpart (a)(ii), omitting the first Bohr-postulate subpart of official question 1.
- Theory-02 matches official question 2; theory-03 matches official question 3; theory-04 matches official question 4; theory-05 matches official question 5.
- Theory-06 has a coordination-complex formula differing from the original: database A is `[Cr(NH₃)₄Cl₂]Br`, while the official paper gives `[Cr(NH₃)₄Cl]Br`. This changes the actual complex composition and must be corrected from source.
- The official question 7 is missing. It is a diagram-heavy organic chemistry item asking for carbon hybridization at labelled atoms, products in a propanone reaction scheme, structures of named compounds and possible structures of an alcohol/ketone pair.
- Theory-08 matches official question 8. Theory-07, currently hidden, duplicates theory-02 rather than supplying the missing official question 7.
- The theory records have no answer keys or worked explanations. No image asset exists for Q7's labelled structure and propanone reaction scheme.

Practical section:
- Two practical-category records exist in Rutex, but the 2019 official paper/index used for this year is titled MCQ & Essay. These practical records are therefore **not verified as 2019 official papers** and should not be presented as such unless a separate authorized 2019 practical paper is found.

**2019 disposition:** rebuild the objective paper from the official 2019 PDF, not by patching the reused 2015 list; recover/recreate Q44/Q50 and other diagram assets from authorized source material; correct Q1 answer/choice inconsistency; restore Q6 and Q8 with correct numbering; replace the duplicate theory-07 with official essay Q7; correct theory-06 formula; restore missing Q1 subpart; create and independently verify worked answer guides. No database rows have been changed.

## 2018 status — duplicated course blocks and mis-numbered replacement questions

StudentFirst's 2018 public index/preview advertises 50 objective questions, 8 theory questions and 2 practical tasks. No primary JUPEB 2018 Chemistry PDF was located in the official archive inspected during this audit, so this is a third-party coverage comparison pending the original paper.

The Rutex bank currently has 50 visible objective records, 12 visible theory records and 2 visible practical records. The 2018 objective records show several replacements kept after the 50-question sequence:
- The originals at positions 10, 17, 46 and 48 are hidden pending correction.
- Four visible replacement records exist at positions 51–54 rather than filling the original positions 10, 17, 46 and 48. This leaves the visible sequence mis-numbered and can make the year appear to exceed 50 questions.
- Q1–Q5 are broadly coherent on a first reading (copper electronic configuration, d-orbital quantum number, ionization energy, periodic trend, Lewis acid), and Q6–Q9 also have plausible answers/explanations.
- The original Q10 item asks oxygen's oxidation state in OF₂. Its stored key D (+1) is wrong: fluorine is −1, so oxygen is +2 (option A). It is appropriately hidden; its replacement currently lives at sort_order 51 and asks the oxidation state of sulphur in H₂SO₄.
- Q17, Q46 and Q48 are also replaced beyond the paper boundary; the ethanol oxidation question's original expected product must be read against the paper to decide whether ethanoic acid or a different oxidation product is intended. Replacements must be mapped back to their source question numbers, not appended as Q51–54.

Theory structure:
- There are 12 visible rows: eight rows named `chemistry-2018-theory-01…08` (all sort_order 0) plus four rows named `che-2018-t0001…t0004` (sort_order 1–4).
- The four `che-2018-t` records are course-group blocks (CHM 001–004) containing sequences of theory questions; their contents overlap the eight separately stored theory rows. For example, t0001 substantially repeats theory-01, t0002 repeats theory-03, t0003 overlaps theory-05/06 and t0004 overlaps theory-07/08. This is likely duplicate/alternative representation of the same paper, not evidence of 12 distinct official theory questions.
- Some separately stored rows are malformed/incomplete: theory-07 contains garbled text and mismatched fragments; theory-08 has corrupted formulas/garbled reaction content. These need to be reconciled against the course-block version and original paper.
- The course-block theory entries contain no worked answer guides; the eight split theory entries also have no explanation/answer-guide fields. Several questions need molecular structures/reaction drawings, yet no Chemistry image assets are attached.

Practical section:
- Two visible records broadly resemble the acid/base titration and mixed-salt qualitative analysis tasks.
- Both currently have `sort_order=0`, no worked answer guides and require checking against the full paper and observation/result tables.

**2018 disposition:** map the four replacement MCQs back to their original numbers and close numbering gaps only after source checks; choose one canonical theory representation (split questions or course blocks) to avoid duplicate display; quarantine malformed duplicates; and add validated answer guides and original-source diagrams. Do not mark complete from counts alone. No database rows have been changed.

## 2017 status — widespread stem/option/explanation and category mismatches

The public 2017 StudentFirst previews show 50 objective questions, 8 theory questions and 2 practical questions. No 2017 Chemistry paper was available from the official JUPEB archive page inspected here, so use this only as a cross-check pending an original/authorized paper.

Rutex stores 52 objective rows (48 visible), 10 theory rows and 3 practical rows. A first-pass check of objective Q1–Q10 found:
- Q1 asks about Bohr's atomic model, but its explanation discusses the mass of an electron.
- Q2 asks for boron electron quantum numbers; its spin-option values are truncated and its explanation discusses atomic number instead.
- Q3 asks for sodium's electronic configuration but its options are the answer choices for the mass of a carbon-dioxide molecule.
- Q4 asks for the atomic mass of a triatomic gas from vapour density; the stored answer C (32) is plausible, but its explanation is about the maximum electron capacity of the third shell.
- Q5 asks for the process of making hydrogen from red-hot coke and steam; its explanation discusses isotopes and its stored answer needs source review.
- Q7 asks for phenolphthalein's colour in acid, but its explanation is about covalent bonding.
- Q10 asks for a valid quantum-number combination, but its explanation is about electrical conductivity of ionic compounds.

Some 2017 objectives (for example Q6, Q8 and Q9) appear internally coherent, but that does not rescue the paper as a whole. The first ten are enough to prove that structural checks can pass while the visible content is scientifically mismatched.

Theory/practical records also need rebuilding:
- There are ten current theory-category rows rather than the public index's eight. The first three theory topics visible on StudentFirst (quantum/atomic ideas and pH titration; P/S ionization energies and buffers; water/methane intermolecular forces and gas mixtures) do not match the first three Rutex theory rows, which instead cover generic pH/buffers, ammonia equilibrium and environmental pollution.
- Current theory entries have no answer guides/explanations, and most use `sort_order = 0`.
- One separation-of-sand-and-sodium-chloride task is categorized as theory, while three practical-category records include general atom structure and polymerization prompts. The two tasks shown in the public 2017 practical preview (carbonate titration and a mixed-salt qualitative analysis) are not represented by those Rutex practical entries.
- Theory prompts involving organic reaction schemes and structure identification require image/diagram support, but the Chemistry bank has no attached images.

**2017 disposition:** do not label the current year set as a verified JUPEB past paper. Quarantine confirmed mismatched objective rows, obtain the original paper, rebuild all three paper sections and their numbering, and only then create answer guides and restore reviewed rows. No database rows have been changed.

## 2016 status — visible cross-year options contamination

The public 2016 StudentFirst previews are useful for checking paper coverage and sequence: 50 objective questions, 8 theory questions and 2 practical questions. The official JUPEB archive page inspected in this audit does not currently expose a 2016 Chemistry paper, so this remains **third-party corroboration pending a primary source**.

The live Rutex inventory has 50 objective rows, 8 theory rows and 3 practical rows. A first-pass comparison found:
- Objective Q1 and Q2 agree with the publicly previewed question topics and have plausible answer choices.
- Objective Q3 asks about the helium cation, but its four stored options are copper-atom counts copied from the 2015 copper calculation question. Its key A therefore does not answer the helium question.
- Objective Q4 asks for the shape of PF₅, but its four stored options are the 2015 NaCl-solution preparation choices. Its key C does not answer the PF₅ question.
- The two contaminated option sets pass the structural four-choice check, illustrating why semantic/source matching is required.

Theory records:
- All eight current theory rows have `sort_order = 0`, no answer guide and no explanation. This is insufficient to show an exam-style sequence or worked answers.
- Topic matching to the public preview suggests the intended 2016 paper order is: theory-03, theory-08, theory-06, theory-07, theory-01, theory-02, theory-04, theory-05. This is only a provisional mapping; confirm against the original paper before writing new order values.
- The current theory-08 record omits a requested molecular-formula subpart; theory-05 omits the final aspirin-conversion task from the public preview, which is structure/image-dependent. Theory-04 includes structure-identification tasks without attached images.

Practical records:
- Rutex has three practical entries, while the public 2016 index shows two. Two Rutex rows broadly resemble the displayed titration and qualitative-analysis tasks. The additional copper(II) sulfate crystal-preparation item has no source match yet and must not be labelled as a 2016 official question without proof.
- Practical records also lack worked answer guidance and require a source/layout review.

**2016 disposition:** quarantine Q3 and Q4 from student practice until the original options are recovered; obtain a primary source; restore exact theory numbering/order and missing subparts/figures; source-check the extra practical record. No database rows have been changed.

## Objective numbering and ordering anomalies

A separate SQL check of `sort_order` found anomalies that a simple visible-count comparison cannot detect:
- 2014 has a visible objective record numbered 51.
- 2017 has two visible records both numbered 51.
- 2018 has visible objective records numbered 51–54.
- 2019 has a visible record numbered 51.
- 2020 has objective records numbered 51–55 and no rows at sort numbers 8 and 33 within the expected 1–50 sequence.
- 2021 has a visible record with sort number 0, two visible records numbered 50, and records numbered 51–57.
- 2023 has a visible record numbered 51.
- 2024 has visible records numbered 51 and 52.

These are **record/order anomalies**, not proof that the original papers had that many MCQs. Some rows may be replacement, duplicate, supplementary or misassigned material. Because the client sorts by `sort_order`, ties and zero/out-of-range values can affect students' question sequence. For each year, map every database record to the original paper's printed question number before deciding whether to retain, re-number, hide or merge it.

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
