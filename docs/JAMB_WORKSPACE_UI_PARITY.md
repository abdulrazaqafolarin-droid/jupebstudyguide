# JAMB Workspace UI Parity

## Product rule

The JAMB workspace mirrors the JUPEB workspace's interface, navigation patterns, responsive behavior and shared study tools. It is a separate exam programme inside the same Rutex product, not a different miniature app.

Shared presentation components should be reused where they do not carry programme-specific data. JAMB question content, saved answers, bookmarks, CBT attempts, AI tutor conversations and progress must remain scoped to `jamb`.

## UI parity delivered

- **Workspace navigation:** the same five-slot bottom navigation, drawer structure, account controls and workspace switcher. Direct messages and community destinations remain shared. Shared profile-edit links and chat title/empty states retain the active programme label and JAMB route context. Study Chat opens the programme-aware tutor.
- **Dashboard:** the same animated hero, primary actions, Daily Mission card position, progress ring, subject-card styling, quick actions and study tips. JAMB counts, streaks and milestones are computed from JAMB progress only. The Daily Mission card links to a real timed JAMB drill; its topic-led 30-day lessons remain gated until official syllabus topics are verified.
- **Past questions:** the JUPEB staged flow and controls: subject cards, expandable available-year rows, one-question-at-a-time practice, progress, the jump-to-question modal, saved-answer feedback, question bookmarks and a persistent bookmark history. JAMB content is loaded only from the JAMB question projection.
- **Learn and spaced review:** JAMB Revision Cards provide JAMB-specific Learn All and Review Due cards, shuffle, progress/mastery/due counts, bookmark controls and a JAMB tutor handoff. Learners rate a card after the JAMB answer-check service confirms that its reviewed key is gradable; ungraded questions never reveal a key or enter the mastery schedule. Review scheduling is account-local and separate from JUPEB's study-progress store.
- **Syllabus:** the same searchable subject accordion and sticky header. The UI does not fabricate topics. Topic tracking remains unavailable until official JAMB syllabus material is verified and published.
- **AI tutor:** reuses JUPEB's conversation sidebar, grouped persistent history, message thread, editing/rewind, retry, attachments and composer. It uses the JAMB tutor system prompt and sends `examProgramId: "jamb"` to the chat proxy. Both workspaces expose a PDF textbook library. Text chunks/vectors are stored in IndexedDB under an account-and-programme-specific database; extracted text is sent to the configured embedding service to create vectors, and a network embedding request is also required for search. The browser-local index is not encrypted, so it should be cleared before a shared device changes hands.
- **CBT:** setup and live attempt screens follow the same card, header, progress and interaction language while retaining the JAMB server-authoritative timer and attempt workflow.


- **Textbook/tutor support:** PDF textbooks can be indexed from either tutor screen. Each tutor selects a separate IndexedDB database keyed by account and programme. Extracted text is transmitted to the configured embedding service; the text chunks and returned vectors are stored locally and retrieved only by the matching account/programme code path. Scanned/image-only PDFs are rejected because OCR is not part of this importer. The old pre-isolation `jupeb-rag` browser database is left untouched and is not automatically imported, because its chunks have no account ownership metadata.
- **Offline continuity:** JAMB saved answers and bookmarks are local-first and per-account. Newer answers reconcile by timestamp; local bookmark deletions use persisted tombstones; cloud writes are serialized per question and sync is retried on reconnect/focus/visible events. Automated reconciliation tests cover stale-cloud answers, local deletion and duplicate entries.
- **Admin intake continuity:** source uploads resume from the original SHA-256 and stable candidate offsets. Retried chunks are idempotent on the unique batch/item key and do not overwrite reviewed records. The updated importer endpoint remains branch-only until its release review.

## Conversation isolation

Migration `20261118123742_scope_ai_chat_history_by_exam_program.sql` adds `ai_chats.exam_program_id` with a default of `jupeb`, a foreign key to the exam-program registry and a programme-scoped history index. It was applied to the connected shared Rutex Supabase project `gzyczowqqywesqhqqpdi` on 18 November 2026.

Post-migration verification found 321 existing chat rows, all still tagged `jupeb`, zero JAMB chat rows and zero unexpected programme values. Existing RLS policies were not weakened or replaced; chat ownership remains governed by the existing policies. The shared `useStudyChat` hook filters chat lists, creates, renames, deletes and title updates by the selected programme. The JAMB page calls it with the JAMB prompt and programme ID. Persistent chat history is isolated by `ai_chats.exam_program_id`; all 321 pre-existing records were verified to remain JUPEB after the additive migration. JAMB tutor retrieval uses the separate JAMB/account textbook index; it never queries the JUPEB collection.

## Verification

The current code head `7a55bd2818281529fc8470fefc65da201fd0c647` passed pull-request validation, repository validation, Android debug compilation and the iOS simulator build/smoke test. The migration rename and documentation update are follow-up commits and require their own final branch-head CI rerun.

A signed-in student/admin mobile walkthrough is still outstanding. A successful unauthenticated HTTP 200 from the Preview SPA shell is not a substitute for that acceptance test.

## Content and release boundaries

The JAMB subject bank still contains zero published question rows and zero import batches. The committed Physics, Chemistry and Biology packs parse to candidate source material, not independently approved questions. Before staging, an authorised administrator must attest to source-use rights; candidates then require human checks for year, wording, option order, duplicates and figures. Missing answer keys must not be invented.

