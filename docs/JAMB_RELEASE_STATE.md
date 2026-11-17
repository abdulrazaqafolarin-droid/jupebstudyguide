# Rutex JAMB — release state

Checked 17 November 2026 against PR #78, the Ready Vercel Preview and live Supabase project `gzyczowqqywesqhqqpdi`.

## Implemented and deployed
- JAMB home, subject question browser, timed subject-practice CBT, JAMB-aware AI tutor, syllabus status and admin import/review/publish UI are implemented in the feature branch.
- Programme scoping covers question reads, search/RAG, answer references, bookmarks and practice progress; existing JUPEB flows remain JUPEB-scoped.
- Migration `20261117215633_create_jamb_workspace` is applied to the existing Rutex Supabase project after a successful rollback-only SQL preflight.
- Five remote-only historical migration sources were restored verbatim, restoring local migration history through `20261112011529`.
- Edge Functions are deployed and ACTIVE on the same project: `exam-attempts` v3 (JWT on), `exam-practice` v1 (JWT on), `question-import` v1 (JWT on), `ai-tutor` v100, `chat-proxy` v131, and `question-rag-index` v3.
- CBT answer writes are serialized per question; manual submit flushes the latest answers before scoring. In-progress question payloads do not contain keys or explanations. Owner-only answer review is available only after submit/expiry, and returns only independently approved keys/explanations.
- RLS and grants keep answer/import/attempt data server-owned. The new Edge Functions authenticate active sessions and enforce user/admin ownership.
- Vercel Preview for branch `feat/rutex-jamb-workspace` is Ready: [Open JAMB Preview](https://jupebstudyguide-git-f-29dfec-abdulrazaqafolarin-droids-projects.vercel.app). Latest checked deployment `dpl_8mUM6EFd3FMh8uks5mvjbSJxKYaD` was built from commit `222797586db6dbb55c401afe375a60e62f1d3fed`.
- `VITE_ENABLE_JAMB=true` is scoped to that branch's **Preview only**. No Production target was added, and no Production deployment was performed.

## Live database verification
- Existing JUPEB question rows: 3,227; visible published JUPEB rows: 2,984 (unchanged after migration).
- JAMB question rows: 0 (no source material was auto-published).
- Programme rows: JUPEB + JAMB. Five JAMB subject records exist: Physics/Chemistry/Biology available; Use of English compulsory but unavailable; Mathematics unavailable.
- One published practice configuration enables 10/20/40-question single-subject Rutex drills. The official-format full mock remains disabled.
- Programme-aware vector/text retrieval RPCs and transactional question-batch publication RPC exist.
- Private `question-source-documents` bucket exists alongside the existing `question-images` bucket.
- Live retrieval isolation probe: the same Physics query returns 0 JAMB rows and 30 JUPEB matches. This is expected until JAMB questions are reviewed and published.
- Embedding worker audit: the database trigger durably queues each published JAMB question. There is no `pg_cron` job for this worker, so the JAMB admin page now drains the shared `question-rag-index` queue after a publish (up to 50 per run) and offers a visible queue counter plus a manual `Index next 50` action. Failed provider jobs remain queued for retry. Current queue: 0; stored embeddings: 2,984 (existing JUPEB only); published JAMB: 0.

## Committed source inventory
The importer regression test now pins the exact candidate counts from the current committed source files. See `docs/JAMB_SOURCE_INTAKE_REPORT.md` for year/reference, option-pattern and figure-placeholder counts. These are candidates for admin review, not approved or published student questions.

## Validation
- Importer regression tests cover synthetic parser edge cases and all three real committed source packs; the real-source regression pins 896 Physics, 1,940 Chemistry and 1,833 Biology candidate blocks.
- Programme-aware retrieval and answer-scoring tests pass: 12 Deno tests.
- On the latest code commit `81db339ae6aa45ef8e9d1759532dbd2d3fa54f5d`, CI has passed the importer tests, Deno behaviour tests, strict Edge Function type-checks, TypeScript, unit tests, lint, web build and Capacitor sync. The Android debug APK compile was still running at the last check.
- The prior complete validation workflow on `30da66dd9e3455c87ed1b551299ed378939839f0` passed through Android debug build. A separate native iOS/artifact workflow later returned `action_required`; it is not a JAMB web/Edge Function test failure.

## Remaining content-release gates
1. Sign in as an authorised Rutex admin at `/admin/jamb-questions`, run `python scripts/import_jamb_sources.py` from the repository root, and stage the generated JSON together with each unchanged original text file. The import flow verifies the SHA-256, records source-use permission, and keeps every candidate private until reviewed.
2. Review source year, question wording, option order, duplicates and every figure/diagram. Publish an item as ungraded when no trustworthy answer key exists; only add a key/explanation after independent verification. The three supplied packs do not include verified answer keys or worked solutions, and no JAMB rows have been published yet.
3. Verify and version the current official JAMB syllabus and Use of English content before offering a full official-format UTME mock. Current 10/20/40 sessions are explicitly Rutex study drills, not an official mock.
4. Complete a signed-in mobile Preview walkthrough with a real admin/student account. A protected Preview cannot be fully exercised as an authenticated student/admin without that user's session.

The implementation and backend are deployed to the feature Preview. Student question-bank content remains gated on authenticated admin source-rights attestation and human content review rather than guessing answers or publishing unverified material. Production remains unchanged.
