# JAMB workspace — implementation and rollout notes

## Scope currently implemented

- A dedicated `/jamb` route family with its own home, question bank, practice CBT, AI tutor and syllabus status page.
- An explicit `exam_program_id` boundary (`jupeb` or `jamb`) in question storage, question RAG, answer references and learner progress.
- The existing JUPEB question loader now requests JUPEB-only rows when the new column is present. It retries the legacy query only when the migration is not yet present; it does not select JAMB rows.
- JAMB past-question browsing supports historical A–E source questions. The timed CBT practice selector deliberately uses only four-option A–D questions.
- CBT attempts, question snapshots, submitted answers, timer expiry and scoring are server-authoritative. In-progress snapshots do not contain answer keys.
- Answer keys live in a separate protected table and are returned only by the post-selection practice check or server-side scoring.
- Per-user JAMB bookmarks and practice progress have separate cloud rows and local-first storage keys.
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

The initial supplied pack covers Physics, Chemistry and Biology only. Use of English is compulsory according to JAMB's live IBASS eligibility checker, but no English content pack is supplied here. For those reasons the full UTME mock remains disabled. No current official JAMB syllabus has been loaded, versioned and verified in this workspace; the syllabus page states that clearly instead of substituting the JUPEB syllabus.

## Database rollout gate

The JAMB foundation is now applied in `supabase/migrations/20261117215633_create_jamb_workspace.sql` to the existing `gzyczowqqywesqhqqpdi` project. It extends the existing `study_questions` table with a default JUPEB programme tag, review/provenance fields and programme-scoped retrieval. It preserves the live JUPEB `search_document` generated column and its GIN index by adding a separate programme-aware search document.

Completed deployment gates:
1. Programme-aware AI, CBT and import Edge Functions are deployed to the existing project; their live versions and JWT settings are recorded in `docs/JAMB_RELEASE_STATE.md`.
2. The shared database migration, question retrieval isolation probe and JUPEB row-count regression have been verified against the live project.
3. The branch Preview is deployed and Ready with `VITE_ENABLE_JAMB=true` scoped only to `feat/rutex-jamb-workspace`. Production remains disabled.

Remaining content/acceptance gates:
1. Sign in as an authorised Rutex admin and stage the committed Physics, Chemistry and Biology source packs through the import/review UI.
2. Review source years, wording, options, duplicates and original figures. Publish ungraded when there is no reliable answer key; publish keys/explanations only after independent verification.
3. Load and verify the current official JAMB syllabus and Use of English before enabling full official-format UTME mock mode.
4. Complete a signed-in mobile Preview walkthrough with a real student/admin session; protected Vercel Preview pages cannot be verified as an authenticated user without that session.

The feature flag is off by default globally, but is explicitly enabled for the `feat/rutex-jamb-workspace` Preview environment only. The latest Preview is Ready; Production remains disabled and has not been deployed. The database and six relevant Edge Functions are deployed to the existing shared Supabase project. No JAMB source questions have been staged or published pending authenticated admin review.

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
