# JAMB feature-stack migration alignment — 26 November 2026

## Purpose

This branch aligns the JAMB feature stack's Supabase migration source filenames with the live shared JUPEB/JAMB Supabase project. It is stacked on `feat/jamb-programme-subscription-countdown-2026-11-26` (PR #86's head), which itself extends the JAMB workspace branch (PR #78).

## Verified result

The connected `gzyczowqqywesqhqqpdi` project has 88 recorded migrations. The JAMB feature stack now has 101 migration SQL files, including an exact version/name match for every remote ledger entry:

- Remote ledger entries: **88**
- Matching source files: **88**
- Missing remote source files: **0**
- Local-only migration files retained: **13**

This was verified by comparing the exact `<version>_<name>.sql` filename against the connected database's `supabase_migrations.schema_migrations` list.

## Changes in this branch

- Restored three source files missing from the older JAMB stack: `admin_delete_question_rpc`, the exact `show_question_text_with_images` data migration, and the embedding-trigger execution restriction.
- Renamed eleven migration filenames to the exact timestamps recorded by the live database. Their SQL bodies were checked against the remote stored statements before renaming.
- Preserved the full JAMB workspace, programme/entitlement, missions, syllabus progress, answer-review, answer-confidence and protected-answer-key migration sources.

## Local-only files retained for further inspection

The same 13 local-only files remain on this branch:

- `20261011000001_security_hardening.sql`
- `20261011000002_ai_rate_limits.sql`
- `20261011000003_perf_batch_rpc.sql`
- `20261012000001_question_rag.sql`
- `20261014000001_daily_missions.sql`
- `20261014000002_harden_score_awards.sql`
- `20261025000001_chat_feature_repairs.sql`
- `20261027000001_study_chat_topic_threads.sql`
- `20261028000001_prelaunch_hardening.sql`
- `20261030000000_student_onboarding.sql`
- `20261030000001_profile_school_and_seat.sql`
- `20261030000002_notification_parity.sql`
- `20261106190000_show_question_text_with_images.sql`

They were not deleted, replayed or assigned guessed remote versions. The last file contains additional DDL beyond the one-line update recorded under remote version `20261106094151`.

## Safety and merge order

- No SQL was executed or applied by this branch.
- No Supabase data, migration history, policies, Storage objects, Edge Functions, secrets or Vercel deployments were changed.
- Do not run `supabase db push`, `db reset`, or bulk schema synchronization while integrating this branch.
- This migration repair must be reviewed before the JAMB UI/subscription stack is merged into main. After this PR merges into its feature base, PR #88 will inherit the aligned migrations automatically.
- Coordinate with PR #91, which performs the same remote-ledger source recovery against production `main`; avoid merging conflicting migration directory snapshots out of order.

