# Live Supabase migration source reconciliation — 26 November 2026

## Scope and safety

- Supabase project: `gzyczowqqywesqhqqpdi` (the connected **Jup / jupeb** project used by both JUPEB and the JAMB workspace).
- The remote migration ledger was read from `supabase_migrations.schema_migrations`.
- The repository migration directory was compared with that ledger by the exact `version + name` filename.
- This recovery only restores repository source files. **No migrations were applied, replayed, reset, marked as applied, or otherwise executed against Supabase.**
- No database rows, policies, storage objects, secrets, Edge Functions or deployments were changed.

## Verified result

At the time of this audit the connected Supabase project contained **88 recorded migrations**. Before this recovery, current production `main` had 82 SQL files in `supabase/migrations/`; 18 recorded migration source files were absent by exact version/name, and nine other source files used a different timestamp from the remote ledger even though their SQL contents matched.

This branch now contains **101 migration SQL files**:

- All **88 / 88** remote ledger entries have a matching file named exactly `<version>_<name>.sql`.
- The 18 missing migration sources were restored from the SQL statements retained in the live `supabase_migrations.schema_migrations` rows. This includes the JAMB workspace, programme separation, daily missions, syllabus progress, question-review/audit controls, protected answer-key storage, the inline image position constraint, Storage upsert permissions, multi-image column, subscription/session and compatibility migrations.
- Nine existing source files with SQL that exactly matched the live ledger were renamed to their recorded remote version timestamps.
- The remote `20261106094151_show_question_text_with_images` entry was restored as its own exact source file because the existing local file with that name contains additional DDL and is not the same migration body.

The final automated comparison returned: `remoteLedgerCount = 88`, `matchingRemoteFiles = 88`, `missing = []`.

## Thirteen local-only migrations deliberately retained

These files are present on the branch but have no exact version/name entry in the current live migration ledger:

1. `20261011000001_security_hardening.sql`
2. `20261011000002_ai_rate_limits.sql`
3. `20261011000003_perf_batch_rpc.sql`
4. `20261012000001_question_rag.sql`
5. `20261014000001_daily_missions.sql`
6. `20261014000002_harden_score_awards.sql`
7. `20261025000001_chat_feature_repairs.sql`
8. `20261027000001_study_chat_topic_threads.sql`
9. `20261028000001_prelaunch_hardening.sql`
10. `20261030000000_student_onboarding.sql`
11. `20261030000001_profile_school_and_seat.sql`
12. `20261030000002_notification_parity.sql`
13. `20261106190000_show_question_text_with_images.sql`

They have **not** been deleted, rewritten, renamed to guessed versions, or run. Some features may have been created by later remote migrations or applied through another path; that must be determined from their SQL and the live schema before any future migration push. In particular, the last file contains DDL in addition to the data update stored under remote version `20261106094151`; it is not safe to treat those files as interchangeable.

## Important integration warning

The JAMB feature branches were created before this filename reconciliation and may still carry old timestamped migration filenames, including a different timestamp for answer-draft or protected-answer-key migrations. Before merging the JAMB workspace stack, rebase/reconcile its migration directory against this branch and remove duplicate version files only after comparing exact SQL and the live ledger. Never run a bulk `supabase db push` or replay migrations as part of that source-only merge.

## Next verification before release

1. Review the thirteen local-only SQL files and compare their effects with the live schema, functions, policies and remote migration statements.
2. Reconcile the older JAMB feature branches with these exact remote migration filenames.
3. Run Supabase security/performance advisors read-only and keep pre-existing findings separate from this source-recovery task.
4. Only then consider any new migration, and only for a genuinely unapplied schema change with a reviewed forward migration and rollback plan.

