# JAMB Workspace UI Parity

## Product rule

The JAMB workspace mirrors the JUPEB workspace's interface, navigation patterns, responsive behavior and shared study tools. It is a separate exam programme inside the same Rutex product, not a different miniature app.

Shared presentation components should be reused where they do not carry programme-specific data. JAMB question content, saved answers, bookmarks, CBT attempts, AI tutor conversations and progress must remain scoped to `jamb`.

## UI parity delivered

- **Workspace navigation:** the same five-slot bottom navigation, drawer structure, account controls and workspace switcher. Direct messages and community destinations remain shared. Shared profile-edit links and chat title/empty states retain the active programme label and JAMB route context. Study Chat opens the programme-aware tutor.
- **Dashboard:** the same animated hero, primary actions, Daily Mission card position, progress ring, subject-card styling, quick actions and study tips. JAMB counts, streaks and milestones are computed from JAMB progress only. The Daily Mission card links to a real timed JAMB drill; its topic-led 30-day lessons remain gated until official syllabus topics are verified.
- **Past questions:** the JUPEB staged flow and controls: subject cards, expandable available-year rows, one-question-at-a-time practice, progress, the jump-to-question modal, saved-answer feedback, question bookmarks and a persistent bookmark history. JAMB content is loaded only from the JAMB question projection.
- **Learn and spaced review:** JAMB Revision Cards provide JAMB-specific Learn All and Review Due cards, shuffle, progress/mastery/due counts, bookmark controls and a JAMB tutor handoff. Learners rate a card after the JAMB answer-check service confirms that its reviewed key is gradable; ungraded questions never reveal a key or enter the mastery schedule. Review scheduling is account-local and separate from JUPEB's study-progress store.
- **Syllabus:** the same searchable subject accordion and sticky header. The current 106-topic catalogue is explicitly provisional and draws from uploaded copies plus checked IBASS references. Per-account JAMB topic tracking is enabled for planning, with a persistent source/version-review warning. Topic-led lessons remain gated until the applicable official syllabus is fully verified.
- **AI tutor:** reuses JUPEB's conversation sidebar, grouped persistent history, message thread, editing/rewind, retry, attachments and composer. It uses the JAMB tutor system prompt and sends `examProgramId: "jamb"` to the chat proxy. Both workspaces expose a PDF textbook library. Text chunks/vectors are stored in IndexedDB under an account-and-programme-specific database; extracted text is sent to the configured embedding service to create vectors, and a network embedding request is also required for search. The browser-local index is not encrypted, so it should be cleared before a shared device changes hands.
- **CBT:** setup and live attempt screens follow the same card, header, progress and interaction language while retaining the JAMB server-authoritative timer and attempt workflow.


- **Textbook/tutor support:** PDF textbooks can be indexed from either tutor screen. Each tutor selects a separate IndexedDB database keyed by account and programme. Extracted text is transmitted to the configured embedding service; the text chunks and returned vectors are stored locally and retrieved only by the matching account/programme code path. Scanned/image-only PDFs are rejected because OCR is not part of this importer. The old pre-isolation `jupeb-rag` browser database is left untouched and is not automatically imported, because its chunks have no account ownership metadata.
- **Offline continuity:** JAMB saved answers and bookmarks are local-first and per-account. Newer answers reconcile by timestamp; local bookmark deletions use persisted tombstones; cloud writes are serialized per question and sync is retried on reconnect/focus/visible events. Automated reconciliation tests cover stale-cloud answers, local deletion and duplicate entries.
- **Admin intake continuity:** source uploads resume from the original SHA-256 and stable candidate offsets. Retried chunks are idempotent on the unique batch/item key and do not overwrite reviewed records. The updated importer is deployed as `question-import` v3 with protocol v2 resumable chunks, stable offsets and duplicate-safe retries. Administrator authentication, source-rights confirmation and human review remain mandatory.

## Conversation isolation

Migration `20261118123742_scope_ai_chat_history_by_exam_program.sql` adds `ai_chats.exam_program_id` with a default of `jupeb`, a foreign key to the exam-program registry and a programme-scoped history index. It was applied to the connected shared Rutex Supabase project `gzyczowqqywesqhqqpdi` on 18 November 2026.

Post-migration verification found 321 existing chat rows, all still tagged `jupeb`, zero JAMB chat rows and zero unexpected programme values. Existing RLS policies were not weakened or replaced; chat ownership remains governed by the existing policies. The shared `useStudyChat` hook filters chat lists, creates, renames, deletes and title updates by the selected programme. The JAMB page calls it with the JAMB prompt and programme ID. Persistent chat history is isolated by `ai_chats.exam_program_id`; all 321 pre-existing records were verified to remain JUPEB after the additive migration. JAMB tutor retrieval uses the separate JAMB/account textbook index; it never queries the JUPEB collection.

