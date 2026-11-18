# JAMB workspace — implementation and rollout notes

## Scope currently implemented

- A dedicated `/jamb` route family with its own home, question bank, practice CBT, AI tutor, syllabus status, daily mission/history, study stats, achievements and separate leaderboard destination.
- An explicit `exam_program_id` boundary (`jupeb` or `jamb`) in question storage, question RAG, answer references and learner progress.
- The existing JUPEB question loader now requests JUPEB-only rows when the new column is present. It retries the legacy query only when the migration is not yet present; it does not select JAMB rows.
- JAMB past-question browsing supports historical A–E source questions. The timed CBT practice selector deliberately uses only four-option A–D questions.
- CBT attempts, question snapshots, submitted answers, timer expiry and scoring are server-authoritative. In-progress snapshots do not contain answer keys.
- Answer keys live in a separate protected table and are returned only by the post-selection practice check or server-side scoring.
- Per-user JAMB bookmarks and practice progress have separate cloud rows and local-first storage keys.
- The JAMB dashboard mirrors JUPEB dashboard composition with JAMB-only practice totals, bookmarks, available years, subject cards, quick actions and guarded score/leaderboard panels.
- JAMB daily missions use stable, reviewed-and-published question sets, answer checks through `exam-practice`, resumable per-account history and a separate `jamb_daily_missions` table. Mission review stores only the server-approved result, correct option and explanation; ungraded items never reduce the score denominator.
- JAMB achievements include daily-mission completion milestones. JAMB stats distinguish saved-answer activity from server-scored timed CBT results; they never infer correctness from an answer selection.
- JAMB Discover and Profile route aliases preserve the programme context. Discover does not call the JUPEB weekly leaderboard in JAMB; Profile hides JUPEB badges and JUPEB-specific activation-code prompts.
- A private-source staging/import path keeps raw text, hashes, source references, figure descriptions and validation flags. It does not invent solutions or auto-publish.
- A JAMB-aware tutor prompt and AI retrieval path use only JAMB-tagged question-bank records. JUPEB textbook retrieval and the global JUPEB floating tutor are disabled inside JAMB pages.

## Supplied source material and import behaviour

The importer reads the repository's `Physics.txt`, `Chemistry.txt` and `Biology.txt` collections. It preserves supplied wording and available options, detects `(year:Qn)` source references, records the original file hash and source line, and flags missing/ambiguous years, unexpected option counts and figure placeholders.

The Biology source explicitly says its answers/solutions are excluded. The three files therefore do not provide verified answer keys or worked explanations. The importer leaves `correct_answer` and `explanation` empty. A reviewer may approve a question as ungraded, or add a key/explanation only after checking it against a reliable source. Five-option historical questions are retained in the past-question bank; they are not silently truncated to fit current CBT practice.

Run locally from the repository root:

```bash
python scripts/import_jamb_sources.py
python -m unittest scripts.test_import_jamb_sources
```

The generated JSON is under `private-question-sources/generated-json/jamb/` and is gitignored. In the admin page, select both the generated JSON and the exact original source file. Their SHA-256 hashes must match. The admin must record and confirm the right to store and use the material before staging. Original documents are uploaded to the private `question-source-documents` bucket; question illustrations use the existing admin-managed question-images bucket.

## JAMB exam-format and syllabus boundaries

The official 2026 JAMB training manual specifies four options labelled A–D, 60 Use of English questions plus 40 questions in each of three chosen subjects, 180 questions overall and a two-hour duration. The 2027 JAMB Test Manual was listed on JAMB's official site as updated 23 September 2026, but the manual content was not available in this implementation review. The practice presets (10/20/40 questions) are Rutex study drills, not simulations of official timing or the full examination.

