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

## 2023 status — coverage largely populated, but answer/numbering QA still fails

StudentFirst's 2023 public Chemistry index displays 50 objective, 8 theory and 2 practical questions. Its public objective preview's first three prompts align with Rutex's first three objective stems. Its theory preview also aligns with the Rutex 2023 topics on calcium chloride empirical formula, periodic law, combustion enthalpy and coordination compounds. This is useful coverage corroboration, but no primary JUPEB 2023 PDF was found in the official archive page inspected here; do not treat a third-party preview as a permissioned source or official certification.

Rutex holds 51 objective records (50 visible, 1 hidden), 8 theory records (all visible) and 2 practical records (both visible).
- A flagged objective Q26 is hidden because the source compound name is invalid/corrupted; a replacement question about chiral centres in 3,4-dibromohexane is appended as sort_order 51. That is a replacement candidate, not a properly numbered Q26, until confirmed against the paper.
- Q6 has a clear key/explanation contradiction. It asks which of three statements is *not possible*. The explanation says I and II are not possible and III is possible, which corresponds to option A (I and II only), but the stored key is D (III only). This is a definite answer-key defect.
- Q23 says "a system that is operated at constant heat" is adiabatic. Adiabatic means no heat is exchanged with surroundings, not "constant heat"; the stem is technically malformed and needs the original wording.
- Q50's IUPAC naming question needs correction. For the displayed structure CH₃–CH(CH₃)–C≡C–CH₂Cl, numbering from the CH₂Cl end gives the lower alkyne locant; the listed keyed name D uses a higher alkyne locant. Rebuild the stem/options/name against the actual paper.
- The eight theory and two practical prompts have no usable answer key/worked explanation fields. All are sort_order 0, so the original paper sequence is not represented in database order. Organic theory Q7 includes a reaction scheme but there is no attached image.
- The two practical entries (alkaline-earth hydroxide titration and qualitative analysis of a two-salt mixture) are plausible and correspond to StudentFirst's displayed practical category, but cannot yet be certified against a board source; both need complete observation/inference and calculation guides.

**2023 disposition:** fix Q6's key, restore the original Q23 wording, recalculate Q50's IUPAC name/options, map the Q26 replacement to its true printed number and source, and add source-verified answers, diagrams and proper question ordering. No database rows have been changed.

## 2024 status — objective order is not the paper order; practical paper is incomplete

StudentFirst's 2024 public index advertises 50 objective, 8 theory and 2 practical questions. Its public objective preview begins with (1) a molecular bond-angle item, (2) the electronegativity trend, and (3) the electron de Broglie wavelength. Rutex stores the bond-angle item at sort_order 34, while Rutex sort_order 1 is the preview's second question and sort_order 2 is the preview's third. This is direct evidence that the objective records are not in true printed paper order. The primary 2024 JUPEB paper was not located in the official JUPEB archive page inspected here.

Rutex inventory: 52 objective rows (50 visible, 2 hidden), 12 theory rows (8 visible, 4 hidden), and only 2 practical rows (1 visible, 1 hidden).
- Objective Q25 is an incomplete/corrupted compound-only prompt with incomplete options. Objective Q30 has placeholder structure options and unrelated distractors. Both have been hidden.
- Two replacement questions are appended as sort_order 51 and 52: one about geometrical-isomer pairs and one about the stereoisomer count for 2,3-dibromobutanoic acid. They appear to be repair candidates for the missing/corrupted objective questions but are not restored to original positions or yet verified against the official paper.
- The Q3 de Broglie item has the right numerical result, but its options are reordered from StudentFirst's public preview (the 3.64 pm correct value is option A in the preview and option C in Rutex). The Rutex key is internally remapped to C, but it is not a faithful options-order transcription.
- Eight visible theory records appear to contain the eight essay prompts, but all have sort_order 0 and no answer guides. Four hidden course-group records are answer/working copies overlapping those questions; they should not be exposed as four additional independent theory questions.
- StudentFirst displays two practical questions, but Rutex contains only one visible practical prompt: quantitative analysis with sodium carbonate and an acid. The second row is a hidden answer/worked copy of that same task, not a separate qualitative-analysis practical question. Therefore the second practical paper is missing from Rutex's visible bank.

**2024 disposition:** restore the bond-angle item to Q1 and map all objective questions to printed numbering; reconcile/replace Q25 and Q30; retain exact option order or document any intentional shuffle; choose canonical theory prompts and keep worked solutions in the answer field rather than duplicate rows; find and transcribe the missing practical Q2 from an authorized original. No database rows have been changed.

## 2025 status — one confirmed wrong answer key, hidden items and source-order concerns