The JAMB syllabus is not marked verified, and a complete official UTME mock remains disabled until the compulsory Use of English content, official exam configuration and source review are complete. Mathematics is visibly locked in the onboarding subject guide until its Rutex question content is reviewed and published. Matching the JUPEB UI does not make unverified JAMB content official or gradable.


## Route and feature parity audit — 18 November 2026

| JUPEB area | JAMB equivalent | Assessment |
| --- | --- | --- |
| Home dashboard | `/jamb` | Follows the JUPEB dashboard structure and quick-action layout. The Daily Mission card opens the separate JAMB practice-only mission hub and history; it does not claim the JUPEB 30-day syllabus journey. |
| Past questions and saved questions | `/jamb/past-questions` | Equivalent staged practice flow with JAMB-only questions, saved answers and bookmarks. Availability depends on approved JAMB records. |
| Learn All and Review Due flashcards | `/jamb/study` | Objective-only spaced revision with JAMB-checked answers and a separate JAMB review schedule. Ungraded keys cannot be revealed or mastered. |
| Daily mission and mission history | `/jamb/daily-mission` | Practice-only daily subject sets, resumable answer checks and JAMB-only mission history. It does not claim syllabus lessons or a topic calendar before official verification. |
| Syllabus | `/jamb/syllabus` | UI parity only. Official topic catalogue and topic tracking remain unavailable until the JAMB syllabus is verified and published. |
| Study Chat / AI tutor | `/jamb/ai` | Shared conversation UI with JAMB prompt, JAMB history partition and no JUPEB syllabus/RAG inheritance. |
| Timed practice | `/jamb/cbt/setup` and `/jamb/cbt/:attemptId` | JAMB server-authoritative practice flow. This is not represented as the full official UTME mock. |
| Study stats | `/jamb/stats` | Dedicated JAMB-only analytics: saved-answer activity, JAMB question coverage, subject distribution, bookmarks, days studied, streaks, recent activity, revision-card mastery/due counts and a personal CBT history/trend view. The UI calls the owner-filtered JAMB history action; that action is branch-only and not yet deployed, so the live page clearly reports history as unavailable until backend release. |
| Achievements | `/jamb/achievements` | Dedicated JAMB-only milestones for practice, consistency and bookmarks. These are Rutex milestones, not official JAMB awards. |
| Chat, friends, discover | Shared platform features with JAMB route aliases | Messaging and friend functions remain shared, but JAMB Chat/Friends/Discover route aliases preserve JAMB context so public-profile dialogs hide JUPEB badges. JAMB Discover never requests JUPEB weekly score data and shows the people directory without score/rank labels. |
| Leaderboard | `/jamb/leaderboard` | JAMB has its own route and navigation entry. The ranking is deliberately empty until a server-verified JAMB-only scoring feed exists; JUPEB points are never presented as JAMB ranks. |
| Profile, profile settings, security, onboarding, notifications, app download | Shared platform components with JAMB aliases where workspace context matters | `/jamb/profile`, `/jamb/settings/profile`, `/jamb/settings/security` and `/jamb/onboarding` keep the JAMB context, bottom navigation and workspace switcher. JAMB onboarding retains shared theme/privacy/notification steps and replaces JUPEB's syllabus-specific subject-plan setup with a JAMB-specific step for subject focus, exam target, daily goal, school and optional seat details. JAMB preferences are stored in a separate `jambStudy` object with their own completion ID, so they do not overwrite JUPEB syllabus selections. They are also cached per account in local storage: preferred subjects appear first and are labelled in the mission hub, the CBT setup defaults to the first preferred subject, and the preferred daily-goal length is displayed without claiming that study time is automatically tracked. The JAMB profile hides JUPEB achievement badges and JUPEB-only activation-code prompts. |
| Admin question operations | `/admin/jamb-questions` | JAMB-specific review/import path; platform admin and activation-code pages remain shared administration. |

### Remaining non-parity items and their blockers

- **Syllabus-led daily lessons and topic calendar:** still blocked on obtaining and verifying the applicable official JAMB syllabus and mapping reviewed questions to it. The JAMB practice-only daily mission is implemented, but it does not invent topic lessons or pretend to be the JUPEB 30-day syllabus journey.
- **Official syllabus and topic tracking:** blocked on obtaining, versioning and verifying the applicable JAMB syllabus. No JUPEB topics are substituted.
- **Practice accuracy and leaderboard ranking:** question-level accuracy is available only when approved JAMB answer keys exist. Revision-card mastery is a separate spaced-repetition measure based on the student's recall rating after the server confirms a question is gradable; it does not infer answer correctness. Ranked leaderboard data remains gated until a comparable, programme-scoped JAMB ranking feed exists. Personal CBT score history is wired to the signed-in user's server-scored attempts but remains unavailable until the branch-only history action is deployed. Saved option selections are not evidence of correctness.
- **Full official UTME mock:** remains disabled pending compulsory Use of English content, verified current exam configuration and sufficient approved question coverage.

JAMB daily mission records use a separate `jamb_daily_missions` table with owner-only RLS. The migration is included in this branch; until it is applied, the feature falls back to per-account local storage and displays a local-sync fallback. The following pages remain intentionally shared because they are account or platform services rather than exam-specific learning data: chat, friends, leaderboard, discover, profile, profile settings, security settings, notifications and app download. JAMB aliases preserve programme context through profile settings, security settings and onboarding. The JAMB onboarding flow includes its own subject-focus and daily-goal setup without claiming unverified syllabus coverage. Shared visibility does not grant these routes access to JUPEB-only question or progress data.
