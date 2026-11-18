# Rutex JAMB — release state

**Checked:** 18 November 2026  
**Repository:** `abdulrazaqafolarin-droid/jupebstudyguide`  
**Pull request:** [#78 — Add a separate JAMB study workspace](https://github.com/abdulrazaqafolarin-droid/jupebstudyguide/pull/78)  
**Feature branch:** `feat/rutex-jamb-workspace`  
**Branch head at this update:** `7db5e67174898c2ccde36db82a1b9fd77f8e6192`  
**Supabase project:** `gzyczowqqywesqhqqpdi` (existing Rutex/JUPEB project)

## Release boundary

PR #78 remains open as a **Draft**. JAMB is a separate workspace in the existing Rutex application and account system. Production remains on `main`; the feature branch is for Preview acceptance only.

The `VITE_ENABLE_JAMB=true` environment variable is scoped to the `feat/rutex-jamb-workspace` Preview branch in both connected Vercel projects (`rutexjupebmaster` and `jupebstudyguide`). No Production-scoped JAMB flag was added. The latest checked Production deployments for both projects still use `main` commit `fd61595f0a88dccd557e977a8a8f2fa56c968822`; no Production deployment was performed for this feature.

## Implemented and deployed

- Dedicated JAMB home, past-question browser, timed subject-practice CBT, JAMB-aware AI tutor, syllabus status page and admin source import/review/publish UI.
- Programme scoping for question reads/search/RAG, answer references, bookmarks and practice progress; existing JUPEB question retrieval remains scoped to JUPEB.
- Additive migration `20261117215633_create_jamb_workspace` is applied to the existing Supabase project. The migration passed a rollback-only SQL preflight first.
- Five remote-only historical migration sources were restored verbatim, reconciling local migration history through `20261112011529`.
- Server-owned CBT attempt lifecycle, answer persistence, expiry and scoring. In-progress snapshots omit answer keys and explanations. Post-submit review is owner-authenticated and exposes only independently approved keys/explanations.
- Source intake preserves original hashes, question/source references, options and figure placeholders. The importer does not synthesize answers, discard E options or publish automatically.

### Live Edge Function deployment

All six relevant functions are `ACTIVE` on the existing project. Their entrypoints and bundled helper files were compared against the feature-branch source and matched byte-for-byte. Later branch commits changed Android/build workflow files, not these function sources.

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

- The JAMB validation workflow on commit `e2587462e48aa8413776fef5a12391a8959e203b` passed importer regression tests against all three committed source packs, Deno programme-aware retrieval/scoring tests, JAMB Edge Function type checks, TypeScript, unit tests, lint, web build, Capacitor sync and Android debug compilation.
- The repository-wide validation workflow on the same commit passed its substantive checks, including Supabase function typing/tests, application TypeScript, importer tooling, unit tests and lint.
- The separate Rutex Master Next artifact-only job succeeded on commit `c90f8cdd178ee1dbd1c29850bcb3f59f848478d1`: Gradle built the APK; package/version/minimum SDK checks passed; the APK signing certificate matched the dedicated successor keystore; and the verified artifact was uploaded to GitHub Actions as artifact `14404831797`. The Supabase updater-publication step was skipped, so no release file or updater manifest was changed.
- The APK mismatch was caused by a hard-coded original Android application ID. Capacitor and Gradle now accept the explicit successor identity from CI while retaining `com.jupeb.master` as the default for normal builds.
- The successor APK workflow is now scoped to the successor PR and its stacked UI PR; unrelated JAMB PR changes no longer need to build that separate release artifact.
- The iOS simulator workflow passed on commit `cc5a3cd3f5b4766956c6242e762f7e49dc1b4286`: Capacitor iOS sync, Xcode simulator build, bundle identity, simulator installation, app launch and screenshot all passed. The workflow uploaded the simulator app and generated Xcode project, then committed four generated iOS icon/splash assets as `7db5e67174898c2ccde36db82a1b9fd77f8e6192`. That bot commit changes no JAMB logic, application code or backend.

## Remaining release gates

1. Complete a signed-in mobile Preview walkthrough with a real student and authorised administrator. A successful unauthenticated HTTP 200 from the SPA shell is not a substitute for testing authenticated student/admin journeys.
2. Stage the three source packs only after source-rights attestation. Review and approve every item before publication; do not guess missing answer keys or explanations.
3. Verify and version the current official JAMB syllabus and load reviewed Use of English content before enabling a full official-format UTME mock. Until then, the 10/20/40 sessions must remain clearly labelled Rutex practice drills.
4. Keep PR #78 in Draft and Production disabled until the remaining acceptance gates and release review are complete.

**No Production UI deployment, additional database migration, JAMB source publication or updater-release publication was performed during this continuation.**