## Verification

The feature branch's latest recorded validation of the privacy-test and migration-alignment changes passed pull-request validation and repository validation, including TypeScript, unit tests, lint, web build, Deno checks, importer/programme-scope regressions and Android debug compilation. The corresponding iOS simulator build also passed install-and-launch verification. The successor APK artifact-only workflow was still running at the last check on 18 November 2026. The newest UI copy/documentation commits require their own branch-head CI completion.

A signed-in student/admin mobile walkthrough is still outstanding. Both Vercel Preview checks are currently blocked by the connected account's daily deployment build limit; a successful unauthenticated HTTP 200 from the Preview SPA shell is not a substitute for authenticated acceptance. PR #78 remains Draft, the JAMB feature flag remains Preview-scoped, and no Production UI deployment was performed.

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
| Syllabus | `/jamb/syllabus` | The syllabus screen has UI parity and displays a provisional 106-topic candidate catalogue with JAMB-only per-account progress tracking. Official syllabus certification and topic-led learning remain gated until current IBASS sources and the applicable exam-cycle version are fully verified. |
| Study Chat / AI tutor | `/jamb/ai` | Shared conversation UI with JAMB prompt, JAMB history partition, question context, file attachments and its own per-account textbook index. JAMB does not inherit JUPEB syllabus topics or textbook chunks. |
| Timed practice | `/jamb/cbt/setup` and `/jamb/cbt/:attemptId` | JAMB server-authoritative practice flow. This is not represented as the full official UTME mock. |
| Study stats | `/jamb/stats` | Dedicated JAMB-only analytics: saved-answer activity, JAMB question coverage, subject distribution, bookmarks, days studied, streaks, recent activity, revision-card mastery/due counts and a personal CBT history/trend view. The UI calls the owner-filtered JAMB history action, now deployed in `exam-attempts` v5. It returns only the signed-in user's submitted/expired JAMB summaries and does not return answer keys or question snapshots. A transient request/access error is reported as a backend loading problem; it is no longer described as an unreleased endpoint. |
| Achievements | `/jamb/achievements` | Dedicated JAMB-only milestones for practice, consistency and bookmarks. These are Rutex milestones, not official JAMB awards. |
| Chat, friends, discover | Shared platform features with JAMB route aliases | Messaging and friend functions remain shared, but JAMB Chat/Friends/Discover route aliases preserve JAMB context so public-profile dialogs hide JUPEB badges. JAMB Discover never requests JUPEB weekly score data and shows the people directory without score/rank labels. |
| Leaderboard | `/jamb/leaderboard` | JAMB has its own route and navigation entry. The ranking is deliberately empty until a server-verified JAMB-only scoring feed exists; JUPEB points are never presented as JAMB ranks. |
| Profile, profile settings, security, onboarding, notifications, app download | Shared platform components with JAMB aliases where workspace context matters | `/jamb/profile`, `/jamb/settings/profile`, `/jamb/settings/security` and `/jamb/onboarding` keep the JAMB context, bottom navigation and workspace switcher. JAMB onboarding retains shared theme/privacy/notification steps and replaces JUPEB's syllabus-specific subject-plan setup with a JAMB-specific step for subject focus, exam target, daily goal, school and optional seat details. JAMB preferences are stored in a separate `jambStudy` object with their own completion ID, so they do not overwrite JUPEB syllabus selections. They are also cached per account in local storage: preferred subjects appear first and are labelled in the mission hub, the CBT setup defaults to the first preferred subject, and the preferred daily-goal length is displayed without claiming that study time is automatically tracked. The JAMB profile hides JUPEB achievement badges and JUPEB-only activation-code prompts. |
| Admin question operations | `/admin/jamb-questions` | JAMB-specific review/import path; platform admin and activation-code pages remain shared administration. |

### Remaining non-parity items and their blockers

- **Syllabus-led daily lessons and topic calendar:** still blocked on obtaining and verifying the applicable official JAMB syllabus and mapping reviewed questions to it. The JAMB practice-only daily mission is implemented, but it does not invent topic lessons or pretend to be the JUPEB 30-day syllabus journey.
- **Official syllabus certification and topic-led learning:** still blocked pending full current-IBASS source and exam-cycle verification. The provisional 106-topic outline and JAMB-only per-account progress tracker are available for planning; tracking does not certify official syllabus coverage. No JUPEB topics are substituted.
- **Practice accuracy and leaderboard ranking:** question-level accuracy is available only when approved JAMB answer keys exist. Revision-card mastery is a separate spaced-repetition measure based on the student's recall rating after the server confirms a question is gradable; it does not infer answer correctness. Ranked leaderboard data remains gated until a comparable, programme-scoped JAMB ranking feed exists. Personal CBT score history is served by the deployed owner-filtered `exam-attempts` v5 history action. If the request fails, the UI reports a backend/connection issue rather than a pending release. Saved option selections are not evidence of correctness.
- **Full official UTME mock:** remains disabled pending compulsory Use of English content, verified current exam configuration and sufficient approved question coverage.

