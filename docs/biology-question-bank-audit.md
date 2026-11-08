# Biology Past-Question Bank Audit

**Status:** Initial audit; no question-bank or production database rows changed.  
**Repository:** `abdulrazaqafolarin-droid/jupebstudyguide`  
**Database inspected:** Supabase project `jupeb` (`gzyczowqqywesqhqqpdi`)  
**Audit date:** 2026-11-08  
**Pilot year:** 2015

## 1. Audit rules

A past question is not verified merely because it has a stem, four options, an answer letter and an explanation. A question is considered ready only after these checks:

1. **Paper fidelity:** year, paper type, question number, stem, option wording and option order match an authoritative copy of the examination paper. Preserve the original question; any editorial clarification must be separately identified.
2. **Answer validity:** the keyed option is independently checked against established Biology knowledge and, where available, an official JUPEB answer key. A scientifically ambiguous or outdated question must be flagged rather than forced into a single answer.
3. **Explanation quality:** the explanation addresses the exact question, explains why the keyed answer is correct, and does not introduce unsupported claims.
4. **Diagram integrity:** every referenced figure is present, legible, correctly associated with the question and has labels that agree with the stem/options. Do not replace a missing source diagram with an unrelated image.
5. **Numbering and completeness:** objective question positions are checked against the paper's true numbering. Theory sub-parts, marks, practical tasks and section instructions are checked independently.
6. **Provenance:** keep a record of source paper, page/question reference, verification status, reviewer/date and unresolved issues. Do not publish or commit private scans, paywalled copies, or extracted source-paper text.

### Source hierarchy

- **Primary:** original JUPEB examination papers and official answer keys, when available.
- **Cross-check:** StudentFirst's public year/paper index, question numbering and public previews. It is a comparison source, not proof that a year or paper does not exist.
- **Subject verification:** reliable academic and professional references, used to investigate disputed scientific claims.
- **Missing diagrams:** use an authorized original diagram or create a clearly marked original teaching diagram; do not copy restricted images without permission.

## 2. Current Biology database coverage

Live database inspection found Biology question records for 2015–2024 only. There are no Biology rows for 2025 or 2026 in the inspected project.

| Year | Visible objective | Hidden objective | Visible theory | Visible practical | Visible objective positions missing from 1–50 |
|---:|---:|---:|---:|---|
| 2015 | 50 | 0 | 8 | 0 | None |
| 2016 | 48 | 2 | 8 | 0 | 48, 49 |
| 2017 | 48 | 3 | 8 | 0 | 2, 12, 14 |
| 2018 | 50 | 0 | 8 | 0 | None |
| 2019 | 48 | 2 | 8 | 0 | 31, 42 |
| 2020 | 39 | 6 | 8 | 0 | 32, 34, 35, 38, 40, 41, 42, 43, 44, 45, 46, 47 |
| 2021 | 48 | 6 | 7 | 0 | 10, 24, 37, 43, 45 |
| 2022 | 50 | 2 | 7 | 0 | 2, 25 |
| 2023 | 49 | 2 | 8 | 0 | 29, 30, 44 |
| 2024 | 42 | 8 | 8 | 0 | 28, 32, 34, 35, 38, 39, 43, 49 |
| 2025 | 0 | 0 | 0 | 0 | No Biology rows |
| 2026 | 0 | 0 | 0 | 0 | No Biology rows |

Across the 2015–2024 baseline, 472 objective records are visible, versus 500 positions if each year has 50 questions. This is a **visible-coverage difference**, not a claim that 28 source questions are definitively absent: hidden records, duplicate sort positions and replacement records need individual reconciliation.

Additional ordering anomalies:
- 2020 has two visible records with `sort_order = 39`.
- Visible replacement records sit beyond question 50 in 2017 (51), 2021 (51, 52, 54), 2022 (51, 52) and 2023 (51, 52).
- 2020 has a particularly large visible-position gap and must be rebuilt against the original paper, not filled by guessing.

The app's `STUDY_YEARS` constant currently covers 2014–2025, so 2026 also requires a separate UI/year-range review before adding that year.

## 3. Database structure checks

For the 472 visible Biology objective records, after correctly parsing the legacy JSON-string option values:
- all 472 have four options;
- all have four distinct labels and four distinct option texts;
- all have an answer label that matches one of A–D;
- all have a non-empty explanation.

These are **field-shape checks only**. They do not establish that the source stem/options/key/explanation are correct.

The `options` JSONB column has mixed encoding: 463 visible records store a JSON array encoded as a JSON string, while 9 store a native JSON array. The application currently parses both formats. This should be standardized carefully in a future data migration, after tests confirm that every consumer supports the normalized representation.

