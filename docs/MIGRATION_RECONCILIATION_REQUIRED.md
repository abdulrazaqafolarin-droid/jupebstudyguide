# Supabase migration reconciliation — Rutex JAMB workspace

## Target boundary

- Supabase project: `gzyczowqqywesqhqqpdi` — the existing JUPEB/Rutex project.
- Connected account: `Jup`.
- Do not use or link the inactive project `nuazxccflykwgkaiipii`.
- JAMB extends the existing Rutex application, project, database, auth, storage and Edge Function infrastructure. It is not a second backend.

## Read-only reconciliation performed 17 November 2026

The connected project's remote migration ledger contains five migrations that were missing from the local `supabase/migrations/` directory at the start of this implementation:

| Version | Remote migration name |
|---|---|
| `20261110104713` | `fix_question_image_storage_upsert_rls_and_inline_position` |
| `20261110110601` | `enforce_admin_question_update_with_check` |
| `20261110153625` | `add_multiple_question_images` |
| `20261111234530` | `single_device_subscriptions_and_question_lockdown` |
| `20261112011529` | `restore_one_day_trial_and_fix_social_access` |

The SQL bodies were recovered read-only from the live `supabase_migrations.schema_migrations.statements` arrays and restored verbatim as the five timestamped migration files under `supabase/migrations/`. The recovered files contain the original statement text stored by Supabase. The migration directory now contains 85 files and ends at `20261112011529_restore_one_day_trial_and_fix_social_access.sql`. The remote migration ledger and repository source are now reconciled through this version; no migration history rows were changed to achieve that reconciliation.

The live `public.study_questions` table was inspected directly. Its current columns include the original JUPEB question fields, `search_document` (tsvector), and `image_urls` (jsonb). The live `public.study_question_embeddings` table stores `question_id`, vector `embedding`, `updated_at`, `source_updated_at` and `content_hash`. The JAMB candidate adds a separate programme-aware search document and does not replace the existing live `search_document` column or index.

The live `study_questions_select_policy` was confirmed to require an active auth session and an existing profile; it permits admins or visible questions for users with a current trial/subscription. The JAMB candidate preserves those conditions and additionally filters student rows to `review_status = 'published'`. The live RAG functions currently have six-argument vector and five-argument text signatures, both SECURITY DEFINER. The candidate replaces them with programme-filtered variants and grants execution only to `service_role`.

The candidate retains the legacy direct admin editor for JUPEB but explicitly prevents it from inserting/updating/deleting JAMB rows. JAMB writes use private source staging, human review and transactional publication. The new programme catalogue and source-document storage policies check the active auth session.

## JAMB migration status

The five remote-only migration sources have been restored. The additive JAMB foundation is applied successfully to the same live project and recorded as `20261117215633_create_jamb_workspace`. The exact SQL passed a rollback-only transaction preflight before execution; subsequent checks confirmed the new tables, programme-scoped RPCs, source bucket and deny-by-default table grants. The source is now `supabase/migrations/20261117215633_create_jamb_workspace.sql`.

Do not rerun this migration against the live project. Do not use `db reset` or destructive schema synchronization. The five recovered files represent already-applied history and must not be re-executed. Deploy the Edge Functions, run JUPEB/JAMB integration checks, and stage/review source material before enabling the Preview feature flag.

## Security advisor interpretation after JAMB migration

The advisor lists nine new JAMB tables as RLS-enabled with no policies. This is intentional deny-by-default: the migration revokes `PUBLIC`, `anon` and `authenticated` privileges for answer keys, import data, configuration, syllabus and CBT attempt tables; only `service_role` receives access. Edge Functions must remain the only application access path and must authenticate the bearer token, check the active device session and enforce ownership/admin status. Per-user bookmark/progress tables have authenticated owner policies; programme registry reads require an active session.

Other security findings (including the `current_leaderboard` SECURITY DEFINER view, pre-existing elevated RPCs and mutable search paths) were observed before this migration and are not introduced by JAMB. They are not bulk-modified in this feature.

## Required post-migration verification

1. JUPEB question counts, visibility, image reads, AI retrieval and direct admin CRUD remain unchanged.
2. Student SELECT remains restricted by active session, existing entitlements, question visibility, programme and publication status.
3. Authenticated users cannot read private answer keys, staging batches/items or server-owned CBT tables directly.
4. JAMB staging verifies the uploaded source hash on the server and requires an active admin session, rights attestation and human review before publication.
5. CBT snapshots contain no answer keys. Only independently reviewed keys contribute to scoring; questions without keys remain ungraded.
6. JAMB retrieval/embeddings are programme-isolated; legacy JUPEB retrieval defaults to JUPEB.
7. Verify RLS, grants, storage policies, Edge Function deployment and Vercel preview before enabling `VITE_ENABLE_JAMB`.

## Existing advisor baseline (checked before applying JAMB SQL)

The Supabase security and performance advisors were run read-only against the live project before the pending JAMB migration was applied. They reported existing findings unrelated to JAMB: three RLS-enabled tables without policies (`login_security_counters`, `notification_action_tokens`, and `study_question_embedding_jobs`); one SECURITY DEFINER view (`current_leaderboard`); 27 functions with mutable search paths; and many existing SECURITY DEFINER RPC grants exposed to anon/authenticated roles. The performance advisor also reported existing unindexed foreign keys, RLS init-plan warnings, multiple permissive policies, a duplicate index and unused indexes.

These findings are recorded as a pre-existing project baseline, not introduced by this JAMB branch. They must be triaged separately with the existing JUPEB application owner. The new JAMB policies use scalar subqueries for auth/session checks where appropriate to avoid per-row re-evaluation; do not weaken or bulk-rewrite unrelated production policies as part of this feature.
