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
- **Admin intake continuity:** source uploads resume from the original SHA-256 and stable candidate offsets. Retried chunks are idempotent on the unique batch/item key and do not overwrite reviewed records. The currently active importer is deployed as `question-import` v8 and supports protocol v2 resumable chunks, stable offsets and duplicate-safe retries. Its live version was confirmed from the Supabase Edge Function registry on 26 November 2026. Administrator authentication, source-rights confirmation and human review remain mandatory.

## Conversation isolation

Migration `20261118123742_scope_ai_chat_history_by_exam_program.sql` adds `ai_chats.exam_program_id` with a default of `jupeb`, a foreign key to the exam-program registry and a programme-scoped history index. It was applied to the connected shared Rutex Supabase project `gzyczowqqywesqhqqpdi` on 18 November 2026.

Post-migration verification found 321 existing chat rows, all still tagged `jupeb`, zero JAMB chat rows and zero unexpected programme values. Existing RLS policies were not weakened or replaced; chat ownership remains governed by the existing policies. The shared `useStudyChat` hook filters chat lists, creates, renames, deletes and title updates by the selected programme. The JAMB page calls it with the JAMB prompt and programme ID. Persistent chat history is isolated by `ai_chats.exam_program_id`; all 321 pre-existing records were verified to remain JUPEB after the additive migration. JAMB tutor retrieval uses the separate JAMB/account textbook index; it never queries the JUPEB collection.

## Verification

The feature branch's latest recorded validation of the privacy-test and migration-alignment changes passed pull-request validation and repository validation, including TypeScript, unit tests, lint, web build, Deno checks, importer/programme-scope regressions and Android debug compilation. The corresponding iOS simulator build also passed install-and-launch verification. The successor APK artifact-only workflow was still running at the last check on 18 November 2026. The newest UI copy/documentation commits require their own branch-head CI completion.

A signed-in student/admin mobile walkthrough is still outstanding. Both Vercel Preview checks are currently blocked by the connected account's daily deployment build limit; a successful unauthenticated HTTP 200 from the Preview SPA shell is not a substitute for authenticated acceptance. PR #78 remains Draft, the JAMB feature flag remains Preview-scoped, and no Production UI deployment was performed.

## Content and release boundaries

The 26 November 2026 live audit found 7,630 JAMB candidate rows already present in `study_questions`, across Use of English (3,822), Chemistry (1,608), Biology (1,457) and Physics (743). All 7,630 are hidden with `review_status = 'needs_review'`; their 7,630 protected answer-key rows are also `needs_review`. There are currently zero student-visible published JAMB rows, zero JAMB import batches and zero JAMB import items. These records are therefore not a student-ready question bank and must not be treated as approved or gradable. The newer resumable importer is active at v8, but its batch tables are empty; do not assume the existing 7,630 candidate rows are linked to an import batch. Before publication, an authorised administrator must confirm source-use rights and independently review source year, wording, option order, duplicates, figures, answer and explanation. Missing answer keys must not be invented.

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
- At the time of that 18 November snapshot, `question-import` v3 was active and supported the resumable/idempotent protocol v2 source upload flow.
- `jamb_daily_missions` is live with RLS and one owner/active-session policy. `anon` and `PUBLIC` have no table grants; authenticated has SELECT/INSERT/UPDATE/DELETE only. Its rollout row count was zero.
- At the time of that 18 November snapshot, the reported JAMB counts were zero question rows and zero import batches. The later 26 November live audit below supersedes those counts.
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

## Shared account and mission polish — 21 November 2026

- **Security Settings:** the TOTP authenticator issuer follows the active exam workspace, so accounts enrolling from JAMB see “JAMB Study Guide” rather than the JUPEB issuer label. The same MFA enrollment and verification implementation remains shared.
- **Daily Mission:** the active JAMB mission header/progress/questions/actions are constrained to the same 3xl reading width as the JUPEB mission experience. The JAMB mission hub and history retain their wider layout.
- **Navigation/account review:** the same BottomNav and HamburgerMenu components serve both programmes. JAMB menu links map to their JAMB routes, shared Chat/Profile/Settings/Friends/Discover pages derive programme context, and Discover avoids importing JUPEB score rankings into JAMB.

