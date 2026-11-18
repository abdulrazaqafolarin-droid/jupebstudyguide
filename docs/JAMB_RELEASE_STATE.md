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
- The official JAMB IBASS eligibility checker currently shows English Language selected by default for UTME combinations. Official IBASS Physics, Biology and Use of English syllabus PDFs are discoverable, but they have not yet been imported, versioned or approved in Rutex. The Chemistry syllabus source and 2027 format still need a verified intake. JAMB's 2027 Test Manual page lists a manual updated 23 September 2026, but its linked manual download returned 404 when checked on 18 November 2026. The official full-mock configuration therefore remains disabled.
- There are still zero JAMB question rows and zero import batches. No Physics/Chemistry/Biology source pack has been staged, rights-attested, reviewed or published.

Official references checked: [JAMB IBASS eligibility checker](https://eligibility.jamb.gov.ng/), [Physics syllabus](https://ibass.jamb.gov.ng/assets/uploads/Physics.pdf), [Biology syllabus](https://ibass.jamb.gov.ng/assets/uploads/Biology.pdf), [Use of English syllabus](https://ibass.jamb.gov.ng/assets/uploads/Use-of-English.pdf), and [2027 JAMB Test Manual listing](https://www.jamb.gov.ng/News/PDFs/2027/2027_JAMB_Test_Manual).