StudentFirst's 2025 public index advertises 50 objective questions, 2 practical questions and a theory paper shown as 32 questions/subparts. Its public objective preview starts with a bonding question about ammonium, then the relative-error question, then a balancing equation for ammonia oxidation. Rutex starts with the relative-error question and places the ammonia balancing question at sort_order 5; the public preview's first question is not present among Rutex's first 15 objective items. This is an order/coverage discrepancy to reconcile against an authorized source. The official JUPEB archive page inspected here did not list a 2025 paper.

Rutex inventory: 50 objective rows (47 visible, 3 hidden), 12 theory rows (8 visible, 4 hidden), and 3 practical rows (2 visible, 1 hidden).
- Q9 asks which ionic compound is insoluble in water. The stored key is B (KNO₃), but KNO₃ is soluble; the explanation itself says AgCl is the insoluble exception (option C). This is a definite answer-key defect.
- Q7 asks which reaction converts an alkyl halide into an alcohol. The options include both "substitution" and "hydrolysis"; hydrolysis is a type of nucleophilic substitution, so the single-answer design is ambiguous unless the wording or choices are tightened.
- Q19 is hidden because two answer choices are duplicated and the item is malformed.
- Q24 is hidden due option/content quality concerns.
- Q30 duplicates the synthesis-gas question already present at Q15 and is hidden; it does not replace a genuinely missing item.
- Eight visible theory prompts are stored separately; four hidden course-group records overlap the same CHM 001–004 material and include draft answer text. These should be reconciled into one canonical question representation with answers stored separately. StudentFirst's "32 theory questions" may count subparts rather than eight top-level essays; use the paper's printed numbering to resolve that count rather than treating the two numbers as directly contradictory.
- Two practical prompts are visible: a weak-acid/NaOH titration and a qualitative analysis using an inorganic salt and zinc dust. A hidden third row is a worked copy of the quantitative analysis prompt, not a third practical question. No validated answer/observation guides are attached.

**2025 disposition:** correct Q9 to C after a second independent check, rewrite Q7 to remove the substitution/hydrolysis ambiguity, rebuild or replace Q19/Q24, remove the duplicate Q30 while ensuring the authentic question 30 is present, align the objective sequence to the original paper, reconstruct a paper-numbered theory/practical set, and provide reviewed worked guides. No database rows have been changed.

## 2026 status — advertised externally, absent internally, source still unverified

StudentFirst's public index advertises three 2026 Chemistry papers: 50 objective, 2 practical and a theory paper shown as 32 questions/subparts. The Rutex production database has **zero Chemistry records** for 2026, and the repository's study-year configuration currently ends at 2025. No 2026 Chemistry paper was found in the official JUPEB archive page inspected during this audit.

Do not add 2026 to the selectable year list or import third-party preview content merely to make the index look complete. Obtain an original or authorized 2026 paper, confirm the examination year/session and full question structure, then build and review its MCQ, theory and practical entries from that primary source.

## 2022 status — answer-key/explanation conflicts and duplicate MCQ

The official JUPEB archive lists Chemistry MCQ & Essay and Chemistry Practical under 2022, but both the MCQ/essay PDF and practical PDF links currently return 404. This year is therefore **source-pending**; the live records can be audited for internal chemistry correctness, but exact transcription and printed numbering cannot yet be certified against the original papers.

Rutex inventory: 50 objective records (49 visible, 1 hidden), 8 theory records (all visible), 2 practical records (both visible). The theory and practical records all have sort_order 0, and no Chemistry image assets are attached.