- **Onboarding copy:** the shared Chat & Privacy step now receives the active programme label, avoiding JUPEB-specific “classmates” copy in the JAMB onboarding flow. The same mockup, privacy switches and persisted settings are reused.

- **Dashboard onboarding reminder:** JAMB now shows the same dismissible “Finish setting up” nudge as JUPEB for onboarding that was started but not finalized. Its completion lookup and dismissal state are scoped to `jamb`, and the action opens the JAMB onboarding route.

- **Floating AI Tutor motion:** the JAMB floating Tutor now staggers the panel header and composer entrances using the same short fade/blur timing pattern as JUPEB. The JAMB version respects reduced-motion preferences.

- **Dashboard nudge and study metric detail:** the JAMB dashboard now has the per-programme onboarding reminder, and the JAMB Revision Cards “Due Today” metric uses the same flame icon treatment as JUPEB while retaining JAMB's own due count.

- **Syllabus topic rows:** each JAMB topic now uses JUPEB's staggered left-to-right fade/slide entrance, rounded bordered card, expanded-state surface tint and matching row/detail padding. JAMB topic source-page references, objective statements, completion states and Tutor/practice actions remain programme-specific.

- **CBT answer review:** review rows now reuse the shared answer-option component. Correct/incorrect styling is shown only when an approved answer key makes the item gradable; an ungraded saved choice stays in the neutral selected state rather than being mislabeled as wrong.

- **JAMB onboarding mobile layout:** the study-subject tile grid now uses two columns on mobile and three columns at wider breakpoints, matching the compact JUPEB subject-picker layout while retaining the compulsory English notice and locked Mathematics tile.

- **JAMB mission copy:** the mission-history footer now explains only that mission completion is a Rutex study activity, not an official JAMB result; it no longer mentions JUPEB in the student-facing notice.

- **JAMB onboarding terminology:** the syllabus-verification notice now states directly that unreviewed JAMB content will not be used to mark answers correct, without referencing JUPEB in student-facing copy.

- **JAMB Syllabus overview copy:** the introductory note now explains the available source packs, official IBASS links and JAMB-workspace progress without cross-referencing JUPEB or sounding like internal implementation notes.

- **JAMB Leaderboard empty state:** the placeholder now uses the shared trophy-led, centered empty-state hierarchy and “Go Study Now” action. Its copy describes the verified-results requirement without promising a date or displaying synthetic ranks.

## Answer-state and build follow-up — 21 November 2026

- The shared quiz component now imports its class-name helper and preserves the selected state for questions without an approved answer key. Such responses are shown as recorded/neutral, not incorrectly styled as wrong; scored feedback still requires a gradable key.
- JAMB Revision Cards now reads the persisted JAMB answer map from its existing progress hook and imports the answer-feedback icons used by the checked state. This restores the saved-answer activity summary wiring.
- JAMB Past Questions no longer tells a returning learner that an answer key is missing merely because the saved choice has not yet been rechecked in the current page session. It prompts the learner to check against the currently approved answer key instead.

- **Past Questions answer rows:** JAMB now follows the JUPEB question viewer's compact answer-row geometry, label tile size, selected/correct/incorrect colors and inline feedback tags. JAMB still keeps ungraded responses neutral; the visual match does not copy the JUPEB viewer's assumption that every selected response can be scored.

- **Revision Cards answer controls:** the JAMB option rows now match the JUPEB flashcard's larger letter tiles, two-pixel borders, staggered entrance, hover lift and result animation. The approved-key feedback panel and spaced-repetition buttons follow JUPEB's larger feedback hierarchy and motion language. JAMB's server-side answer check remains authoritative: unapproved keys never produce green/red grading or a revealed answer, and ungradable selections remain neutral with an amber notice.

## Syllabus, statistics and admin-manager parity pass — 21 November 2026