JAMB daily mission records use a separate `jamb_daily_missions` table with an owner-and-active-session RLS policy. Migrations `20261118182508_create_jamb_daily_missions` and `20261118182636_tighten_jamb_daily_missions_grants` are applied. The table grants authenticated SELECT/INSERT/UPDATE/DELETE only, no `anon`/`PUBLIC` table access, and had zero rows at rollout. Mission history now syncs to this cloud table while retaining the per-account local-first offline copy. The following pages remain intentionally shared because they are account or platform services rather than exam-specific learning data: chat, friends, leaderboard, discover, profile, profile settings, security settings, notifications and app download. JAMB aliases preserve programme context through profile settings, security settings and onboarding. The JAMB onboarding flow includes its own subject-focus and daily-goal setup without claiming unverified syllabus coverage. Shared visibility does not grant these routes access to JUPEB-only question or progress data.


## Live backend reconciliation — 18 November 2026

- `exam-attempts` v5 is active and contains the authenticated, owner-filtered JAMB CBT history action.
- `question-import` v3 is active and supports the resumable/idempotent protocol v2 source upload flow.
- `jamb_daily_missions` is live with RLS and one owner/active-session policy. `anon` and `PUBLIC` have no table grants; authenticated has SELECT/INSERT/UPDATE/DELETE only. Its rollout row count was zero.
- The latest verified live JAMB counts remain zero question rows and zero import batches. No source material has been staged or published.
- Full official UTME mock, syllabus-led daily lessons, subject coverage beyond Physics/Chemistry/Biology, and ranked leaderboard remain gated by official source verification, English/other content intake and approved answer keys. No JUPEB data is substituted.


**Syllabus update — 18 November 2026:** the JAMB syllabus screen now lists all five uploaded syllabus subjects (Use of English, Mathematics, Physics, Chemistry and Biology) and presents section/topic outlines from the source PDFs. It exposes separate topic progress and flags source review as pending. English and Mathematics remain syllabus-visible but question-bank-unavailable. The outline is sourced from 2025-created uploaded copies; Use of English differs materially from its JAMB-hosted IBASS copy; Physics and Biology are linked to JAMB-hosted PDFs but still need complete line-by-line mapping, so the catalogue is not marked as verified current IBASS content. Topic progress is stored per account, locally first, and reconciled with the JAMB-only cloud table when online.

The JAMB Tutor now accepts syllabus topic links and receives the selected outline as context, with an instruction not to present the uploaded candidate source as a verified current JAMB syllabus. Chat history remains in the JAMB programme partition.


**Progress parity update:** JAMB syllabus topic progress now mirrors the persistence expectation of the existing JUPEB syllabus experience more closely. It remains programme-separated and uses a dedicated JAMB table with account ownership/session RLS. Local-first changes sync across devices when online; JUPEB progress storage and rendering were not modified.

**Chat topic persistence update:** JAMB syllabus entry points create a JAMB tutor thread with its selected topic ID and subject saved in the chat row. When reopening the thread from JAMB tutor history, the tutor reconstructs that topic context from the saved metadata. The same shared chat components (history sidebar, thread view, composer, retry/edit/stop controls and attachments) continue to be reused; the existing social Chat and Profile routes remain shared page implementations under their JAMB aliases.


### Shared social Chat and Profile parity

The social Chat page is intentionally common across programmes, while its title, back destination, Profile/Settings navigation and notification actions are derived from the active ExamProgramContext. Bottom navigation keeps the same five slots and maps Chat/Profile to /jamb/chat and /jamb/profile inside JAMB. The Profile page uses the common account identity/avatar/school/settings components; in JAMB it suppresses JUPEB achievements and presents a JAMB-specific achievements destination. Route-path regression tests cover both programme variants.

The AI Tutor is separate from social Chat. Its saved history is filtered by exam_program_id='jamb'; syllabus-topic launches resolve the latest matching JAMB subject/topic thread and preserve that context when resumed.


Use of English now follows the JAMB-hosted IBASS PDF checked on 18 November 2026, not the uploaded 2025-created copy, because the two differ on passage count, prescribed reading text, lexis/structure topics and oral vowel coverage. The page records the IBASS section structure and 60-question breakdown, and still links the uploaded PDF separately for provenance. This does not certify the specific 2027 syllabus version.


**Syllabus topic-objective coverage:** the JAMB catalogue now contains objective lists on all 106 topics across the five subject entries. The topic counts are Physics 39, Chemistry 18, Biology 23, Mathematics 23 and Use of English 3. These are source-linked objective transcriptions, not a declaration that every 2025 uploaded copy matches the latest IBASS edition or the 2027 cycle.


