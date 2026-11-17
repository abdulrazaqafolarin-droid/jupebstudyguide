# Rutex JAMB — release state

Checked 17 November 2026 against GitHub PR #78, Vercel Preview and the live Supabase project `gzyczowqqywesqhqqpdi`.

## Implemented and deployed
- JAMB home, subject question browser, timed subject-practice CBT, JAMB-aware AI tutor, syllabus status and admin import/review/publish UI are implemented in the feature branch.
- Programme scoping covers question reads, search/RAG, answer references, bookmarks and practice progress; existing JUPEB flows remain JUPEB-scoped.
- Migration `20261117215633_create_jamb_workspace` is applied to the existing Rutex Supabase project after a successful rollback-only SQL preflight.
- Five remote-only historical migration sources were recovered verbatim, restoring local migration history through `20261112011529`.
- Edge Functions are deployed and ACTIVE on the same project: `exam-attempts` v1 (JWT on), `exam-practice` v1 (JWT on), `question-import` v1 (JWT on), `ai-tutor` v100, `chat-proxy` v131, and `question-rag-index` v3.
- RLS, grants and server-owned answer/import/attempt tables are deny-by-default for browser roles; Edge Functions authenticate active sessions and enforce user/admin access.
- CBT question snapshots omit answer keys; only reviewed answer keys score. Unkeyed questions remain ungraded.
- Vercel Preview for branch `feat/rutex-jamb-workspace` is Ready: [Open JAMB Preview](https://jupebstudyguide-git-f-29dfec-abdulrazaqafolarin-droids-projects.vercel.app). Deployment `AR8wPeKEsjUxe1dPkyCKsXkX3Z7T` was built from commit `9f1198c77afd0591454ddd1371766fab99616797`.
- `VITE_ENABLE_JAMB=true` is configured for that branch's **Preview only**. No Production target was added, and no Production deployment was performed.

## Live database verification
- Existing JUPEB question rows: 3,227; visible published JUPEB rows: 2,984 (unchanged after migration).
- JAMB question rows: 0 (no source material was auto-published).
- Programme rows: JUPEB + JAMB. Five JAMB subject records exist: Physics/Chemistry/Biology available; Use of English compulsory but unavailable; Mathematics unavailable.
- One published practice configuration enables 10/20/40-question single-subject Rutex drills. The official-format full mock remains disabled.
- Programme-aware vector/text retrieval RPCs and the transactional question-batch publish RPC exist.
- Private `question-source-documents` bucket exists alongside the existing `question-images` bucket.
- Live retrieval isolation probe: the same Physics query returns 0 JAMB rows and 30 JUPEB matches. This is expected until JAMB questions are reviewed and published.

## Validation
- The PR's importer regression tests passed on all three committed source files: 5 Python tests.
- Programme-aware retrieval and score tests passed: 12 Deno tests.
- The PR validation workflow passed on feature commit `30da66dd9e3455c87ed1b551299ed378939839f0`, including strict Deno checks, TypeScript, unit tests, lint, web build and Android debug build.
- The later automation commit `9f1198c77afd0591454ddd1371766fab99616797` only added generated native iOS project/lockfile assets; GitHub reported its subsequent workflows as `action_required`, not as failed tests. Manual GitHub Actions approval is a separate native-workflow gate.

## Remaining content-release gates
1. Sign in as an authorised Rutex admin at `/admin/jamb-questions`, run `python scripts/import_jamb_sources.py` from the repository root, and stage the generated JSON together with each unchanged original text file. The import flow verifies the SHA-256, records source-use permission, and keeps every candidate private until reviewed.
2. Review source year, question wording, option order, duplicate fingerprints and every figure/diagram. Publish an item as ungraded when no trustworthy answer key exists; only add a key/explanation after independent verification. The three supplied packs do not include verified answer keys or worked solutions, and no JAMB rows have been published yet.
3. Verify and version the current official JAMB syllabus and Use of English content before offering a full official-format UTME mock. Current 10/20/40 sessions are explicitly Rutex study drills, not an official mock.
4. Complete a signed-in, mobile Preview walkthrough with a real admin/student account and verify CBT answer save, reload recovery, submission and review against reviewed content. A protected Vercel Preview cannot be exercised as a student without that authenticated browser session.

The implementation and backend are deployed to the feature Preview. The student question-bank content is deliberately gated on human source/content review rather than silently guessing answers or publishing unverified material. Production remains unchanged.