The inspected `study_questions` schema has no dedicated source URL, source-page reference, verification status or hidden-reason column. Consequently, the reason for some hidden records cannot be recovered from the row itself. Keep an auditable issue log until provenance/status fields are designed.

## 4. Pilot-year audit: Biology 2015

### Coverage

The database has all 50 objective sort positions (1–50) and 8 theory records. StudentFirst's public Biology index lists 2015 Objective (50 questions) and Theory (8 questions). The official JUPEB archive has an official 2015 Biology MCQ and Essay paper.

### Confirmed paper-fidelity defects

Cross-checking database rows against the official JUPEB 2015 Biology paper identified:

| Question | Database defect | Required correction / disposition |
|---:|---|---|
| 13 | Stem is in the right position, but the options are from Question 15 (dormancy). | Restore the four options from official Q13 and preserve their A–D order. Reconfirm key D (Synecology). |
| 21 | Options B and C are swapped relative to the official paper. | Restore the paper's order; key A remains Aquatic. |
| 23 | Stem is in the right position, but the options are from Question 25 (Alexander Fleming). | Restore Q23's neuron-component options; key A is soma, dendrites and axon. |
| 25 | Stem says “Antibodies were discovered”; official paper says “Antibiotic discovery”. | Restore the official stem. Key B (Alexander Fleming) then matches the actual question. |
| 28 | Options are from Question 30 (plant divisions), not the Leucosolenia question. | Restore the official sponge-class options; key A is Calcispongiae. |
| 32 | Options are not in the paper's order; the database key D follows its altered order. | Restore original order (Iron, Copper, Calcium, Sulphur) and set key B (Copper). |
| 41 | Options are from Question 43 (cell inclusions), not the Cnidaria question. | Restore the official options; key B (Cephalisation) is the intended exception. |
| 42 | “Cryptogams” is misspelled “Crytogams”. | Correct spelling while preserving the intended option order and key D. |

Other minor transcription/normalization differences (for example Q7, Q9, Q20, Q22 and Q29) should be reconciled against the paper in the final exact-text pass. Do not silently rewrite the historic item.

### Scientific/assessment issues requiring explicit treatment

| Question | Finding | Disposition |
|---:|---|---|
| 40 | The paper asks for an example of an all-purpose bacterial culture medium and includes both nutrient agar and tryptic soy agar. ATCC describes nutrient agar as general-purpose; BD's Difco/BBL manual explicitly includes Tryptic/Trypticase Soy Agar among general-purpose media. | The item has more than one defensible answer in standard microbiology. Do not silently treat D as an invalid distractor. Preserve the source wording, flag it as ambiguous, and decide whether to mark it unscored or retain an officially documented expected answer with an ambiguity note. |
| 50 | The current key says Streptococcus is the exception. A peer-reviewed review lists Streptococcus among genera repeatedly found in healthy human stomachs (along with Lactobacillus and Staphylococcus). | Current explanation/key is not independently supported by contemporary evidence. Mark for source-key and syllabus-context review; do not present the explanation as a settled scientific fact. |
| Theory 4 | The official paper asks candidates to define four terms, including “Immunity”. The database version omits the fourth term but still shows the same 4-mark allocation. | Restore the missing “Immunity” sub-part. Verify all eight theory questions and their course/mark labels against the paper. |

### Official-paper cross-check

The official 2015 paper confirms the MCQ order and options for Questions 13, 21, 23, 25, 28, 32 and 41–42, and the full wording of Theory Question 4. The official PDF's question text is the primary reference for these corrections.

## 5. Known hidden Biology records to reconcile

The existing repository flag log and the live database both contain hidden Biology rows. Their current state should be reconciled before any item is restored or a replacement is assigned.

| Year | Hidden positions / records | Known reason or outstanding check |
|---:|---|---|
| 2016 | 48, 49 | Both stems refer to labelled structures; original diagram is absent. Recover the correct diagram and recheck both linked questions. |
| 2017 | 2, 12, 14 | Q2 missing butterfly-pupa diagram; Q12 has a wrong stem/options/key conflict; Q14 image exists but explanation is missing. |
| 2019 | 31, 42 | Q31 refers to an absent diagram; Q42 has duplicate option text. |
| 2020 | 40, 43–47 | Q40 has duplicate/placeholder options. Q43–47 have complete-looking fields but are hidden; inspect audit history/replacement mapping before any restoration. |
| 2021 | 10, 24, 37, 43, 45, plus replacement `r03` | Ambiguous taxonomy question; missing glycolysis statements; duplicate photosynthesis distractor; Q43 duplicates the keyed answer text; Q45 has missing statements; `r03` is a replacement record beyond Q50 and is itself hidden. |
| 2022 | 2, 25 | Duplicate pathogen options; both Hydra and Lumbricus can have hydrostatic skeletons. |
| 2023 | 29, 44 | DNA/mRNA strand-orientation ambiguity; multiple options can describe medusa. |
| 2024 | 28, 32, 34, 35, 38, 39, 43, 49 | Hidden reasons are not recorded in the database; recover the source paper and inspect every item before restoring. |