### Objective first-pass findings
- Q1 asks what information is obtained from a mass-spectrometer spectrum. The options include "mass/charge ratio" (B) and "atomic mass ratio" (C). The key is C, but the explanation says the instrument measures mass-to-charge ratio (m/z). The key should be B unless the original stem asks a different quantity; the current explanation/key conflict is not acceptable.
- Q4 treats "ounce" as a mass unit, but ounce can also denote a fluid-volume unit. The option is ambiguous without specifying avoirdupois ounce versus fluid ounce.
- Q6's written prompt describes only peaks at m/z 70 (~70%) and 78 (~20%), while its calculation uses an additional m/z 75 isotope at 10%. That third peak/abundance is missing from the stem and no image is attached.
- Q9 says atomic radius and ionization energy follow the same trend, claiming both decrease across a period and increase down a group. This is incorrect: atomic radius generally decreases across and increases down; first ionization energy generally increases across and decreases down. Its explanation then describes the correct ionization-energy direction, contradicting the stem.
- Q11 contains an equilibrium equation and ΔH value but no clear interrogative instruction in the stored stem. The answer options suggest a shift/Le Châtelier question, but the exact ask must be recovered.
- Q40 (hidden) and Q46 (visible) are the same nitrogen partial-pressure question. Q40 has key C (0.98 atm), although its own calculation gives 0.225 atm and option A (0.23 atm); Q46 is the corrected duplicate with key A. Keep one source-mapped record at the correct printed number.
- Q42 asks for the "kinetics order" of acetyl chloride reacting with ethanol based only on its equation. The explanation infers second order merely because two reactants appear in the equation. A rate law/order cannot generally be determined from a net stoichiometric equation alone without kinetic evidence or a stated mechanism; the question needs correction or supporting data.
- Q48 combines two distinct prompts: formation of an N-nitrosamine from a secondary amine and classification of the hydroxyl group in quinine. Q49 then asks the quinine hydroxyl classification again. This duplicates a sub-question and makes Q48's answer ambiguous.
- Q2, Q3, Q5, Q7, Q8, Q10, Q12, Q13 and several later items have plausible chemistry/keys on this first pass; that is not proof of fidelity to the 2022 paper.

### Theory and practical
- Eight theory records exist and are all visible, but all are sort_order 0 and none has a worked answer guide/explanation.
- Several theory prompts depend on reaction schemes/structures (notably the toluene reaction scheme and organic transformations); no referenced diagram or image is attached.
- The two practical records contain a sodium carbonate/HCl quantitative titration and a mixed-inorganic-salt qualitative analysis. They are plausible JUPEB practical tasks but cannot be certified against the official 2022 practical while its source link is broken. Both lack full validated observation/inference and calculation guides.

**2022 disposition:** resolve Q1's key, restore the missing mass-spectrum information in Q6, correct the periodic-trend statement in Q9, recover Q11's missing instruction, deduplicate Q40/Q46, reject or properly source the rate-law question Q42, separate Q48/Q49, restore the original objective/theory numbering and source figures, and complete answer guides. Keep paper-level verification open until an official/authorized source is obtained. No database rows have been changed.

## 2021 status — corrupted source fields, appended replacements and duplicate theory blocks

The official JUPEB archive lists both 2021 Chemistry MCQ & Essay and Chemistry Practical papers. The archive's MCQ/essay link could not be retrieved reliably in this session, and the practical link currently returns 404, so original-paper content verification remains pending.

Rutex inventory: 59 objective rows (50 visible, 9 hidden), 8 theory rows (6 visible, 2 hidden), and 2 practical rows (both visible).

### Objective questions
The first visible questions Q1–Q6 have plausible stems, options and keys on a first chemistry pass: precision/repeatability, Rutherford scattering, Brønsted–Lowry acid, hydrogen isotopes, standard solution and CCl₄ polarity. However, the next items reveal source-extraction defects:
- Q7 has an unreadable/missing d-subshell exponent in the electronic configuration. Its explanation says the period remains 4, but the exact stem should be restored from the paper.
- Q10 option C contains an incomplete `2p^{?}` configuration. The current correct key A is not affected, but the set is not a faithful four-option transcription.
- Nine objective originals are explicitly flagged as unusable because a diagram, compound, formula or options are missing: IDs ending 019, 023, 034, 036, 038, 042, 045, 047 and 050.
- Nine replacement questions have been appended after the normal Q1–Q50 order (sort_order 50–57, with two replacements sharing sort_order 50). These cover activation energy, radical-chain initiation, coordination number, an alkyne acid name, C₄H₁₀/C₅H₁₂ isomer counts, a cobalt complex and counter-ion counting.
- The appended rows may be useful repairs, but they are not assigned consistently to the original printed question slots. At least one substitution changes the actual prompt (the hidden original asks a radical-chain propagation step, while a replacement asks for the initiation step). The correct paper number and original wording must be confirmed before reordering or restoring any row.

The Chemistry table has no image assets, so the graph, compound structures and coordination complexes referenced by several flagged questions are not preserved.

### Theory/essay questions
- Eight theory records exist, but only six are visible.
- Theory-01 is hidden and overlaps the van der Waals SO₂ question in theory-03; theory-03 is the more complete version.
- Theory-08 is hidden; it contains an organic-reaction/products task and several structure-writing prompts that must be source-checked before reconstruction.
- All theory rows use sort_order 0, so their original paper sequence is not preserved.
- No visible theory question has an answer key or worked explanation. Theory questions with missing organic structures require source diagrams or clear redrawn structural formulas.

### Practical questions
Rutex has two practical records: a mixed NaHCO₃/Na₂CO₃ quantitative titration and a three-salt qualitative analysis. The official archive lists a 2021 practical paper, but its current download link returns 404; therefore these two records are plausible but **not yet source-verified**. They have no worked observation/inference guides and both use sort_order 0.

