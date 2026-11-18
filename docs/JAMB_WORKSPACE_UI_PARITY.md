# JAMB Workspace UI Parity

## Product rule

The JAMB workspace mirrors the JUPEB workspace's interface, navigation patterns, responsive behavior and shared study tools. It is a separate exam programme inside the same Rutex product, not a different miniature app.

Shared presentation components should be reused where they do not carry programme-specific data. JAMB question content, saved answers, bookmarks, CBT attempts, AI tutor conversations and progress must remain scoped to `jamb`.

## UI parity delivered

- **Workspace navigation:** the same five-slot bottom navigation, drawer structure, account controls and workspace switcher. Direct messages and community destinations remain shared. Study Chat opens the programme-aware tutor.
- **Dashboard:** the same animated hero, primary actions, progress ring, subject-card styling, quick actions and study tips. JAMB counts, streaks and milestones are computed from JAMB progress only.
- **Past questions:** the same staged learning flow: subject selection, available year selection, question practice, saved answer feedback and a bookmark history. JAMB content is loaded only from the JAMB question projection.
- **Syllabus:** the same searchable subject accordion and sticky header. The UI does not fabricate topics. Topic tracking remains unavailable until official JAMB syllabus material is verified and published.
- **AI tutor:** reuses JUPEB's conversation sidebar, grouped persistent history, message thread, editing/rewind, retry, attachments and composer. It uses the JAMB tutor system prompt and sends `examProgramId: "jamb"` to the chat proxy.
- **CBT:** setup and live attempt screens follow the same card, header, progress and interaction language while retaining the JAMB server-authoritative timer and attempt workflow.

## Conversation isolation

Migration `20261118000001_scope_ai_chat_history_by_exam_program.sql` adds `ai_chats.exam_program_id` with a default of `jupeb`. Existing rows therefore remain JUPEB rows. A programme-scoped index supports each user's history. The shared `useStudyChat` hook filters chat lists, creates, renames, deletes and title updates by the selected programme. The JAMB page calls it with the JAMB prompt and programme ID. JAMB deliberately skips the local JUPEB textbook RAG collection.

The migration is committed to the feature branch but must be applied to the intended Supabase environment before the new persistent JAMB history can be used there. It has not been applied to production as part of this UI parity work.

## Verification

The PR validation workflow covers TypeScript, unit tests, lint, the JAMB import fixtures, programme-aware question retrieval and CBT scoring, Edge Function types, the web build and Android compilation. See the PR checks for the final status of the current head.

## Explicitly not enabled by visual parity

The JAMB syllabus is not marked verified, and a complete official UTME mock remains disabled until the compulsory Use of English content, official exam configuration and source review are complete. Matching the JUPEB UI does not make unverified JAMB content official or gradable.