Do not unhide these rows merely because they have four options and an explanation. Do not treat a generated replacement as an original past-paper question unless its provenance clearly says it is an authored replacement.

## 6. Practical-paper coverage discrepancy

The live Biology database has no visible practical records for any year from 2015–2024. The official JUPEB archive lists separate Biology Practical papers for 2020, 2021 and 2022, while StudentFirst currently shows practical papers for 2022 onward. This confirms that at least some practical coverage is missing from the live bank and that StudentFirst's index is not the only source to consult.

The practical archive must be audited as a separate paper type, including specimen list, task numbering, marks, diagrams, and any safety/handling instructions.

## 7. Year-by-year completion gates

A year is not “complete” until all of the following are true:
- The authoritative paper set for that year and each paper type is known, or its absence is explicitly marked **not verified**.
- Objective positions are reconciled against the source numbering; no unexplained gaps, collisions or orphan questions remain.
- All objective stems and A–D options match the paper; answer letters are recalculated after option-order checks.
- Each answer key is validated independently; ambiguous, outdated or malformed source questions are marked as such, not silently repaired.
- Each explanation has been checked against the exact question and corrected key.
- Theory question numbering, every sub-part, course label and mark allocation match the source.
- Practical tasks, specimens, diagrams and labels are checked against the original paper.
- Every image reference resolves to the intended figure and has appropriate usage rights.
- The import/QA validation passes, a reviewer records the outcome, and production changes are only made from a verified correction set.

**2015 is the pilot year.** The current bank is not yet cleared for a “complete and verified” status. Finish the 2015 objective and theory reconciliation first, then proceed chronologically to 2016 and onward. Do not begin another subject until Biology's year/paper inventory and verification gates are completed.

## 8. Sources consulted

- Official JUPEB Past Questions archive: https://jupeb.edu.ng/questions
- Official JUPEB 2015 Biology MCQ and Essay PDF: https://jupeb.edu.ng/questions/8bb10530-6383-440c-a482-4abc33bdd40d/download
- StudentFirst Biology past-question index: https://studentfirst.ng/jupeb/biology
- StudentFirst Biology 2015 Objective: https://studentfirst.ng/jupeb/biology/2015/objective
- StudentFirst Biology 2015 Theory: https://studentfirst.ng/jupeb/biology/2015/theory
- ATCC bacteriology culture guide (nutrient agar described as general-purpose): https://www.atcc.org/resources/culture-guides/bacteriology-culture-guide
- BD Difco/BBL manual (Tryptic/Trypticase Soy Agar identified as a general-purpose medium): https://static.bd.com/assets/product/Documents/Integrated%20Diagnostic%20Solutions%20%28IDS%29/DS_CM_Difco-and-BBL-culture-media-manual_UG_EN.pdf
- FEMS Microbiology Reviews, “Survival in hostile territory: the microbiota of the stomach”: https://academic.oup.com/femsre/article/37/5/736/542661
- Review in PMC, “Interactions between H. pylori and the Gastric Microbiome”: https://pmc.ncbi.nlm.nih.gov/articles/PMC8186273/

## Change-control note

This document records inspection findings only. No production database rows were updated, no hidden questions were restored, no source PDFs/images were copied into the repository, and no production deployment was triggered.


## 9. Further 2015 scientific review and data-model blockers

A second pass over the stored explanations found more issues that were invisible to the initial field-shape check:

| Question | Additional finding | Required disposition |
|---:|---|---|
| 32 | The original paper's ordering makes Copper option B, not D. More importantly, Iron is also an essential trace element; the current options include both Iron and Copper. | Correct the option order and retain the key only if an official JUPEB key or clearly defined syllabus context resolves the intended classification. Otherwise mark as ambiguous/unscored. |
| 40 | Both Nutrient Agar and Tryptic Soy Agar are used as general-purpose media. ATCC identifies Nutrient Agar as general-purpose; the BD Difco/BBL manual identifies Tryptic/Trypticase Soy Agar as a general-purpose medium. | Keep the source question but do not treat D as an unequivocally wrong distractor. Require official answer-key evidence or mark ambiguous/unscored. |
| 43 | Starch grains are non-living inclusions, but a cell wall is also a non-living structure. The current explanation incorrectly describes the cell wall as a living/actively functional cell component. | Do not grade as a single-answer item until the source or official key resolves the ambiguity. Rewrite the explanation only after the disposition is decided. |
| 44 | The current explanation calls both generations “sexual phases”. In plant alternation of generations, the haploid gametophyte produces gametes; the diploid sporophyte produces spores. The stem's option “two sexual pathways” is not a sound description of this life cycle. | Correct the scientific explanation and flag the original item wording as ambiguous; do not silently rewrite the original paper. |
| 50 | The current explanation says Streptococcus is not part of the stomach microbiota. Reviews document Streptococcus among genera repeatedly detected in healthy human stomach samples. | The stored key/explanation is not supported by current evidence. Do not present A as a settled scientific answer; check the source key and historical syllabus context, or mark the item ambiguous/outdated. |

