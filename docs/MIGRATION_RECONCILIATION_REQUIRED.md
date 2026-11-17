# Supabase migration reconciliation — Rutex JAMB workspace

## Target boundary

- Supabase project: `gzyczowqqywesqhqqpdi` — the existing JUPEB/Rutex project.
- Connected account: `Jup`.
- Do not use or link the inactive project `nuazxccflykwgkaiipii`.
- JAMB extends the existing Rutex application, project, database, auth, storage and Edge Function infrastructure. It is not a second backend.

## Read-only reconciliation performed 17 November 2026

The connected project's remote migration ledger includes five migrations not present in this repository's `supabase/migrations/` directory:

| Version | Remote migration name |
|---|---|
| `20261110104713` | `fix_question_image_storage_upsert_rls_and_inline_position` |
| `20261110110601` | `enforce_admin_question_update_with_check` |
| `20261110153625` | `add_multiple_question_images` |
| `20261111234530` | `single_device_subscriptions_and_question_lockdown` |
| `20261112011529` | `restore_one_day_trial_and_fix_social_access` |

These versions exist in the live migration ledger, but their SQL files were not found in this repository snapshot. The local migration directory contains 80 SQL files and ends at `20261106235900_ai_chat_question_references.sql`. Local and remote histories must not be treated as interchangeable.

The live `public.study_questions` table was inspected directly. Its current columns include the original JUPEB question fields, `search_document` (tsvector), and `image_urls` (jsonb). The live `public.study_question_embeddings` table stores `question_id`, vector `embedding`, `updated_at`, `source_updated_at` and `content_hash`. The JAMB candidate adds a separate programme-aware search document and does not replace the existing live `search_document` column or index.

The live `study_questions_select_policy` was confirmed to require an active auth session and an existing profile; it permits admins or visible questions for users with a current trial/subscription. The JAMB candidate preserves those conditions and additionally filters student rows to `review_status = 'published'`. The live RAG functions currently have six-argument vector and five-argument text signatures, both SECURITY DEFINER. The candidate replaces them with programme-filtered variants and grants execution only to `service_role`.

The candidate retains the legacy direct admin editor for JUPEB but explicitly prevents it from inserting/updating/deleting JAMB rows. JAMB writes use private source staging, human review and transactional publication. The new programme catalogue and source-document storage policies check the active auth session.

## Why this remains a release gate

This catalog comparison confirms the current live shape, but it does **not** reconstruct the SQL bodies of the five remote-only migrations above. Recover those files from deployment history or another authoritative source and check them into the repository before CLI replay, database reset or schema push is considered safe.

The JAMB SQL remains under `supabase/pending/` and has not been applied. Do not use `db reset`, `db push` or destructive schema synchronization to force the histories together. After recovering those files and reviewing the pending migration, apply only the additive JAMB migration to this existing project, then run the post-migration checks and Supabase security/performance advisors.

## Required post-migration verification

1. JUPEB question counts, visibility, image reads, AI retrieval and direct admin CRUD remain unchanged.
2. Student SELECT remains restricted by active session, existing entitlements, question visibility, programme and publication status.
3. Authenticated users cannot read private answer keys, staging batches/items or server-owned CBT tables directly.
4. JAMB staging verifies the uploaded source hash on the server and requires an active admin session, rights attestation and human review before publication.
5. CBT snapshots contain no answer keys. Only independently reviewed keys contribute to scoring; questions without keys remain ungraded.
6. JAMB retrieval/embeddings are programme-isolated; legacy JUPEB retrieval defaults to JUPEB.
7. Verify RLS, grants, storage policies, Edge Function deployment and Vercel preview before enabling `VITE_ENABLE_JAMB`.
