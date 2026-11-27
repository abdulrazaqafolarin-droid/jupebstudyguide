# Rutex JAMB — release state

**Checked:** 18 November 2026  
**Repository:** `abdulrazaqafolarin-droid/jupebstudyguide`  
**Pull request:** [#78 — Add a separate JAMB study workspace](https://github.com/abdulrazaqafolarin-droid/jupebstudyguide/pull/78)  
**Feature branch:** `feat/rutex-jamb-workspace`  
**Supabase project:** `gzyczowqqywesqhqqpdi` (existing Rutex/JUPEB project)

## Release boundary

PR #78 remains open as a **Draft**. JAMB is a separate workspace in the existing Rutex application and account system. Production UI remains on `main`; the feature branch is for Preview acceptance only.

The `VITE_ENABLE_JAMB=true` environment variable is scoped to the `feat/rutex-jamb-workspace` Preview branch in both connected Vercel projects (`rutexjupebmaster` and `jupebstudyguide`). No Production-scoped JAMB flag was added. The latest checked Production deployments for both projects still use `main` commit `fd61595f0a88dccd557e977a8a8f2fa56c968822`; no Production UI deployment was performed for this feature.

## Implemented and deployed

- Dedicated JAMB home, past-question browser, timed subject-practice CBT, JAMB-aware AI tutor, syllabus status page and admin source import/review/publish UI.
- Programme scoping for question reads/search/RAG, answer references, bookmarks and practice progress; existing JUPEB question retrieval remains scoped to JUPEB.
- Additive migration `20261117215633_create_jamb_workspace` is applied to the existing Supabase project. The migration passed a rollback-only SQL preflight first.
- Additive migration `20261118123742_scope_ai_chat_history_by_exam_program` is also applied. It adds the programme discriminator to persistent AI chat history, defaults existing rows to JUPEB, adds a foreign key to the exam-program registry and adds a programme-scoped index.
- Five remote-only historical migration sources were restored verbatim, reconciling local migration history through `20261112011529`.
- Server-owned CBT attempt lifecycle, answer persistence, expiry and scoring. In-progress snapshots omit answer keys and explanations. Post-submit review is owner-authenticated and exposes only independently approved keys/explanations.
- Source intake preserves original hashes, question/source references, options and figure placeholders. The importer does not synthesize answers, discard E options or publish automatically.

### Live Edge Function deployment

All six relevant functions are `ACTIVE` on the existing project. The Preview backend prerequisites are now deployed and verified:

| Function | Live version | Gateway `verify_jwt` |
|---|---:|---|
| `exam-attempts` | **v5** | false |
| `exam-practice` | v2 | false |
| `question-import` | **v3** | false |
| `ai-tutor` | v101 | false |
| `chat-proxy` | v132 | false |
| `question-rag-index` | v4 | false |

- `exam-attempts` v5 adds the owner-filtered JAMB history action. It returns terminal attempt summaries for the authenticated owner only; it does not return question snapshots or answer keys.
- `question-import` v3 enables protocol v2 resumable source chunks, stable item offsets and conflict-safe duplicate retries.
- Both functions retain `verify_jwt=false` because their handlers independently validate the Bearer token with Supabase Auth and check the active device session. Import also checks administrator status. Do not remove those checks or treat the gateway setting as authentication.

**Authentication detail:** gateway JWT verification is disabled for these functions, so security depends on their in-handler checks. The deployed handlers validate Bearer tokens with Supabase Auth; the exam endpoints also enforce active study access; question import additionally requires an administrator; the embedding worker checks administrator status; and the AI endpoints apply the shared AI-access guard. Do not remove these checks or assume the gateway setting authenticates requests by itself.

## Live database verification

Read-only checks on 18 November 2026 confirmed:

- JUPEB question rows: **3,227**; visible published JUPEB rows: **2,984**.
- JAMB question rows: **0**; JAMB import batches: **0**.
- JAMB subjects: Physics, Chemistry and Biology available; Use of English compulsory but unavailable; Mathematics unavailable.
- The published `rutex-practice-v1` configuration permits 10/20/40-question subject drills. `official_format_verified=false` and `full_mock_enabled=false`.
- No JAMB source material has been staged or published. Existing JUPEB rows were not relabelled.
- Persistent AI chat history: **321** existing rows are still scoped to `jupeb`; **0** rows are scoped to `jamb`; **0** unexpected programme values exist. The new schema default preserved all existing JUPEB records.

### Access-control checks

The nine server-owned answer-key, import, syllabus, configuration and CBT tables have RLS enabled and grant table privileges only to `service_role`; they have no direct `anon` or `authenticated` grants and no student-facing policies. The exam-program registry has an authenticated, active-session read policy. Bookmarks and progress use authenticated owner policies with active-session checks, and their write checks require the referenced visible/published question to match the same exam programme.

This is the deliberate server-mediated access model. Do not add direct student table grants to the server-owned tables as a shortcut.

## Source-pack intake state

The committed Physics, Chemistry and Biology source files parse to **4,669 candidates**:

| Source | Candidate blocks |
|---|---:|
| Physics | 896 |
| Chemistry | 1,940 |
| Biology | 1,833 |
| **Total** | **4,669** |

These remain source candidates, not approved questions. The files do not contain a verified answer-key/solution set. The importer leaves answers and explanations blank; historical A–E options and diagram placeholders are preserved. All three packs remain unpublished and have not been staged in the live database.

Before staging, an authorised administrator must attest to the right to store/use the source material. Every question must then be reviewed for source year, wording, option order, duplicates and original figure. Questions without a reliable key may be approved as ungraded; a scored key/explanation requires independent verification.

## Validation and build state

On code commit `7a55bd2818281529fc8470fefc65da201fd0c647`:

- **Validate pull requests** passed (workflow run `44302994787`), including TypeScript, unit tests, lint, web build, Capacitor sync and Android debug APK compilation.
- **JUPEB Repository Validation** passed (workflow run `44302994884`).
- **Native iOS build** passed end-to-end (workflow run `44302994786`), including simulator app build, bundle-identity verification, install, launch and screenshot.
- The separate **Rutex Master Next artifact-only** workflow passed (run `44302995092`). No updater release was published; its publication step was skipped.

Since the application-code build previously validated above, the feature branch has added JAMB offline-sync reconciliation tests, ordered answer writes, bookmark deletion tombstones, stable/idempotent source-import chunks and resume-from-existing-batch behavior. These changes are committed but still require final CI on the latest source head. As of source head `bc5c9290b2e1ed0419d5710db40043157db7d603`, PR validation, repository validation and iOS validation are running; the current Android debug build is not yet complete. The two Vercel Preview checks remain blocked by the connected account's daily build-rate limit, so no fresh Preview was produced for these latest commits. No signed-in student/admin walkthrough has been completed.


## Feature-branch parity completion — 18 November 2026

Current implementation head: `fb7078ce235ba0bcb9960db7c8dbacaed2da6683`.

- Added JAMB-only daily missions and expandable mission history. Question sets are frozen per mission, can be resumed, and are checked through the JAMB-only practice endpoint. Correct options/explanations are shown only when returned by the approved JAMB answer-key service.
- Added daily-mission achievement milestones and JAMB CBT result analytics, including average/best score, seven-day score trend, subject breakdown and recent owned attempts.
- Added an owner-only JAMB CBT `history` action to `exam-attempts`. It returns only the signed-in user's submitted/expired JAMB attempt summaries, never answer keys or question snapshots. The handler is deployed as `exam-attempts` v5.
- Added `20261118182508_create_jamb_daily_missions.sql` and `20261118182636_tighten_jamb_daily_missions_grants.sql`. Both are applied to the shared project. The table has RLS enabled, one owner-and-active-session policy, no `anon` or `PUBLIC` table grants, and only SELECT/INSERT/UPDATE/DELETE for `authenticated`. It contains zero rows at rollout; no question content is stored there. Mission history now has its cloud table rather than relying on local-only fallback.
- JAMB Chat, Friends, Discover and Profile now have route aliases that preserve JAMB context across shared social/account screens. Public-profile dialogs hide JUPEB badges on those routes; Discover does not call the JUPEB weekly leaderboard; Profile displays a JAMB achievements link and hides JUPEB activation-code prompts.
- The JAMB syllabus topic catalogue, syllabus-led 30-day mission lessons, full official UTME mock and ranked leaderboard remain gated by their stated content/scoring prerequisites.

## Validation on the parity-completion head

All four GitHub Actions workflows completed successfully on `fb7078ce235ba0bcb9960db7c8dbacaed2da6683`:

- Pull request validation: run `44334358930` — **success** (TypeScript, unit tests, lint, web build, Capacitor sync and Android debug APK).
- Repository validation: run `44334358896` — **success**.
- Native iOS build: run `44334359043` — **success**, including simulator app build, identity verification, install, launch and screenshot.
- Artifact-only successor Android build: run `44334359022` — **success**. Artifact `rutex-master-next-327` (ID `14441171686`) was uploaded; the updater publication step was skipped.

Both Vercel Preview checks on that head failed with the connected account's daily `build-rate-limit`, not an application build error. No fresh Preview or signed-in student/admin walkthrough is available. The PR remains Draft and no Production deployment, live migration, Edge Function release, question publication or updater release was performed.

## Latest feature-branch hardening — 18 November 2026

- Persistent AI tutor history is now programme-scoped in the live database. Migration `20261118123742_scope_ai_chat_history_by_exam_program` is recorded with that exact hosted version; all 321 legacy chat rows remain JUPEB.
- JAMB local-first progress uses timestamp reconciliation, retries on reconnect/focus/visible, serializes sync operations per account and queues rapid same-question writes. New unit tests cover reconciliation edge cases.
- JAMB bookmarks retain per-user deletion tombstones until remote removal is confirmed; re-adding during an in-flight removal is restored to the cloud rather than lost.
- Admin source imports now resume by original source hash and stable item offsets. The deployed `question-import` v3 handler uses the unique batch/item key to ignore duplicate chunk retries and recalculates review counters. Source rights and human review are still mandatory; no batches have been staged.

## Post-migration advisor review

The Supabase advisor scan after the chat-history migration reported existing project-wide findings, including RLS-enabled server-only tables without student policies (intentional for service-role access), one pre-existing security-definer view, older public-schema function warnings and unrelated legacy index/policy performance notices. No unrelated policy, function or view changes were made as part of this JAMB migration. The new chat-history index is expected to appear unused until programme-specific chat traffic exercises it.

## Remaining release gates

1. Complete the signed-in mobile Preview walkthrough with a real student and authorised administrator. A successful unauthenticated HTTP 200 from the SPA shell is not a substitute for testing authenticated student/admin journeys.
2. Stage the three source packs only after source-rights attestation. Review and approve every item before publication; do not guess missing answer keys or explanations.
3. Verify and version the current official JAMB syllabus and load reviewed Use of English content before enabling a full official-format UTME mock. Until then, the 10/20/40 sessions must remain clearly labelled Rutex practice drills.
4. Keep PR #78 in Draft and Production UI disabled until the remaining acceptance gates and release review are complete.

**No Production UI deployment, JAMB source publication or updater-release publication was performed during this continuation.** The two additive database migrations and six Edge Function deployments described above remain live on the existing connected Supabase project.


## Preview backend readiness — 18 November 2026

- JAMB daily mission schema is live on `gzyczowqqywesqhqqpdi`. Supabase migration history records `20261118182508/create_jamb_daily_missions` and `20261118182636/tighten_jamb_daily_missions_grants`. Post-migration verification confirms RLS enabled, exactly one authenticated owner/session policy, no anonymous table privileges, authenticated CRUD limited to SELECT/INSERT/UPDATE/DELETE, and zero existing mission rows.
- `exam-attempts` is deployed at v5 and `question-import` at v3. Both continue to authenticate in-handler and check the active session; importing additionally requires an administrator.
- The latest branch head `89a08d1cf17498df4778a4a70f6b2c220588f9e0` is still Draft. The previous privacy-test commit passed PR validation and repository validation, including unit tests, Deno checks, lint, web build and Android debug compilation. The new migration-history commit has fresh CI running.
- Vercel Preview checks for the migration-history commit are rate-limited on both connected projects. This is a deployment quota issue, not an application test failure. No Production-scoped JAMB feature flag or Production UI deployment was made.
- The official JAMB IBASS eligibility checker currently shows English Language selected by default for UTME combinations. Five owner-uploaded syllabus source copies have been extracted and a candidate five-subject catalogue is now in the JAMB feature branch. These uploaded copies are not yet reconciled line-by-line with the current IBASS sources; the Physics and Use of English copies differ from the IBASS PDFs checked in this review. The catalogue is deliberately marked unverified and cannot unlock the official full mock. JAMB's 2027 Test Manual page lists a manual updated 23 September 2026, but its linked manual download returned 404 when checked on 18 November 2026. The official full-mock configuration therefore remains disabled.
- There are still zero JAMB question rows and zero import batches. No Physics/Chemistry/Biology source pack has been staged, rights-attested, reviewed or published.

Official references checked: [JAMB IBASS eligibility checker](https://eligibility.jamb.gov.ng/), [Physics syllabus](https://ibass.jamb.gov.ng/assets/uploads/Physics.pdf), [Biology syllabus](https://ibass.jamb.gov.ng/assets/uploads/Biology.pdf), [Use of English syllabus](https://ibass.jamb.gov.ng/assets/uploads/Use-of-English.pdf), and [2027 JAMB Test Manual listing](https://www.jamb.gov.ng/News/PDFs/2027/2027_JAMB_Test_Manual).


## Uploaded JAMB syllabus intake — 18 November 2026

The owner committed five additional PDF source copies to `main` in commit `e1d9b81b82be717567f47972c39a6ce702bf6b92`: Biology, Chemistry, Mathematics, Physics and Use of English. The feature branch adds a repeatable PDF extraction workflow and the source-preserving review pack is available as GitHub Actions artifact `jamb-syllabus-source-extraction` (artifact ID `14467187615`, run `44388332808`). Extraction succeeded for all five documents; all pages contain extractable text, page previews were rendered and table cells were retained where detectable.

| Subject | PDF pages | Extracted text characters |
| --- | ---: | ---: |
| Physics | 20 | 40,104 |
| Chemistry | 16 | 32,179 |
| Biology | 12 | 27,042 |
| Mathematics | 6 | 10,770 |
| Use of English | 5 | 6,155 |

The PDF metadata identifies the uploaded copies as 2025-created files. The uploaded Physics and Use of English copies differ materially from the JAMB-hosted PDFs checked during this review. Chemistry and Mathematics have since received a top-level structure check against current IBASS-derived indexed transcriptions dated 24 October 2026: the Chemistry copy matches the listed 18 topic headings/order, and the Mathematics copy matches the five sections and 23 topic headings/order. The current JAMB-hosted assets are https://ibass.jamb.gov.ng/static/media/Chemistry.9efd0b98043d56922aaa.pdf and https://ibass.jamb.gov.ng/static/media/Mathematics.c0621f4b8b674e75fd05.pdf. The direct PDF endpoints could not be fetched during the 19 November review, so this is not a page-by-page objective verification.

The JAMB syllabus page now has a structured five-subject outline catalogue with **106 topic entries**, including compulsory Use of English and Mathematics. It deliberately keeps `JAMB_SYLLABUS_VERIFIED=false`. All 106 topics now have mapped objective lists. However, objective wording has not yet been reconciled line-by-line against directly retrieved current IBASS PDFs for every subject. The full official UTME mock remains disabled. Mathematics and Use of English remain unavailable in the JAMB question bank.

Topic progress now uses a JAMB-only, per-account local namespace plus cloud reconciliation through `exam_user_syllabus_progress`. The live table has owner/active-session RLS, authenticated-only CRUD grants and no anonymous access. Local progress remains available offline and retries sync on reconnect/focus/visibility. The existing shared JUPEB syllabus progress key and JUPEB syllabus page are unchanged.


## JAMB syllabus progress cloud sync — 18 November 2026

The live shared Supabase project `gzyczowqqywesqhqqpdi` has migration `20261118210924/create_exam_user_syllabus_progress` applied. The table stores one state per (user, JAMB programme, topic), allows only `not_started`, `in_progress` or `completed`, and is protected by RLS requiring both account ownership and an active auth session. Post-deploy SQL verification confirms RLS enabled, exactly one policy, authenticated SELECT/INSERT/UPDATE/DELETE privileges, no anonymous SELECT/INSERT privileges, and zero rows at rollout. The matching migration source is committed in `supabase/migrations/20261118210924_create_exam_user_syllabus_progress.sql`.

The JAMB topic tracker is now local-first with timestamp reconciliation to the cloud table. On login/refresh, local and remote progress are merged using the latest update time; local-only/newer entries are upserted. Online, focus and visibility events retry reconciliation. JUPEB continues using its existing syllabus progress key/table path. The app generated Supabase database types include the new progress table. No student rows were created by the deployment verification.


## JAMB topic progress and tutor-thread follow-up — 18 November 2026

The JAMB topic-progress hook now starts cloud reconciliation immediately after every local topic-state change, rather than waiting for the next focus/reconnect event. Concurrent sync triggers are coalesced; the hook reads the freshest local snapshot after the cloud read and retries if a change occurred during an in-flight request. Local updates remain available offline and reconnect/focus/visibility listeners retry failed syncs. Equal-timestamp conflicts use a deterministic state priority so two devices do not continually overwrite each other.

The JAMB tutor now selects its latest conversation by the requested programme, subject and syllabus topic when opened from a topic link. If no matching topic thread exists, it creates one with the topic metadata. Subject-only entries select that subject's untethered thread or create one. Switching a stored thread restores its selected subject/topic context; social Chat remains a shared account feature across workspaces. The shared Chat and Profile destinations are covered by workspace-path regression tests; JAMB Profile links to JAMB-specific achievements rather than displaying the JUPEB achievement set.


## Current IBASS source reconciliation — Use of English

On 18 November 2026, the JAMB-hosted [Use of English IBASS PDF](https://ibass.jamb.gov.ng/assets/uploads/Use-of-English.pdf) was opened and compared with the uploaded `Use of English.pdf` candidate source. The uploaded copy adds a separate five-question summary passage, allocates five rather than ten questions to its reading text, omits the named reading text and homonyms, and differs on punctuation/spelling and oral-form coverage. The JAMB-hosted PDF specifies two passages (one cloze), names *The Lekki Headmaster* by Kabir Alabi Garba, includes homonyms and punctuation/spelling, and lists monothongs and diphthongs. Its examination structure totals 60 questions with the section breakdown now represented in the catalogue.

The JAMB catalogue follows the JAMB-hosted IBASS PDF for Use of English and retains the uploaded PDF hash/link as the originally supplied candidate file. Chemistry and Mathematics now link to their current JAMB IBASS assets; indexed current-syllabus transcriptions match the uploaded copies' top-level topic structure (18 Chemistry topics and 23 Mathematics topics). Direct retrieval of those two PDFs failed during this review, so detailed subtopic/objective reconciliation remains open. Physics and Biology follow current IBASS topic structures, but complete topic-to-objective wording is still under review. None of these checks certifies a 2027-specific syllabus: the IBASS assets do not print an applicable exam year.


### Full-page source review previews

The syllabus PDF extractor now renders a page preview for every page rather than only the first four pages, and records preview_page_count plus the preview scale in the manifest. The extractor unit test uses multi-page fixtures and asserts that all pages receive preview images. This supports full visual review of syllabus tables and later sections before a source revision is accepted.


## Complete topic learning-objective transcription — 18 November 2026

All **106 catalogue topics** now include a per-topic "Candidates should be able to" objective list: Physics 39 topics, Chemistry 18, Biology 23, Mathematics 23 and Use of English 3. This pass maps exactly **426 objective statements** from the submitted 2025 source PDFs and the JAMB-hosted IBASS Use of English PDF; the earlier provisional 431 count is superseded after the Biology Biotechnology topic was merged into Heredity. Topic source-page references are retained. A regression test checks all five subject counts and fails if any topic lacks objectives.

The distinction between catalogue completeness and current-source approval remains important. Use of English follows the JAMB-hosted IBASS PDF checked on 18 November 2026. Physics follows the 39-topic IBASS structure; Biology follows the current 23-topic, five-section structure. Chemistry and Mathematics match current IBASS-derived top-level listings (18 and 23 topics respectively), but the direct PDFs could not be retrieved during the 19 November review and complete subtopic/objective reconciliation remains pending. The catalogue remains unverified for the applicable 2027 examination cycle, and the full UTME mock remains disabled.


## Official-source correction — Physics and Use of English

As of 19 November 2026, the JAMB-hosted Physics IBASS PDF is represented in the catalogue as 39 ordered topics. It includes Work, Energy and Power at topic 6 before Friction, has Electricity Through Liquids and Gases at topic 37, and includes optical fibre under Refraction rather than a standalone fibre/laser topic. The uploaded 2025 `Physics-1.pdf` remains a separate candidate source pack, not the source of the current official topic order.

The JAMB-hosted Use of English IBASS PDF is represented separately from the uploaded copy and specifies one comprehension passage (5 questions), one cloze passage (10) and one reading text (10), with 60 questions total. It names *The Lekki Headmaster* and includes homonyms and punctuation/spelling, which differ from the uploaded 2025 PDF.


## Official-source correction — Biology section and topic structure

The current JAMB-hosted [Biology IBASS PDF](https://ibass.jamb.gov.ng/assets/uploads/Biology.pdf), checked on 19 November 2026, contains five sections with topic counts **3 / 9 / 7 / 2 / 2**: Variety of Organisms, Form and Functions, Ecology, Heredity and Variations, and Evolution. This yields **23 Biology topics**. The uploaded 2025 copy presents Biotechnology as a separate topic; the current IBASS syllabus places biotechnology applications (including GMO, gene therapy, biosafety and recombinant DNA) within Heredity. The catalogue now merges that material into the Heredity topic and uses printed-page references 27–38. The supplied PDF remains checksum-recorded for provenance; this does not certify a 2027 edition.


The current structured catalogue contains exactly **426 learning-objective statements** across the 106 topic entries. The regression test asserts the exact statement count and checks that every topic has at least one objective.

 
## Chemistry and Mathematics top-level IBASS check — 19 November 2026

The current IBASS Chemistry asset is [Chemistry.pdf](https://ibass.jamb.gov.ng/static/media/Chemistry.9efd0b98043d56922aaa.pdf). Current IBASS-derived indexed syllabus transcriptions last verified 24 October 2026 list the same 18 top-level headings in the same order as the uploaded `Chemistry-1.pdf`, including Environmental Pollution, Chemistry and Industry, and Astronomical Chemistry. The catalogue's "Chemical Equilibria" label normalises the source PDF heading's typographical form, "Chemical Equilibra".

The current IBASS Mathematics asset is [Mathematics.pdf](https://ibass.jamb.gov.ng/static/media/Mathematics.c0621f4b8b674e75fd05.pdf). Current IBASS-derived indexed transcriptions last verified 24 October 2026 list the same five sections and 23 topic headings in the same order as the uploaded `Mathematics.pdf`.

Both uploaded PDFs were extracted and all page previews were produced in CI. The Chemistry and Mathematics previews were visually checked, including Chemistry's final topic page and the Mathematics section transitions. Direct requests to both JAMB-hosted PDF endpoints returned cache errors during this review, so these findings verify the top-level heading/section structure through independent indexed transcriptions, not every subtopic, objective or page of the live PDFs. The two subjects therefore remain `needs_current_source_review`; this does not promote `JAMB_SYLLABUS_VERIFIED` or certify the 2027 examination edition.

## Completed CI checkpoint before the Chemistry/Mathematics reference follow-up — 19 November 2026

At this checkpoint, PR head was `ed3934fe7c2f4d7611259e834fe4ce2732ccb486`. The later source-reference and documentation updates are committed on the same feature branch and triggered fresh validation on the newer head.

- **Validate pull requests** run `44489083138` completed successfully. All steps passed, including all-five-PDF extraction and preview generation, source extraction tests, question-source importer tests, Deno shared-function tests, Edge Function TypeScript, TypeScript, unit tests, lint, web build, Capacitor sync and Android debug APK compilation.
- **Rutex Master Next artifact-only** run `44489083112` completed successfully. The successor APK package/version/signing verification and artifact upload passed. The Supabase publication step was skipped, so no updater release was published.
- Vercel checks reported success for both connected projects. A signed-in student/admin walkthrough and physical-device acceptance test remain outstanding. The Supabase Preview check was skipped because this Git branch is not associated with a Supabase Preview branch.
- PR #78 remains Draft. No merge, Production UI deployment, JAMB question publication or updater-release publication was performed.


## Question-bank import continuation — 22 November 2026

The feature branch now includes Use of English in the four-subject question-bank importer. The source parser and admin review UI already recognise `use_of_english`; the live backend still needs its matching release before an English batch can be staged.

| Source subject | Review candidates | Source answer keys | Source explanations | Verified keys |
|---|---:|---:|---:|---:|
| Physics | 896 | 0 | 0 | 0 |
| Chemistry | 1,940 | 0 | 0 | 0 |
| Biology | 1,833 | 0 | 0 | 0 |
| Use of English | 3,914 | 750 suggestions | 750 suggestions | 0 |
| **Total** | **8,583** | **750 suggestions** | **750 suggestions** | **0** |

These are intake candidates, not published questions. The science source packs do not supply verified answer keys or explanations. The English source includes 750 answer/explanation suggestions, but all remain unverified and are not written into the protected answer-key table at staging time.

### Live backend gate

A read-only check of the connected Supabase project on 22 November 2026 confirmed:

- `question-import` is active at **v4** and its live subject allowlist is still Physics, Chemistry and Biology. It does not yet accept Use of English.
- Feature-branch code includes Use of English, keeps source answer/explanation candidates separate from verified fields, and blocks approval without a verified answer and explanation.
- Migration `20261121233000_require_verified_jamb_answer_and_explanation` is present on the feature branch but is **not recorded in the live migration history**.
- Live JAMB question rows, answer-key rows, import batches and import items remain **0**.

Do not upload or stage an English batch until the Edge Function and migration are released together. The migration also adds Use of English to the JAMB batch publisher allowlist and enforces answer-key/explanation completeness at the database boundary.

### Review and rights gates

- All source candidates stay `needs_review` on import. A source-supplied answer is a suggestion, never an approved key.
- Every item must retain four or five ordered, non-empty options, one verified correct option, and a meaningful explanation before approval/publication. Ungraded JAMB approval is rejected.
- Comprehension passages are preserved with their dependent questions. The English audit reports duplicate/missing/out-of-range source numbers, count mismatches, invalid options, answer-option mismatches and missing passage context.
- A Rutex administrator must still attest to the source-use permission/rights note before a source file is staged. No rights attestation, source upload, batch creation, answer-key publication or question publication was performed as part of this code-only continuation.

No Production UI change or question content was published.


### Live JAMB importer backend readiness — 22 November 2026

The backend prerequisite has now been released to the existing Supabase project `gzyczowqqywesqhqqpdi`:

- Migration `20261121233500/require_verified_jamb_answer_and_explanation` is recorded in live migration history. It creates database triggers that require ordered, non-empty A-D/A-E options, a matching correct option, a verified key, and a meaningful explanation. JAMB ungraded approval is blocked.
- `question-import` is active at **v5** with the four-subject allowlist: Physics, Chemistry, Biology and Use of English. Its capability response reports resumable chunks, stable offsets, safe retry support, source-answer suggestion separation, and the verified-answer/explanation gate.
- The Edge Function keeps `verify_jwt=false` only because the handler itself validates the Bearer token, active session and administrator status. Do not remove the in-handler checks.
- The publisher allowlist now includes Use of English. The server-owned import, audit and answer-key tables remain RLS-enabled and service-role-only; no student-facing access was added.
- Read-only live verification after deployment returned: JAMB published question rows **0**, answer-key rows **0**, import batches **0**, and import items **0**. The migration and Edge Function deployment did not stage or publish question content.

The feature-branch admin import client now fails closed before uploading either file unless the live capability endpoint advertises support for the selected subject and both answer-verification safeguards. Therefore, the previous v4 function cannot accept an English upload.

**Still outstanding:** source-use permission must be documented and attested by an authorised administrator for each submitted source pack, the generated JSON must be uploaded with its exact original source file, and every question must pass human review. No question has been marked verified or published. The JAMB student-facing Production UI remains disabled; PR #78 remains Draft.


## Legacy JAMB question visibility and review queue — 22 November 2026

A read-only audit of the active shared Supabase project identified **2,753 legacy JAMB question rows** already present in `study_questions`: Use of English 2,520, Physics 100, Chemistry 82 and Biology 51. All 2,753 rows remain `hidden=true` and `review_status=needs_review`.

The answer and explanation fields are stored separately in the protected `study_question_answer_keys` table. All 2,753 records contain a draft answer label and a meaningful explanation, but **zero are approved**; all remain `needs_review`. The audit trail records that previously auto-approved assistant-generated keys were reverted because they had not received academic review. These drafts must not be presented to learners as verified answer keys.

The JAMB admin question manager now has an opt-in **Include hidden questions needing review** mode. It uses the admin-authenticated `question-import` Edge Function to list pending legacy rows and shows their saved answers as drafts. Editing a pending row requires a fresh source-rights attestation and independent verification of the correct answer and explanation. Historical audit notes are not automatically reused as fresh permission confirmation. The question manager's normal/default list remains published-only.

The live `question-import` Edge Function was updated to **v6**. Its new `include_review_queue` flag is available only after the existing Bearer-token, active-session, JAMB-entitlement and administrator checks. Without that flag, the endpoint continues to require `hidden=false` and `review_status=published`. Student-facing question retrieval and CBT selection remain published-only. No question was published or made visible to students by this continuation.

The corresponding UI and type changes are committed on `feat/rutex-jamb-workspace` at `3281d139f714cb27610556eee95b4e82bf3c4eac`, within Draft PR #78. Production UI has not been deployed; the Vercel checks are currently blocked by the account's build-rate limit. Before any learner release, pending keys still require academic review, source rights must be confirmed, and Use of English's subject availability/source-reference exception must be addressed.

## Answer-draft confidence and safe revision path — 25 November 2026

A read-only review of the current connected JAMB data found 7,630 questions and 7,630 protected answer-key records across Biology (1,457), Chemistry (1,608), Physics (743) and Use of English (3,822). Every question remains `hidden=true` / `needs_review`; every answer key remains `needs_review`. None was approved or published during this continuation.

The structural audit found no missing/invalid answer labels, no answer labels outside the stored options, no explanations shorter than 12 characters, no malformed or missing source references, and no malformed option sets. This verifies data shape, not academic correctness.

The five candidates named in the prior review screenshot were already in the database; this continuation did not insert duplicates:

| Subject / source | Existing draft | Confidence assessment |
| --- | --- | --- |
| Biology 2002:Q29 — mammalian erythrocytes | B | High: mature mammalian erythrocytes are biconcave and anucleate. Source wording and options are present in `Biology.txt`. |
| Physics 1981:Q43 — 5 g wt to 20 g wt extension | E (2.24 cm) | High: Hooke's law gives a load ratio of 4, so extension is 0.56 × 4 = 2.24 cm. |
| Use of English 2013:Q27 — `The Potter's Wheel` | B (father was indebted to Teacher) | High: the novel passage confirms Bright was sent to Teacher as security for his father's loan. The long-journey key is contradicted by the novel text. Remains `needs_review` until admin approval. |
| Use of English 2016:Q6 — GPS development decade | B (1970s) | Medium: official FAA history dates the NAVSTAR GPS programme to 1973, but the original JAMB comprehension passage is missing from the extraction. |
| Use of English 2016:Q7 — GPS's initial purpose | C (security purposes) | Medium: exact MySchoolGist source option C is “security purposes”; Smithsonian and U.S. Space Force histories confirm the original military applications. The passage is missing, and the database's option text currently adds “and military”; restore the source wording before approval. |

A separate Physics 2012:Q15 question was also confirmed from the source: a 1 kg load is 10 N, the 1.2 cm extension is 0.012 m, and (k=F/x=10/0.012\approx833\,\mathrm{N\,m^{-1}}), so the stored answer B is consistent.

### Review blockers found

- **188 diagram-dependent questions have no attached image**: Biology 117, Chemistry 68 and Physics 3. They remain hidden; do not infer the correct option from a missing diagram or label.
- **Eight duplicate source-reference groups need content-level review**: Biology 1981:Q47, 1995:Q26 and 2003:Q5; Chemistry 1978:Q26, 1979:Q11, 1979:Q13, 1980:Q16 and 1981:Q14. Matching references alone are not enough to decide whether records are duplicates or distinct variants.
- The source question count and answer-key structure are complete in the current database snapshot, but these checks do not establish that all 7,630 academic answers are correct.

### Feature-branch implementation

The following changes are committed to `feat/rutex-jamb-workspace` within Draft PR #78:

- Added private answer confidence, confidence note, evidence reference and optimistic draft-version columns. The new migration seeds confidence notes for the reviewed candidates (including the separate 2012 Physics calculation) without changing their answer letters, explanations, `needs_review` status or hidden state.
- Added server-side draft validation and tests for answer-option matching, complete option sets, meaningful explanations, confidence notes and evidence-reference limits.
- Added an admin-authenticated `save-answer-draft` action. It only accepts questions that are still hidden and `needs_review`; approved/rejected keys are refused. It does not alter question text, options, images, rights attestations, approval status or learner visibility. A draft-version check prevents overwriting a newer review, and a private audit entry records the before/after answer metadata while explicitly recording that no source-rights attestation was made.
- Added confidence/evidence fields and a **Save answer draft only** control to the JAMB admin question manager. The existing publish path remains a separate action gated by fresh rights and answer verification.

**Release status:** code and migration are on the feature branch only. The new migration has **not** been applied to Supabase and the changed Edge Function has **not** been deployed. No live database rows were changed by this continuation; production remains hidden and unchanged. Pair the migration and Edge Function deployment before testing the new admin save control. The PR remains Draft and has not been merged.

The database did not previously contain a `v19` marker or confidence fields. This branch introduces a general monotonic `draft_version` for safe concurrent edits; it does not claim that a historical v19 draft was present in live data.

## Source-reference and diagram audit follow-up — 25 November 2026

The eight source-reference collision groups were compared against the exact committed `Biology.txt` and `Chemistry.txt` documents:

- **Six groups are genuine duplicate question records:** Biology 2003:Q5 and Chemistry 1978:Q26, 1979:Q11, 1979:Q13, 1980:Q16 and 1981:Q14. Each pair has the same question intent and same option set; wording differences are formatting/normalization. The preferred retained row is listed in `docs/JAMB_DUPLICATE_SOURCE_REFERENCE_REVIEW.csv`. No row has been deleted or rejected yet; both records in each pair remain hidden pending a deliberate soft-deduplication operation.
- **Two groups are not duplicates:** Biology 1981:Q47 is reused for a symbiosis question and a separate heart-diagram question in different source sections. Biology 1995:Q26 is reused for a cerebellum/walking question and a separate ovule/micropyle diagram question. The original source contains both distinct questions, so both database rows must be retained; matching source references alone must not trigger deletion.

The exact 188 diagram-dependent rows have been extracted into `docs/JAMB_DIAGRAM_RECONSTRUCTION_BACKLOG.csv` with question ID, subject/year/reference, required diagram description and stem. Counts: Biology 117, Chemistry 68, Physics 3. All 188 already have an explicit `[Diagram needed: ...]` description, but none of these rows currently has an attached question image. The manifest is a reconstruction/source-recovery checklist, **not an image pack**. Do not fabricate source-specific labels or treat a textual description as a substitute for the original figure during academic verification.

## Gemini credential exposure — 25 November 2026

A review of the tracked `fill_answers.py` found **eight hard-coded Gemini API credentials**. The feature branch in PR #78 now reads `GEMINI_API_KEY` or `GEMINI_API_KEYS` from the local environment, and `.env.example` documents the variable names without containing actual values.

The same exposed version is still present on the repository's `main` branch as of this check. A narrow source-only security PR **#81** (`security/remove-hardcoded-gemini-keys`) has been opened against `main`; it is not merged. Both Vercel checks (`jupebstudyguide` and `rutexjupebmaster`) currently report success on its current head. PR #78 also carries the cleaned utility file.

**Required external remediation:** revoke/rotate all eight credentials with the provider. Replacing the current file does not remove old commits from Git history. No provider-side key rotation or Git-history rewrite was performed by this continuation. Do not use the exposed credentials again.

No Supabase question rows were changed during this follow-up. The confidence migration remains absent from live migration history, the new draft-only Edge Function action is not deployed, and no question or answer key has been approved or published.

The provisional answer for English 2013:Q27 was changed from D to B and upgraded to high confidence after checking the novel passage: Bright was sent to Teacher as security for his father's loan. The migration cites the passage and a corroborating JAMB answer reference. The answer key remains `needs_review` and hidden; this is not an admin approval or publication.

## Screenshot answer candidates — final source review, 25 November 2026

| Subject / reference | Draft answer | Confidence and evidence |
|---|---|---|
| Biology 2002:Q29 — mature mammalian red blood cells | B | High: the wording/options and standard mammalian erythrocyte structure support the answer. |
| Physics 1981:Q43 — 5 g to 20 g load extension | E (2.24 cm) | High: Hooke's law gives a fourfold load increase, so extension is (0.56\times4=2.24\text{ cm}). |
| Physics 2012:Q15 — force constant | B (about 833 N/m) | High: (k=F/x=10/0.012\approx833\text{ N/m}). |
| Use of English 2013:Q27 — `The Potter's Wheel` | B | High: the novel passage confirms Bright was sent to Teacher as security for the money his father owed. |
| Use of English 2016:Q6 — GPS development decade | B (1970s) | Medium: the source's option B matches the official FAA history that NAVSTAR/GPS was initiated in 1973; the associated comprehension passage is missing from the text extraction. |
| Use of English 2016:Q7 — GPS initial purpose | C (security purposes) | Medium: the exact source option is “security purposes”; Smithsonian and U.S. Space Force histories support the original military applications. The missing passage prevents full passage-based verification. The DB option currently expands the wording and should be restored before approval. |

### 2016 GPS question source variant

The committed `JAMB_english_READABLE.txt` includes a distinct `JAMB ENGLISH 2016 - OBJECTIVE` set explicitly attributed to the MySchoolGist PDF. Its Q6 and Q7 stems match the two hidden GPS database records. Q6 source options are “eighties”, “seventies”, “Sixties” and “fifties”; Q7 source option C is exactly “security purposes”. The database currently expands that Q7 option to “Security and military purposes”; restore the source wording during the next admin edit before approval. Q8–Q10 concern atomic clocks, GPS applications and satellite positioning. The GPS comprehension passage itself is absent from the extracted text. The same source pack labels the PDF as having no answer key. A different 2016 compilation has a different question numbering and should not be used to renumber this MySchoolGist set.

A separate 2016 compilation located during this review contains a different paper variant whose Q6 and Q7 concern a different comprehension passage. Those question numbers must not be cross-applied to the MySchoolGist set. Do not change the GPS references solely because another 2016 sitting/compilation numbers its questions differently.

Official background checks: the FAA describes GPS/Navstar as a joint civil/military technical program initiated in 1973; U.S. Air Force and GPS.gov material records military objectives and initial military-user requirements. This supports the proposed options but does not replace the missing JAMB comprehension passage. Keep both GPS records hidden and `needs_review` until the passage is recovered or an administrator accepts the separately documented evidence.

The confidence-seed migration stores the candidate answer and assessment for these existing question IDs only. It does not approve or publish them. The live database remains unchanged until the reviewed migration and matching Edge Function are deliberately released.
