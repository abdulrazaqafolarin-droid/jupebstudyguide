# JUPEB live question-bank readiness audit — 26 November 2026

This document records a read-only inspection of the connected production Supabase project on 26 November 2026. No question rows, answer keys, entitlements, activation codes, storage objects or deployment settings were changed.

## Current JUPEB inventory

| Subject | Visible + published | Hidden + published | Total rows |
| --- | ---: | ---: | ---: |
| Biology | 680 | 17 | 697 |
| Chemistry | 786 | 69 | 855 |
| Mathematics | 715 | 66 | 781 |
| Physics | 803 | 91 | 894 |
| **Total** | **2,984** | **243** | **3,227** |

The 243 hidden rows still carry `review_status = 'published'`, but every one is `hidden = true`. The student question-bank RLS policy requires both `hidden = false` and `review_status = 'published'`, so these rows are not currently returned to students.

Do not bulk-unhide them. The data does not support treating their `published` status as proof of a completed review:

- All 243 lack `reviewed_by`, `reviewed_at`, `source_ref`, `source_document`, `source_page`, `source_question_number`, `source_batch_id` and `content_hash`.
- Biology: 17 hidden rows, including 12 objective questions with incomplete/invalid option arrays and 3 with no explanation.
- Chemistry: 69 hidden rows. All 33 objective rows have incomplete/invalid option arrays; the theory/practical rows also contain missing answers and/or explanations.
- Mathematics: 66 hidden objective rows, 8 without a correct answer.
- Physics: 91 hidden rows. The objective subset contains incomplete option arrays and missing answer/explanation data; all 14 theory rows lack a stored answer.

These quality signals explain why hiding the rows is protective. The exact per-row intent for each `hidden` flag is not recorded in a dedicated reason column. Before restoring any of these questions to the learner bank, an administrator should re-establish source provenance, restore original question/option structure, verify answers and explanations, compute the content hash, record the reviewer and review timestamp, then publish through the supported manager. Keep all 243 hidden until that review is complete.

## JUPEB activation and subscriptions

A separate read-only check of the current programme entitlement records found:

| Record | JUPEB | JAMB / UTME |
| --- | ---: | ---: |
| Activation codes | 51 | 0 |
| Used activation codes | 24 | 0 |
| Unused activation codes | 27 | 0 |
| Entitlement rows | 32 | 0 |
| Active paid entitlements | 2 | 0 |
| Expired paid entitlements | 1 | 0 |
| Expired trial entitlements | 29 | 0 |

The deployed `validate-activation` Edge Function is ACTIVE at v47. It accepts an explicit `exam_program_id` of `jupeb` or `jamb`, defaults older requests to JUPEB, and passes the programme ID into both `generate_activation_codes` and `consume_activation_code`. Both live database RPC signatures accept the programme ID. The JAMB branch's `useActivation(programId)` reads the matching programme-specific entitlement; `ProtectedRoute` determines whether a path is JAMB or JUPEB and wraps it in the corresponding `ActivationGate`. This was verified in source; JAMB codes/entitlement rows have not yet been provisioned in the live data.

The legacy JUPEB profile subscription columns differ from entitlement data for two records in the date/start/duration aggregates. There are no active legacy-profile subscriptions without a matching JUPEB entitlement. The current main-branch JUPEB `useActivation` hook reads `exam_program_entitlements` directly, so entitlement rows are the access source of truth. Do not overwrite entitlement dates from legacy profile fields as a bulk repair; inspect any affected account separately before making a change.

## Current recovery decisions

1. Keep the 243 hidden JUPEB rows hidden until provenance, question completeness, answers and explanations are reviewed.
2. Keep JUPEB and JAMB entitlements/codes programme-scoped; do not reclassify or copy JUPEB activation codes into JAMB.
3. Continue using the deployed programme-aware activation backend, but treat live JAMB provisioning as outstanding (zero JAMB code and entitlement rows).
4. Any production data repair or publication needs a separate reviewed plan and explicit authorization. This audit is evidence only, not permission to update live rows.
