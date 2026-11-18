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

All six relevant functions are `ACTIVE` on the existing project. Their entrypoints and bundled helper files were compared against the feature-branch source and matched byte-for-byte.

| Function | Live version | Gateway `verify_jwt` |
|---|---:|---|
| `exam-attempts` | v4 | false |
| `exam-practice` | v2 | false |
| `question-import` | v2 | false |
| `ai-tutor` | v101 | false |
| `chat-proxy` | v132 | false |
| `question-rag-index` | v4 | false |

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

The migration filename reconciliation and documentation changes that follow this validated code head are being rechecked by CI. The connected Preview routes had returned HTTP 200 at SPA-shell level, but a signed-in student/admin mobile walkthrough has not yet been completed.

## Post-migration advisor review

The Supabase advisor scan after the chat-history migration reported existing project-wide findings, including RLS-enabled server-only tables without student policies (intentional for service-role access), one pre-existing security-definer view, older public-schema function warnings and unrelated legacy index/policy performance notices. No unrelated policy, function or view changes were made as part of this JAMB migration. The new chat-history index is expected to appear unused until programme-specific chat traffic exercises it.

## Remaining release gates

1. Complete the signed-in mobile Preview walkthrough with a real student and authorised administrator. A successful unauthenticated HTTP 200 from the SPA shell is not a substitute for testing authenticated student/admin journeys.
2. Stage the three source packs only after source-rights attestation. Review and approve every item before publication; do not guess missing answer keys or explanations.
3. Verify and version the current official JAMB syllabus and load reviewed Use of English content before enabling a full official-format UTME mock. Until then, the 10/20/40 sessions must remain clearly labelled Rutex practice drills.
4. Keep PR #78 in Draft and Production UI disabled until the remaining acceptance gates and release review are complete.

**No Production UI deployment, JAMB source publication or updater-release publication was performed during this continuation.** The two additive database migrations and six Edge Function deployments described above remain live on the existing connected Supabase project.