- **Syllabus:** the JAMB page now uses the JUPEB page's sticky header, overall progress bar, searchable subject accordions, section/topic expansion, staggered topic cards, per-topic state controls and AI/practice actions. JAMB keeps its source/version-review warning and independent exam_user_syllabus_progress data.
- **Study stats:** the JAMB page now follows the JUPEB two-column overview cards, streak section, chart-card surfaces, subject-performance chart and subject detail cards. Its timed-CBT history is deliberately shown instead of JUPEB's programme-agnostic score-event history; only the signed-in user's JAMB attempts and JAMB saved-answer/revision data are used.
- **Published-question manager:** /jamb/past-questions opens JambAdminQuestionPanel, adapted from the JUPEB AdminQuestionPanel interaction model: add/edit, question options, answer and explanation, difficulty/topic, image upload/crop/positioning, learner preview, delete and drag ordering. The admin modal loads the full selected JAMB subject/year question list through a separately authenticated admin endpoint (maximum 500 rows per list response), not just the student's current 20-question page.
- **Key and audit separation:** admin keys/explanations are read only by the admin-gated question-import manage-question actions. Public JAMB question queries continue to omit correct_answer and explanation; approved answers are stored in study_question_answer_keys. Admin writes require independent answer-key verification and source-rights confirmation. Removal is a soft hide so historical CBT attempt foreign keys and stored review history are preserved. Reorder, create, update and delete decisions write to jamb_question_admin_audit, whose RLS is enabled and whose table privileges are revoked from anon and authenticated.
- **Admin source review:** /admin/jamb-questions remains the separate private-source staging and human-review workflow. It now links to the published-question manager rather than replacing that manager; source intake rights checks and item-level approval remain required.

The parity code is committed on the open Draft PR. GitHub branch-head validation and authenticated signed-in Preview acceptance are still required before this pass can be called fully verified. The Vercel free-tier daily deployment limit currently blocks a fresh Preview for the newest branch head. No JAMB question content has been loaded.

**English source audit — 21 November 2026:** the owner's `JAMB_english_READABLE.txt` file is now included on `feat/rutex-jamb-workspace` (commit `42de10d882d90e887cdcadcf8070caa4eaaedf5e`; source blob `dc486d5ce7e327d82bf04f1ca2ada72df2d919c0`; 1,125,103 bytes). The dedicated parser and fixture tests are committed. It identifies 43 distinct year sections spanning 1978–2026 and 3,914 numbered question entries. Eight year sections (1997, 1998, 1999, 2002, 2003, 2004, 2005 and 2026) supply 750 answer letters and 750 explanations in total; those source suggestions are all marked unverified and require an administrator to independently check them. The remaining 35 year sections provide no answer/explanation pairs. Several older sets have fewer than 100 questions or malformed/missing option markers. The importer preserves passages and flags incomplete material; all candidates remain review-only, with zero publishable without human review. No English questions have been staged or published in Supabase. Do not infer missing keys or silently repair OCR.
## JAMB publication completeness policy — 21 November 2026

The source-review workflow no longer offers an ungraded approval path. Its approval action requires a verified correct option and a non-empty explanation of at least 12 characters; server validation enforces both. A new database migration adds triggers to reject `approved_ungraded` import items and to require each JAMB answer-key row to match an option on the associated question and include a meaningful explanation. The migration is committed but must be applied before deploying the matching Edge Function and admin UI together.


## Multi-image inline positioning round-trip — 26 November 2026

The admin question manager and student question view now share the JUPEB multi-image positioning contract:

- The JAMB admin preview passes every uploaded image to the drag-positioning editor. Each image can be independently long-pressed and moved to a measured text line; keyboard arrow controls remain available.
- The persisted `image_position` value can contain an independent comma-separated text anchor for each image. The shared position helper keeps legacy single-image anchors readable and supplies safe defaults for images without an explicit anchor.
- The JAMB student past-question card now renders the saved image layout instead of always appending images after the question text. Inline, beside, above, image-only and text-only layouts are respected.
- The extra-image fallback below the editor preview was removed for inline mode because the multi-image editor now positions every image itself.
- Regression tests for independent multi-image drag positioning and student inline-image rendering were added from the current JUPEB implementation.