Evidence for these findings:
- Canada's public-health technical document explicitly identifies iron as a trace element: https://www.canada.ca/en/health-canada/services/publications/healthy-living/guidelines-canadian-drinking-water-quality-guideline-technical-document-iron.html
- The National Research Council describes both iron and copper as trace elements: https://www.ncbi.nlm.nih.gov/books/NBK218751/
- Plant alternation of generations is a haploid gametophyte that produces gametes and a diploid sporophyte that produces spores: https://openstax.org/books/biology/pages/11-2-sexual-reproduction
- The BD Difco/BBL manual describes Tryptic/Trypticase Soy Agar as a general-purpose medium: https://static.bd.com/assets/product/Documents/Integrated%20Diagnostic%20Solutions%20%28IDS%29/DS_CM_Difco-and-BBL-culture-media-manual_UG_EN.pdf
- A review of the human stomach microbiota lists Streptococcus among genera repeatedly found in healthy stomach samples: https://academic.oup.com/femsre/article/37/5/736/542661

### Theory and practical answer-guide storage limitation

The 2015 Theory paper has eight questions, but the live `study_questions` table cannot currently store theory answer guides or mark schemes. The inspected database schema contains no `answer_guide`, `mark_scheme` or `total_marks` columns. Although the TypeScript `StudyQuestion` type declares `answerGuide`, `markScheme` and `totalMarks`, the row mapper and its SELECT list do not load these fields.

Likewise, the database table does not contain the structured practical fields represented in the TypeScript type (apparatus, procedure, observations and practical sub-questions). So simply importing practical papers or adding theory solutions to JSON will not make those fields persist or render through the current database-backed loader.

**Architecture work required before filling these content gaps:**
- design a backward-compatible migration for theory answer guides, mark schemes and total marks;
- design structured storage for practical title/objective/apparatus/procedure/observations/sub-questions and marks;
- update the row mapper, SELECT list, write/admin service and viewer so each field is persisted, fetched and displayed;
- add tests for old rows with null new fields and for all three categories;
- only then import verified theory/practical solutions.

No schema changes have been applied. This is a design blocker to resolve before attempting to make the theory/practical archive complete.


### Additional 2015 answer/explanation checks

The detailed explanation pass also requires these Biology-specific corrections or flags before 2015 can be called verified:

- **Q32 – trace element:** the source paper orders Copper as B, but the database currently places Copper at D. After restoring source order, the answer letter would change to B. However, Iron is also formally classified as an essential trace element, so the item has two defensible options under a general biological/nutritional interpretation. See the National Research Council's trace-element chapter (https://www.ncbi.nlm.nih.gov/books/NBK218751/) and Health Canada's technical document (https://www.canada.ca/en/health-canada/services/publications/healthy-living/guidelines-canadian-drinking-water-quality-guideline-technical-document-iron.html).
- **Q43 – non-living cell components:** the answer key selects starch grains, but the explanation incorrectly treats the cell wall as living. A cell wall is non-living material, so option D is also defensible. The original item needs an official key/context check or an explicit ambiguity disposition.
- **Q44 – alternation of generations:** the explanation needs to distinguish the haploid gametophyte (gamete-producing) from the diploid sporophyte (spore-producing). The existing explanation calls both generations sexual phases, which is inaccurate. OpenStax's plant-life-cycle explanation provides the correct distinction: https://openstax.org/books/biology/pages/11-2-sexual-reproduction.
- **Q50 – stomach microbiota:** the stored explanation's claim that Streptococcus is absent is not sustainable as a general statement. Modern reviews identify Streptococcus among bacteria repeatedly detected in human gastric samples. The original question's “except” framing should be reviewed before scoring.

Do not treat a letter transposition or restoring the official A–D order as sufficient to clear a question when the science itself leaves more than one plausible answer.

### Official answer-key availability

The official 2015 JUPEB PDF inspected for this pilot contains the objective paper and essay questions, not a published answer key. Therefore, answer keys in our database must be independently validated and must not be described as “official JUPEB answers” without a separate source. StudentFirst's public preview confirms the first three 2015 objective items and advertises solutions for signed-in users, but the gated solutions were not used or copied during this audit.