**2021 disposition:** keep the nine flagged originals hidden until the original PDF is obtained; map all nine appended corrections to the authentic question numbers and verify that no prompt has been changed; remove/reconcile the duplicate Van der Waals theory record; rebuild a properly ordered theory set and answer guide; and retrieve the official practical source before marking either practical question verified. No database rows have been changed.

## 2020 status — practical paper source-aligned; theory fragmented; MCQ verification pending

Primary sources are listed in the official JUPEB archive: [2020 Chemistry MCQ & Essay](https://jupeb.edu.ng/past_questions/2020%20Chemistry%20-%20MCQ%20%26%20Essay.pdf) and [2020 Chemistry Practical](https://jupeb.edu.ng/past_questions/2020%20Chemistry%20-%20Practical.pdf). The practical PDF was visually reviewed from its original pages. The MCQ/essay PDF is listed by JUPEB, but its text and page image could not be retrieved reliably in this session, so no claim of full year-by-year MCQ/essay matching is made yet.

### Practical paper
The two Rutex 2020 practical entries match the two official practical tasks:
1. Quantitative analysis: sodium carbonate hydrate (Na₂CO₃·nH₂O) solution titrated with 0.10 mol dm⁻³ nitric acid; students calculate titre-based moles/concentration and hydration number.
2. Qualitative analysis: identify functional groups in three liquid organic samples using 2,4-DNPH, Tollens', dichromate/NaHCO₃ and iodine/NaOH tests, then write structures for three-carbon samples.

This is a positive source-alignment finding. However, both Rutex practical records have sort_order 0 and lack worked answer/observation guides. Build a complete observation/inference/result guide from chemistry principles and the official paper, and order these as practical questions 1 and 2 after the source mapping is confirmed.

### Objective inventory and first-pass QA
Rutex has 53 objective records (49 visible) with two missing sort_order positions in the expected 1–50 sequence (8 and 33). Several replacement records are appended at positions 51–55:
- Hidden originals for questions 14, 24 and 30 have corrected-looking replacement records at 53, 54 and 55 respectively. They must be mapped back to their original paper positions after validating the full stems/options/keys.
- A branched-chain-isomer question appears twice: one visible record at sort_order 51 and one hidden duplicate at 52. It must be deduplicated and assigned the true printed question number.
- The first-pass visible items Q2–Q5, Q7, Q8–Q13 have plausible explanations/keys on chemistry grounds, but still require full source comparison.
- Q1 option C is grammatically corrupted ("equal unequal number of protons"); repair only after comparing with the source. Its stored key D and explanation identify the Brønsted–Lowry/Lewis distinction.
- Q6's key/explanation is not reliable: option D says spectator ions form insoluble salts, while the explanation itself says the reacting ions form the precipitate and spectator ions remain in solution. The current choices may not contain a valid statement; resolve from the original paper rather than retaining D.
- Q13 includes an option rendered only as "BF", which appears incomplete and needs checking against the source.
- Several hidden objective items have missing answer keys/explanations; do not unhide them solely because replacement rows exist elsewhere in the table.

### Theory/essay inventory
The year contains 30 theory-category records, only 7 visible and 23 hidden. The records include a mixture of complete-looking question stems, standalone continuations/subparts, answer fragments, and alternative versions of the same material:
- A visible question begins with an unexplained phase-change prompt about a substance Z and an isotope/redox section; confirm whether any referenced phase diagram/data was lost.
- A fuel-cell/thermochemistry/radioactive-decay question is split across visible theory-03 and theory-09.
- A gas-mixture calculation is split across theory-10 and hidden theory-11.
- Several hidden rows (theory-15 through theory-22 and theory-23 through theory-30) contain answer fragments or continuations rather than independently numbered full exam questions.
- The pentanone/iodoform task appears in alternative hidden versions (theory-02 and theory-08) with worked answer content. These are not a substitute for the original question stem and should be reconciled into one canonical source-linked record.
- No visible theory entry has a usable answer key or explanation field, and several organic/decay tasks require structures/schemes not currently attached.

**2020 disposition:** preserve the two source-aligned practical questions but add verified worked guides and correct sequence order; rebuild the essay question set from the official source and reconstruct its fragments into a canonical set rather than exposing random pieces; validate objective Q6, repair text/option defects, move verified replacements into the original question slots, resolve missing questions 8 and 33, and remove the branched-isomer duplicate. MCQ/essay source matching remains pending until the official PDF can be read. No database rows have been changed.

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