This is a source-level recovery change only. CI and authenticated student/admin Preview acceptance must pass before this parity fix is considered release-ready. Production remains unchanged.


## Admin question-manager parity inventory — 26 November 2026

### Shared editing capabilities

The JAMB and JUPEB managers should share the student-facing editing and media workflow:

- Add/edit question text, objective options, correct answer/explanation, subject, year, category, topic, difficulty and sort order.
- Upload multiple question images with drag/drop input, image preview, remove and upload cleanup. Drag thumbnails to reorder them, or use the accessible earlier/later controls on touch devices; inline text anchors stay attached to the same image.
- Crop a selected image using the free-size rectangle with eight resize handles or optional freehand polygon mode.
- Choose image-only, text-only, image-above, image-beside or inline-within-question-text layout.
- Position each image independently in the inline editor; long-press/touch drag, tap-to-place and keyboard positioning are supported.
- Preview the question using the same layout the student viewer consumes.
- Drag-sort published questions, save, reopen and check that the stored order and image positions round-trip.

The shared media path uses the existing `study_questions.image_position`, legacy `image_url` and multi-image `image_urls` fields. The corresponding Storage and row-update policies are already applied in the shared Supabase database; the migration-source alignment PRs restore those exact migration files to GitHub.

### JAMB-specific review safeguards — preserve these

These are intentional additional controls, not missing JUPEB editor features:

- Source document/publication and exact source reference.
- Required source-rights confirmation and a written permission/rights note before publishing or deleting/hiding a question.
- Answer-key draft status, answer revision tracking, confidence level, confidence note and evidence reference.
- Human verification of the question, options, source and answer before publication.
- Protected answer keys and explanations remain server-side; student question projections do not select them.
- Unverified items stay hidden from learners and unapproved keys do not contribute to CBT scoring.
- Hiding a question preserves protected answer-key and historical CBT attempt records; do not replace this with a direct hard-delete call.
- The JAMB manager performs privileged changes through the programme-aware `question-import` Edge Function rather than copying JUPEB's direct client CRUD path.

### Remaining acceptance checks

1. Upload at least three images, use both crop modes, reorder thumbnails, position two images at different text anchors, save, reopen, remove one image and confirm the remaining anchor still matches its image.
2. Verify the same question on the JAMB student Preview at mobile and desktop widths, including the beside/above/image-only/text-only modes.
3. Drag-sort published questions and verify order survives refresh; confirm review drafts cannot accidentally be published/reordered through the published-question action.
4. Save an unverified answer draft, confirm it remains hidden and ungradable, then independently verify and publish it through the required source/rights workflow.
5. Confirm JAMB student payloads never contain answer keys or explanations before an attempt is submitted and approved review permits them.

This is a source/UI checklist. It does not authorize changing live question rows, approving content, or deploying Production.

## Live database and importer reconciliation — 26 November 2026

Read-only checks against the connected production Supabase project confirmed the following counts. No rows were changed during this audit.

| Measure | Live count | Meaning |
| --- | ---: | --- |
| JAMB `study_questions` rows | 7,630 | Existing JAMB candidate records |
| JAMB hidden + `needs_review` | 7,630 | All current JAMB question rows remain unavailable to students |
| JAMB protected answer-key rows marked `needs_review` | 7,630 | No candidate key is currently approved |
| JAMB visible + published rows | 0 | No student-ready JAMB questions are currently published |
| JAMB import batches | 0 | No active/import-history batch rows are registered |
| JAMB import items linked to batches | 0 | The 7,630 existing rows are not represented in the import-item queue |
| JUPEB `study_questions` rows | 3,227 | Existing JUPEB question records |
| JUPEB visible + published rows | 2,984 | Current learner-visible published JUPEB records |

