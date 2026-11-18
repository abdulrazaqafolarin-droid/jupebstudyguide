# JAMB Workspace UI Parity

## Product rule

The JAMB workspace mirrors the JUPEB workspace's interface, navigation patterns, responsive behavior and shared study tools. It is a separate exam programme inside the same Rutex product, not a different miniature app.

Shared presentation components should be reused where they do not carry programme-specific data. JAMB question content, saved answers, bookmarks, CBT attempts, AI tutor conversations and progress must remain scoped to `jamb`.

## UI parity delivered

- **Workspace navigation:** the same five-slot bottom navigation, drawer structure, account controls and workspace switcher. Direct messages and community destinations remain shared. Study Chat opens the programme-aware tutor.
- **Dashboard:** the same animated hero, primary actions, Daily Mission card position, progress ring, subject-card styling, quick actions and study tips. JAMB counts, streaks and milestones are computed from JAMB progress only. The Daily Mission card links to a real timed JAMB drill; its topic-led 30-day lessons remain gated until official syllabus topics are verified.
- **Past questions:** the JUPEB staged flow and controls: subject cards, expandable available-year rows, one-question-at-a-time practice, progress, the jump-to-question modal, saved-answer feedback, question bookmarks and a persistent bookmark history. JAMB content is loaded only from the JAMB question projection.
- **Syllabus:** the same searchable subject accordion and sticky header. The UI does not fabricate topics. Topic tracking remains unavailable until official JAMB syllabus material is verified and published.
- **AI tutor:** reuses JUPEB's conversation sidebar, grouped persistent history, message thread, editing/rewind, retry, attachments and composer. It uses the JAMB tutor system prompt and sends `examProgramId: "jamb"` to the chat proxy.
- **CBT:** setup and live attempt screens follow the same card, header, progress and interaction language while retaining the JAMB server-authoritative timer and attempt workflow.


- **Offline continuity:** JAMB saved answers and bookmarks are local-first and per-account. Newer answers reconcile by timestamp; local bookmark deletions use persisted tombstones; cloud writes are serialized per question and sync is retried on reconnect/focus/visible events. Automated reconciliation tests cover stale-cloud answers, local deletion and duplicate entries.
- **Admin intake continuity:** source uploads resume from the original SHA-256 and stable candidate offsets. Retried chunks are idempotent on the unique batch/item key and do not overwrite reviewed records. The updated importer endpoint remains branch-only until its release review.

## Conversation isolation

Migration `20261118123742_scope_ai_chat_history_by_exam_program.sql` adds `ai_chats.exam_program_id` with a default of `jupeb`, a foreign key to the exam-program registry and a programme-scoped history index. It was applied to the connected shared Rutex Supabase project `gzyczowqqywesqhqqpdi` on 18 November 2026.

Post-migration verification found 321 existing chat rows, all still tagged `jupeb`, zero JAMB chat rows and zero unexpected programme values. Existing RLS policies were not weakened or replaced; chat ownership remains governed by the existing policies. The shared `useStudyChat` hook filters chat lists, creates, renames, deletes and title updates by the selected programme. The JAMB page calls it with the JAMB prompt and programme ID. Persistent chat history is isolated by `ai_chats.exam_program_id`; all 321 pre-existing records were verified to remain JUPEB after the additive migration. JAMB deliberately skips the local JUPEB textbook RAG collection.

## Verification

The current code head `7a55bd2818281529fc8470fefc65da201fd0c647` passed pull-request validation, repository validation, Android debug compilation and the iOS simulator build/smoke test. The migration rename and documentation update are follow-up commits and require their own final branch-head CI rerun.

A signed-in student/admin mobile walkthrough is still outstanding. A successful unauthenticated HTTP 200 from the Preview SPA shell is not a substitute for that acceptance test.

## Content and release boundaries

The JAMB subject bank still contains zero published question rows and zero import batches. The committed Physics, Chemistry and Biology packs parse to candidate source material, not independently approved questions. Before staging, an authorised administrator must attest to source-use rights; candidates then require human checks for year, wording, option order, duplicates and figures. Missing answer keys must not be invented.

The JAMB syllabus is not marked verified, and a complete official UTME mock remains disabled until the compulsory Use of English content, official exam configuration and source review are complete. Matching the JUPEB UI does not make unverified JAMB content official or gradable.


## Route and feature parity audit — 18 November 2026

| JUPEB area | JAMB equivalent | Assessment |
| --- | --- | --- |
| Home dashboard | `/jamb` | Visual and navigation parity. The JAMB daily card currently starts a timed drill; it is not yet a tracked guided mission with mission history. |
| Past questions and saved questions | `/jamb/past-questions` | Equivalent staged practice flow with JAMB-only questions, saved answers and bookmarks. Availability depends on approved JAMB records. |
| Syllabus | `/jamb/syllabus` | UI parity only. Official topic catalogue and topic tracking remain unavailable until the JAMB syllabus is verified and published. |
| Study Chat / AI tutor | `/jamb/ai` | Shared conversation UI with JAMB prompt, JAMB history partition and no JUPEB syllabus/RAG inheritance. |
| Timed practice | `/jamb/cbt/setup` and `/jamb/cbt/:attemptId` | JAMB server-authoritative practice flow. This is not represented as the full official UTME mock. |
| Study stats | `/jamb/stats` | Dedicated JAMB-only analytics: saved-answer activity, JAMB question coverage, subject distribution, bookmarks, days studied, streaks and recent activity. |
| Achievements | `/jamb/achievements` | Dedicated JAMB-only milestones for practice, consistency and bookmarks. These are Rutex milestones, not official JAMB awards. |
| Chat, friends, discover | Shared platform routes | Intentionally shared social/community features, not exam-content pages. The JAMB discover view does not claim the JUPEB ranking as JAMB performance. |
| Leaderboard | `/jamb/leaderboard` | JAMB has its own route and navigation entry. The ranking is deliberately empty until a server-verified JAMB-only scoring feed exists; JUPEB points are never presented as JAMB ranks. |
| Profile, profile settings, security, notifications, app download | Shared platform routes/components | Intentionally shared account and app services. |
| Admin question operations | `/admin/jamb-questions` | JAMB-specific review/import path; platform admin and activation-code pages remain shared administration. |

### Remaining non-parity items and their blockers

- **Guided daily mission and mission history:** not fully implemented as a JAMB workflow. JUPEB's equivalent depends on a verified topic calendar and topic-linked questions. The JAMB dashboard's current timed-practice shortcut is deliberately not described as a mission. A true version must be driven by reviewed JAMB questions and a verified JAMB topic plan.
- **Official syllabus and topic tracking:** blocked on obtaining, versioning and verifying the applicable JAMB syllabus. No JUPEB topics are substituted.
- **Accuracy, mastery, score-derived awards and ranked leaderboard:** must remain unavailable or explicitly ungraded until approved JAMB answer keys, scored attempt records and a programme-scoped ranking feed are available. Saved option selections are not evidence of correctness.
- **Full official UTME mock:** remains disabled pending compulsory Use of English content, verified current exam configuration and sufficient approved question coverage.

The following pages remain intentionally shared because they are account or platform services rather than exam-specific learning data: chat, friends, leaderboard, discover, profile, profile settings, security settings, notifications and app download. Shared visibility does not grant these routes access to JUPEB-only question or progress data.