The initial supplied question pack covers Physics, Chemistry and Biology only. JAMB's live IBASS eligibility checker currently shows English Language selected by default for UTME subject combinations. Official IBASS PDFs are discoverable for Physics, Biology and Use of English, but they have not yet been imported, versioned and approved in this workspace; the Chemistry syllabus source still needs a verified handoff. The JAMB 2027 Test Manual is listed as updated 23 September 2026, but its linked download returned 404 when checked on 18 November 2026. Therefore the syllabus page remains explicitly gated and the full UTME mock remains disabled. The app does not substitute JUPEB topics or assume the older 2026 format is unchanged.

Official source links checked: [IBASS eligibility checker](https://eligibility.jamb.gov.ng/), [Physics PDF](https://ibass.jamb.gov.ng/assets/uploads/Physics.pdf), [Biology PDF](https://ibass.jamb.gov.ng/assets/uploads/Biology.pdf), [Use of English PDF](https://ibass.jamb.gov.ng/assets/uploads/Use-of-English.pdf), [2027 Test Manual listing](https://www.jamb.gov.ng/News/PDFs/2027/2027_JAMB_Test_Manual).

## Database rollout gate

The JAMB foundation is now applied in `supabase/migrations/20261117215633_create_jamb_workspace.sql` to the existing `gzyczowqqywesqhqqpdi` project. It extends the existing `study_questions` table with a default JUPEB programme tag, review/provenance fields and programme-scoped retrieval. It preserves the live JUPEB `search_document` generated column and its GIN index by adding a separate programme-aware search document.

Completed deployment gates:
1. Programme-aware AI, CBT and import Edge Functions are deployed to the existing project; their live versions and JWT settings are recorded in `docs/JAMB_RELEASE_STATE.md`.
2. The shared database migration, question retrieval isolation probe and JUPEB row-count regression have been verified against the live project.
3. The JAMB feature flag is scoped only to `feat/rutex-jamb-workspace` Preview. The latest Preview build attempts are currently rate-limited by the connected Vercel daily build cap; this is not an application CI failure. Production remains disabled.

Remaining content/acceptance gates:
1. Sign in as an authorised Rutex admin and stage the committed Physics, Chemistry and Biology source packs through the import/review UI.
2. Review source years, wording, options, duplicates and original figures. Publish ungraded when there is no reliable answer key; publish keys/explanations only after independent verification.
3. Load and verify the current official JAMB syllabus and Use of English before enabling full official-format UTME mock mode.
4. Complete a signed-in mobile Preview walkthrough with a real student/admin session; protected Vercel Preview pages cannot be verified as an authenticated user without that session.

The feature flag is off by default globally, but is explicitly enabled for the `feat/rutex-jamb-workspace` Preview environment only. The most recent Vercel checks for the updated branch are blocked by the connected account's daily build-rate limit; no fresh Preview was produced for the latest commits. Production remains disabled and has not been deployed. The database and six relevant Edge Functions are deployed to the existing shared Supabase project. No JAMB source questions have been staged or published pending authenticated admin review.

## Applied database state — 17 November 2026

The migration `20261117215633_create_jamb_workspace` is applied to the existing Supabase project `gzyczowqqywesqhqqpdi`. The same SQL first passed a rollback-only transaction preflight against the live schema. The real migration returned success. Post-apply checks confirmed all 13 JAMB tables, programme-aware vector/text RPCs, the transactional publish RPC and the private source-document bucket. The two programme records are JUPEB and JAMB; the initial JAMB configuration enables only 10/20/40-question subject practice. Live counts after migration: 3,227 JUPEB questions (2,984 visible published) and 0 JAMB questions. No legacy question was relabelled and no JAMB content was automatically published.

The security advisor lists nine new server-owned JAMB tables as RLS-enabled without policies. This is intentional deny-by-default: `anon` and `authenticated` have no grants on those tables; only `service_role` has CRUD, behind Edge Functions that authenticate the bearer token, check the active device session and enforce user/admin ownership. Existing project-wide SECURITY DEFINER view/RPC and mutable search-path warnings pre-date JAMB and are documented in `docs/MIGRATION_RECONCILIATION_REQUIRED.md`.

## Admin review rules

- Every candidate must have a verified source year, a readable stem, complete A–D or A–E options and the original figure attached where a diagram is required.
- Approve as `approved_ungraded` when the question is sound but there is no independently verified key.
- Approve as `approved` only when the correct option is verified and matches one of the question's options.
- The publish RPC rechecks all of these conditions, prevents duplicate fingerprints, preserves verified historical E answers, and enforces source-rights confirmation in one transaction.
- Published answer keys remain outside the public student question projection and CBT snapshots.

## Current acceptance checks and release gates

- Web TypeScript/unit tests, importer tests, lint, web build and Android debug build are run by the PR workflow.
- Deno tests cover programme-aware retrieval, embedding prefixes and reviewed-answer scoring.
- Importer regression tests parse all three committed source files and assert that no answer key or explanation is invented.
- Import staging verifies active admin sessions and the uploaded source file's SHA-256 on the server.
- Deno type checks cover the new JAMB Edge Functions and the shared study-access guard.
- The shared Supabase migration and relevant Edge Functions are applied and post-checked. The feature flag is on for the feature Preview only; Production remains unchanged. Source questions remain private until an admin reviews them.



## Persistent tutor-history separation — 18 November 2026

The shared `ai_chats` table now has an `exam_program_id` discriminator through `20261118123742_scope_ai_chat_history_by_exam_program.sql`. Existing rows receive the JUPEB default, the foreign key points to the active exam-program registry, and `(user_id, exam_program_id, updated_at DESC)` supports scoped history lists. The migration was applied to the shared Rutex Supabase project and checked: all 321 existing tutor chats remain tagged `jupeb`; there are zero JAMB chat rows and zero unexpected programme IDs. Existing owner RLS policies were not weakened. The JAMB tutor stores, lists, renames, updates and deletes chats under `jamb`; JUPEB history remains isolated.

## JAMB daily mission, achievements and CBT analytics — feature branch

The practice-only daily mission flow is implemented at `/jamb/daily-mission` with per-mission routes under `/jamb/daily-mission/:missionId`. It selects up to ten currently published JAMB questions from the chosen subject, stores the fixed question IDs for resume, and calls the JAMB-scoped answer-check endpoint for each response. The history list can be expanded beyond the recent twenty records and can be opened read-only.

The workflow deliberately does not copy JUPEB lesson text, topic calendars, mastery data or 70% lesson-completion criteria. JAMB syllabus lessons remain disabled until the correct official syllabus and topic mappings are versioned and verified. The migrations `20261118182508_create_jamb_daily_missions.sql` and `20261118182636_tighten_jamb_daily_missions_grants.sql` are applied to the shared Supabase project. The table uses an owner-and-active-session RLS policy, grants authenticated users only SELECT/INSERT/UPDATE/DELETE, revokes anonymous/PUBLIC access, and currently contains zero rows. Mission history has a cloud persistence target; it remains JAMB-only and contains mission state rather than question content or answer keys.

JAMB achievements now add completed-mission thresholds to answer, streak and bookmark milestones. JAMB stats include a separate server-scored CBT attempt summary, weekly score trend and subject breakdown. The `history` action added to `supabase/functions/exam-attempts/index.ts` returns only terminal JAMB attempts owned by the authenticated user and omits question snapshots and answer keys. This action is deployed in `exam-attempts` v5. The existing authenticated-owner filter remains in place and the returned history omits question snapshots and answer keys.

Chat, Friends, Discover and Profile use JAMB route aliases to preserve programme context when navigating shared social/account features. Public-profile dialogs hide JUPEB achievement badges on those routes; JAMB Discover does not request or display JUPEB weekly scores; the JAMB Profile hides JUPEB badges and the JUPEB activation-code purchase prompt.

## Local-first answer and bookmark reconciliation

JAMB progress and bookmarks remain namespaced per signed-in user in local storage and synchronize to their programme-scoped cloud rows. Reconnect handling now has explicit reconciliation:

- A newer local answer is pushed to the cloud; a newer cloud answer is merged into local state. Equal-timestamp conflicts retain the local answer and schedule it for upload.
- Per-account sync operations are serialized and re-run once when a reconnect/focus event arrives during an active sync. Per-user/per-question answer writes are queued so rapid answer changes cannot complete out of order.
- Bookmark removals create persisted local tombstones. Reconciliation deletes the cloud row before clearing a tombstone; a re-add while a cloud delete is in flight is restored instead of lost.
- Reconnect sync is retried on browser online, focus and visible-page events. Failed writes leave the local value/tombstone available for retry.

Pure reconciliation helpers and unit tests cover newer local/cloud answers, missing rows, tie handling, deleted bookmark tombstones, deduplication and re-addition. A browser-level offline/online walkthrough is still part of signed-in mobile acceptance.

## Resumable and idempotent source upload

Admin staging uses the original source SHA-256 to find an existing batch and resume a partial upload. Every chunk carries a stable zero-based source offset. The Edge Function maps it to one-based item numbers and upserts against the database's unique `(batch_id, item_number)` key with duplicate conflicts ignored, preserving already-reviewed rows when a timed-out request is retried. Batch counters are recalculated from stored item states instead of assuming each HTTP response was received. A bounded range helper has Deno tests for explicit offsets, legacy offset fallback and invalid/overflowing chunks.

The admin UI only resumes a matching source hash and candidate count; it does not create duplicate batches or silently replace human review. Previously published source batches are not restaged.

## CBT reliability and post-submit review
- Per-question answer writes are serialized so a fast sequence of option changes cannot finish out of order on the server.
- Manual submission flushes the latest local answer and review-flag state for every question before the attempt is locked and scored.
- The attempt read endpoint never returns answer keys. A separate owner-authenticated `review` action is rejected while the attempt is in progress and is available only after submission/expiry.
- Post-submit review shows the candidate's selection, an independently approved key and explanation where one exists. Missing keys are explicitly ungraded and excluded from the scored denominator.
- The server maps the database's `subject_code` into the stable `subject` field expected by the CBT UI.


## Shared semantic-index queue
- Publishing approved JAMB rows invokes the same `study_questions` trigger used by JUPEB; it writes a durable `study_question_embedding_jobs` row.
- JAMB admin uses the existing `processPendingQuestionEmbeddings` client helper and the already-deployed `question-rag-index` Edge Function; no duplicate model/indexing pipeline was added.
- After a successful batch publish the admin UI processes up to 50 jobs. The queue panel shows queued jobs and stored embeddings and can process another bounded 50. Provider failures are kept in the retry queue with backoff.
- The live project has no `pg_cron` schedule for this worker. Processing is therefore an explicit authenticated-admin action, not a claimed always-on background worker. The JAMB tutor still works with programme-filtered lexical retrieval while embedding jobs await processing.


## Live JAMB mission and admin backend state — 18 November 2026

- Applied migrations: `20261118182508_create_jamb_daily_missions` and `20261118182636_tighten_jamb_daily_missions_grants`. The mission table has RLS, one owner-and-active-session policy, no `anon`/`PUBLIC` table grants, and authenticated SELECT/INSERT/UPDATE/DELETE only. Verified live row count is zero.
- Deployed Edge Functions: `exam-attempts` v5 (owner-filtered CBT history) and `question-import` v3 (resumable/idempotent source chunk protocol v2). Both retain in-handler Bearer-token validation and active-session checks; import additionally validates administrator role.
- No JAMB question data has been staged or published. The full mock and syllabus-led lesson plans remain disabled until official subject coverage, verified syllabus versioning and the JAMB 2027 exam-format source can be validated.


## Uploaded five-subject syllabus intake

The owner uploaded Biology, Chemistry, Mathematics, Physics and Use of English PDFs in repository commit `e1d9b81b82be717567f47972c39a6ce702bf6b92`. The feature-branch extraction workflow reads those exact immutable source bytes, records SHA-256, page count and PDF metadata, preserves page text and detected table cells, copies the originals into the review pack and renders page previews. The successful review artifact is GitHub Actions run `44388332808`, artifact `14467187615`.

The JAMB syllabus UI now contains a five-subject catalogue (108 topic/section entries) with section headings, topic outlines, source page references and the general objectives shown in the submitted files. It also distinguishes subject-syllabus availability from question-bank availability: English is marked compulsory in the submitted source and Mathematics/English can be browsed, but neither has JAMB practice questions in the current bank.

**Version and completeness boundary:** the uploaded PDF metadata identifies 2025-created copies. The Physics and Use of English uploaded content differs from the JAMB-hosted PDFs checked during this work. The catalogue remains a candidate source outline and `JAMB_SYLLABUS_VERIFIED=false`; per-topic objective mapping and reconciliation against current IBASS source documents still need completion. Do not describe this as the verified 2027 syllabus and do not enable an official-format UTME mock from it.

Topic completion uses a separate `jamb-syllabus-progress-v1` per-user local-storage key and syncs to `exam_user_syllabus_progress` for cross-device continuity. The table is constrained to JAMB progress and has owner/active-session RLS with anonymous access revoked. The hook merges local and remote state by latest update time, uploads locally newer or missing entries and retains offline changes for retry. It does not read or write JUPEB progress. Topic entry points pass the selected subject and topic to the JAMB Tutor, where the uploaded outline is included as explicitly unverified study context.


## JAMB syllabus progress cloud sync

Migration `20261118210924_create_exam_user_syllabus_progress` is applied to the existing Rutex Supabase project and committed at the same exact timestamp under `supabase/migrations/`. It stores JAMB-only learner topic state, with a composite key on user, programme and topic, a constrained state enum, owner + active-session RLS, and explicit grants. Anonymous and PUBLIC table privileges are revoked. The live ACL/RLS verification succeeded and the table is empty.

`useJambSyllabusProgress` now syncs the per-account local namespace `jamb-syllabus-progress-v1` with `exam_user_syllabus_progress`. It merges records by `updatedAt`, uploads local-newer/missing entries, keeps local state available offline, and retries when the connection returns or the app is focused/visible. JUPEB syllabus progress remains untouched. Automated unit coverage includes local/remote timestamp conflict resolution.


### JAMB topic-progress sync and Tutor history

The client hook starts cloud reconciliation immediately after local topic changes, coalesces overlapping sync requests, reads local progress after the remote read completes and retries if writes occur during an in-flight sync. Local state is kept when the network is unavailable and retries on reconnect, focus and document visibility. Timestamp ties use a deterministic progress-state priority. The live table is still protected by RLS and the app has not yet completed an authenticated device-to-device acceptance walkthrough.

JAMB Tutor entry from a syllabus topic resolves the latest JAMB chat matching the exact subject and topic, or creates a topic-tagged chat if no match exists. Subject-specific tutor entry similarly avoids resuming an unrelated subject thread. The resolver is tested against JUPEB and unrelated JAMB chat rows.


## Use of English source reconciliation

The uploaded Use of English PDF was not used as the current syllabus authority because it differs materially from the JAMB-hosted IBASS PDF checked on 18 November 2026. The catalogue now follows the IBASS PDF for the three syllabus sections, learning objectives and 60-question section structure. It specifically records two passages (one cloze), *The Lekki Headmaster* by Kabir Alabi Garba, homonyms, punctuation/spelling, and the official oral-form outline. The uploaded 2025-created PDF remains linked and checksum-recorded for provenance. The catalogue stays globally unverified for the 2027 cycle until the applicable source set is reconciled.


### Full-page visual QA for source PDFs

The CI review pack will include page images for every PDF page (all 59 pages across the five uploaded copies), not only opening pages. The extraction manifest records the preview page count and scale. Unit coverage uses a two-page test fixture per subject and asserts both preview images exist. This improves review completeness; it does not change the provisional/current-IBASS verification status of the uploaded source copies.