The 7,630 JAMB rows are distributed as Use of English 3,822, Chemistry 1,608, Biology 1,457 and Physics 743. This is a candidate inventory, not a published bank. Do not make these rows visible, expose their answer keys, or count them as reviewed merely because they exist in `study_questions`.

The Supabase Edge Function registry reports `question-import` ACTIVE at version 8 (updated 26 November 2026). Its deployed source includes protocol v2 resumable staging, duplicate-safe item offsets, administrator/session/entitlement checks, required source-rights confirmation, answer-draft validation, separate protected answer keys, audit records and JAMB-specific question-manager operations. The absence of rows in `question_import_batches` and `question_import_items` means the legacy candidate inventory has not been staged through that current batch workflow. Version 8 is deployed; this documentation update does not deploy or alter it.

The JAMB answer-key protection migration `20261126101025_jamb_protect_answer_key_storage.sql` is already present in the live Supabase migration ledger. Do not replay it. Current Edge Function versions observed read-only are `question-import` v8, `question-rag-index` v4 and `exam-attempts` v6; these deployed versions are distinct from the older v3/v5 references in earlier snapshots.

Programme-scoped activation was also checked read-only. The live `validate-activation` Edge Function is ACTIVE at v47 and accepts both `jupeb` and `jamb`; clients that omit the programme ID remain JUPEB-scoped for backwards compatibility. Its code-generation and code-consumption paths call `generate_activation_codes` and `consume_activation_code` with `p_exam_program_id`, respectively. The live database confirms both RPC signatures accept that programme parameter. When assigning a JAMB subscription, the function writes the JAMB `exam_program_entitlements` row and deliberately does not overwrite legacy JUPEB subscription dates on `profiles`.

The live entitlement tables currently contain JUPEB records only: 51 activation codes (24 used, 27 unused) and 32 entitlement rows (2 with an active paid subscription, 1 with an expired paid subscription and 29 with an expired trial). There are zero JAMB activation codes and zero JAMB entitlement rows. Thus the programme-aware backend is deployed, but JAMB activation codes/subscriptions have not yet been provisioned in the live data. The JAMB subscription UI remains on the unmerged JAMB feature stack; the existing JUPEB activation records are not to be copied or reclassified as JAMB records. No codes were generated and no entitlement records were changed during this audit.


The admin UI at `/admin/jamb-questions` exposes these rows through the explicit “Include hidden questions needing review” toggle. This sets `include_review_queue = true` for the administrator-only `manage-question/list` operation; the normal published-question manager continues to filter to visible `published` rows. The live Edge Function limits each subject/year result to 500 rows. The live inventory spans 156 subject/year groups, with a largest group of 100, so the current per-year query cap does not truncate any of the existing cohorts. An administrator still needs to select the relevant subject and year to work through the full queue.

Additional read-only content/provenance checks found:
- Every one of the 7,630 rows has a source reference, source document name and source question number; none has a populated source page.
- 6,318 rows have a content hash; 1,312 do not.
- All rows have four/five-option arrays in the expected A–D/A–E order. 64 question texts are shorter than eight characters and need correction/verification before approval.
- All 7,630 protected answer-key rows contain an A–E answer label and an explanation of at least 12 characters, but **all remain `needs_review`**. Only six rows currently have a confidence rating, a meaningful confidence note and an evidence reference. These populated answer/explanation fields must be treated as review drafts, not verified keys.
- 3,400 distinct candidate questions have at least one linked `jamb_question_admin_audit` record with `rights_confirmed = true`; 4,230 have no such linked rights-confirmation audit. Do not infer permission from a source filename, source reference or populated answer draft.

The next content task is therefore a controlled admin reconciliation of these 7,630 hidden candidate rows: prioritise the 4,230 without a linked rights audit, restore page-level source references where possible, calculate missing content hashes, fix the 64 short question texts, and independently verify the answer and meaningful explanation against a reliable permitted source. Then use the supported review/publish flow. Until then keep all 7,630 hidden and ungradable. No mass publication or key approval is authorised by this audit.