The JAMB syllabus page count is now **106 topics**: Physics 39, Chemistry 18, Biology 23, Mathematics 23 and Use of English 3. Physics follows the current 39-topic JAMB-hosted IBASS order, while English follows the JAMB-hosted IBASS structure. Other candidate subjects remain subject to current-source reconciliation.


Biology source correction: the official JAMB IBASS syllabus has 23 topics grouped 3 / 9 / 7 / 2 / 2. Biotechnology is integrated under Heredity, not listed as a separate topic. The five-subject catalogue now has 106 topics overall: Physics 39, Chemistry 18, Biology 23, Mathematics 23 and Use of English 3.


Current count: **426 source-mapped objective statements** across 106 topics. Each topic is covered by the syllabus regression test.

## Interface parity follow-up — 21 November 2026

The latest source pass targets visible UI consistency while preserving exam-specific workflows:

- **Dashboard:** JAMB uses the same Rutex logo footer, section entrance order and bottom spacing as JUPEB. The dashboard continues to use shared subject cards, progress panel, streak display, achievement panel, leaderboard frame and global navigation.
- **Past questions:** the sticky title/back/search/bookmark/admin header now uses the JUPEB layout treatment at the subject, year, question and bookmark stages. Search expands into the same header row instead of changing the page structure.
- **Statistics:** both pages use the shared statistics header, overview cards, streak panel, content width, gradient page background and history-aware back behavior. JAMB-only analytics panels use the same staggered fade-and-rise treatment.
- **Timed CBT:** the JAMB attempt keeps its server-authoritative timer and save/submit behavior, but its progress indicator, question-card transitions, navigator interaction and result/review entrances now follow the JUPEB quiz motion language. Reduced-motion preferences are respected.
- **CBT setup and onboarding:** JAMB practice-length controls use the JUPEB quiz preset styling. JAMB subject selection, exam-target and daily-goal controls use matching selection feedback and transition timing.

### Deliberate programme differences

Visual parity does not mean sharing academic or scoring rules. JAMB remains a single-subject server-timed practice attempt with saved answers, review flags and independently approved answer keys. JUPEB retains its existing multi-subject quiz and syllabus workflow. Unverified JAMB answer keys, unavailable question content, syllabus certification and the full official UTME mock remain gated; no JUPEB data is substituted.

### Verification boundary

These changes are committed on the open Draft PR branch. GitHub validation must pass on the final branch head, and signed-in browser/mobile acceptance is still required before declaring full parity. Production remains unchanged.

## Follow-up parity pass — 21 November 2026

- Secondary-page shells: Achievements, Syllabus and Leaderboard now use the same content width and spacing as their JUPEB counterparts. JAMB Syllabus uses the same history-aware Back behavior as JUPEB.
- JAMB daily-mission answer choices now reuse the shared answer-option component used by the JUPEB quiz and JAMB CBT. The state map still distinguishes approved correct/incorrect answers from saved but ungraded answers.
- JAMB revision cards now use the same short directional fade/slide transition as JUPEB question navigation. The transition respects the operating-system reduced-motion preference.
- JAMB onboarding's school-tag helper copy now matches the JUPEB explanation.

The JAMB leaderboard remains a data-contract blocker rather than a visual styling problem: the existing JUPEB weekly score RPC aggregates programme-agnostic score events, while JAMB's independently checked CBT results live in programme-scoped attempt summaries. The UI must not call the shared RPC and accidentally mix programmes. A JAMB-only ranking contract needs to be defined before the page can display real ranks.

## Revision and syllabus consistency — 21 November 2026

- **Revision Cards:** the JAMB subject chooser now reuses the shared selectable-subject tile used in JUPEB quiz setup and JAMB CBT setup, with the same two-column choice grid. The three progress metrics use the JUPEB study-view gradient cards and spacing.
- **Revision card surface:** the JAMB question surface is constrained to the same reading width as the JUPEB flashcard and uses the same directional slide/fade transition when the active question changes. Reduced-motion preferences bypass the transition.
- **Syllabus subject accordions:** JAMB now uses the compact rounded subject-card treatment and subtle hover/selected styling from JUPEB, while retaining its programme-specific objective lists, source provenance and topic tracking.

The shared visual changes do not alter JAMB's content eligibility, answer-key approval, scoring or spaced-review rules.

- **Active Revision Cards header:** after a subject is selected, JAMB now switches from the generic secondary-page header to the same sticky study-session header pattern as JUPEB: Back, subject pill, programme-specific streak and current question position. The streak is computed from JAMB saved answers only.
- **Revision flow order:** the Learn All / Review Due / Shuffle controls now appear before the three study metric cards, matching the JUPEB study-view sequence. The content width and top spacing match the JUPEB study screen.

