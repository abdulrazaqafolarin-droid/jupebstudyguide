# Rutex JAMB — release state

Checked 17 November 2026 against PR #78 and live Supabase project `gzyczowqqywesqhqqpdi`.

## Complete
- JAMB home, past-question browser, timed subject-practice CBT, JAMB-aware AI tutor, syllabus status and admin review UI are implemented in the feature branch.
- Question retrieval, references, bookmarks and practice progress are programme-scoped. JUPEB remains the default programme for existing flows.
- Migration `20261117215633_create_jamb_workspace` is applied to the existing Rutex project after a successful rollback-only SQL preflight.
- Five remote-only migration sources were restored verbatim and the local history reconciled through `20261112011529`.
- New JAMB answer-key, import and CBT data are inaccessible directly to browser roles. Server-owned tables have RLS enabled and service-role-only grants; their Edge Functions must continue to authenticate and authorize every caller.
- CBT snapshots omit answer keys; only reviewed keys score. Missing keys stay ungraded.
- Source importer preserves original wording, options, references, SHA-256 hashes and figure notes; it never invents answers or publishes automatically.

## Live database verification
- Existing JUPEB question records: 3,227; visible published: 2,984 (unchanged after migration).
- JAMB question records: 0 (none auto-published).
- Programme rows: JUPEB + JAMB; 5 JAMB subject rows (Physics/Chemistry/Biology available, Use of English compulsory but unavailable, Mathematics unavailable).
- One published Rutex practice configuration enables only 10/20/40-question single-subject drills. Full official-format mock remains disabled.
- Programme-aware vector/text retrieval RPCs and transactional question-batch publication RPC exist.
- Private `question-source-documents` bucket exists alongside the existing `question-images` bucket.

## Still required before students can use the complete JAMB content experience
1. Deploy updated `ai-tutor`, `chat-proxy` and `question-rag-index` functions, plus new `exam-attempts`, `exam-practice` and `question-import` functions.
2. Enable `VITE_ENABLE_JAMB=true` on the feature-branch Preview environment only, then test the Preview app against the live schema. Keep Production disabled.
3. Stage Physics, Chemistry and Biology through the authenticated admin review flow, verify provenance/rights and review each item. No key/explanation is populated without a reliable answer key; figure questions require original images before publication.
4. Load and verify Use of English and the current official syllabus before any full UTME mock is enabled.

The committed question packs do not supply verified answer keys or worked solutions. Zero JAMB rows in the live student bank is therefore intentional until admin review is complete, not a JUPEB fallback or silent content loss.
