# FIX LOG — Autonomous Fix Loop

Started: 2026-05-20

## TIER 1 — CRITICAL

| # | File | Issue | Status |
|---|------|-------|--------|
| T1-1 | `src/integrations/supabase/types.ts` | Stale types: `messages` table missing 6 columns | FIXED |
| T1-2 | `src/hooks/useActivation.ts:72-74` | Unguarded `user?.id` passed to RPC | FIXED |
| T1-3 | `src/hooks/useChat.ts:346` | `conversations.insert({})` — all columns optional with DB defaults | NOT A BUG |
| T1-4 | `src/pages/Chat.tsx:41` | Empty `catch {}` — swallowed errors on startConversation | FIXED |
| T1-5 | `src/components/chat/GroupCreateDialog.tsx:79,90` | Empty error handlers on group/member creation | FIXED |

## TIER 2 — BUGS

| # | File | Issue | Status |
|---|------|-------|--------|
| T2-1 | `src/hooks/useScoreAwarder.ts:39` | Dedup path → `result?.data?.duplicate` | FIXED |
| T2-2 | `src/components/ActivationGate.tsx:48-58` | Dead code effect (query profiles, ignore result) | FIXED |
| T2-3 | `src/components/ActivationGate.tsx:72` | Redundant `navigate("/")` before `reload()` | FIXED |
| T2-4 | `src/pages/StudyPastQuestions.tsx:212-225` | Stale `userAnswers` from autoSubmittedRef guard | FIXED |
| T2-5 | `src/hooks/useChat.ts:193` | `.then()` with no handler on is_read update | FIXED |
| T2-6 | `src/hooks/useChat.ts:251` | No error guard on conversation `updated_at` after send | FIXED |
| T2-7 | `src/hooks/useChat.ts:282` | No error guard on conversation `updated_at` after image | FIXED |
| T2-8 | `src/hooks/useChat.ts:305` | No error guard on reaction `supabase.update()` | FIXED |

## TIER 3 — RELIABILITY

| # | File | Issue | Status |
|---|------|-------|--------|
| T3-1 | `src/hooks/useActivation.ts:44-45` | Silent catch on admin profile update | FIXED |
| T3-2 | `src/hooks/usePresence.ts:17` | `NodeJS.Timeout` browser type | FIXED |
| T3-3 | `src/components/AITutor.tsx:92` | Silent catch on RAG failure | FIXED |
| T3-4 | `src/components/DocumentUpload.tsx:144` | Fragile JSON extraction | FIXED |
| T3-5 | `src/components/ProtectedRoute.tsx:48-49` | Silent catch on admin profile update | FIXED |
| T3-6 | `src/components/chat/ChatArea.tsx:176` | `(activeConv as any)` type cast → proper optional chaining | FIXED |

## TIER 4 — QUALITY

| # | File | Issue | Status |
|---|------|-------|--------|
| T4-1 | 6 files | Hardcoded admin email → shared `src/lib/adminEmail.ts` | FIXED |
| T4-2 | 2 hooks | Duplicated week boundary → shared `src/lib/weekBoundary.ts` | FIXED |
| T4-3 | `vite.config.ts:4` | `lovable-tagger` unconditional import → try-catch dynamic | FIXED |
| T4-4 | ActivationGate + ActivationPrompt | Duplicated activation UI | NOTED |
| T4-5 | `GroupCreateDialog.tsx` + `useChat.ts` | Duplicate `Profile` interface → import from useChat | FIXED |

## TIER 5 — PERFORMANCE

| # | File | Issue | Status |
|---|------|-------|--------|
| T5-1 | `src/hooks/useChat.ts:77-145` | N+1 queries: 3-5 per conversation → 5 total queries | FIXED |
| T5-2 | `src/hooks/useLeaderboard.ts:84` | Re-fetch on every INSERT → 500ms debounce | FIXED |
| T5-3 | `src/pages/admin/AdminDashboard.tsx:86` | `limit(5000)` on profile query | PENDING |

---

## Summary

**Total found: 24 issues** (across 5 tiers)
**Fixed: 21**
**Not a bug: 1** (T1-3)
**Noted: 1** (T4-4 — ActivationPrompt is separate component)
**Pending: 1** (T5-3 — AdminDashboard limit(5000), needs aggregate RPC rewrite)

## 🔴 NEEDS YOUR ATTENTION
- **T5-3**: AdminDashboard uses `limit(5000)` on profiles + activation_codes queries. Proper fix requires a Supabase RPC for aggregate counts instead of fetching all rows. Needs your decision: create new RPC functions or leave limit in place?
- **Study Chat**: Core chat functionality (DM, groups, reactions, typing indicators, presence) is structurally complete. Missing for production: push notifications, message pagination (infinite scroll), and message delete/edit. These are feature additions, not bugs.

---

## BATCH 2 — Deep-Dive Page Audit (2026-05-20)

| # | File | Issue | Severity | Status |
|---|------|-------|----------|--------|
| B2-1 | `src/components/QuizMode.tsx:207-214` | Timer not reset on "Try Again" → quiz unplayable if timer expired | HIGH | FIXED |
| B2-2 | `src/components/FloatingAITutor.tsx:312` | Array index `key={i}` on mutable message list (supports editMessage) | HIGH | FIXED |
| B2-3 | `src/components/QuizMode.tsx:92` | `hasRealAnswer` variable shadows function on line 36 | MEDIUM | FIXED |
| B2-4 | `src/components/ProgressRing.tsx:47-52` | Duplicate SVG gradient `id="progressGradient"` breaks multiple rings | MEDIUM | FIXED |
| B2-5 | `src/components/FloatingAITutor.tsx:100-102` | Empty `catch {}` on RAG search silences errors | MEDIUM | FIXED |
| B2-6 | `src/components/FloatingAITutor.tsx:153-155` | Empty `.catch(() => {})` on textbook count fetch | LOW | FIXED |
| B2-7 | `src/components/InstallPrompt.tsx:14-17` | `isStandalone` initializes `false` → flash of install prompt for installed users | MEDIUM | FIXED |
| B2-8 | `src/components/SyllabusTracker.tsx:272-297` | Streak calculation `daysDiff <= streak+1` counts non-consecutive days | MEDIUM | FIXED |
| B2-9 | `src/components/AchievementsPanel.tsx:14-21` | Dead code `getRarityColor()` function, never called | LOW | FIXED |
| B2-10 | `src/components/StudyView.tsx:6` | Unused import `CheckCircle` from lucide-react | LOW | FIXED |
| B2-11 | `src/components/LeaderboardPanel.tsx:3` | Unused import `Medal` from lucide-react | LOW | FIXED |
| B2-12 | `src/components/TextbookUploader.tsx:7` | Unused import `getTextbookCount` | LOW | FIXED |
| B2-13 | `src/hooks/useAchievements.ts:290-304` | Effect re-evaluates all 34 achievements on every render (`stats` object ref) | MEDIUM | FIXED |
| B2-14 | `src/hooks/useSyllabusProgress.ts:54` | Unsafe `topic.subtopics[0]` access → renders "undefined" in UI | MEDIUM | FIXED |
| B2-15 | `src/hooks/useSyllabusProgress.ts:119` | `as any` cast bypasses type safety | LOW | FIXED |
| B2-16 | `src/hooks/useAITutorChats.ts:112-132` | Race condition: `deleteChat` mid-stream loses assistant response | MEDIUM | FIXED |
| B2-17 | `src/components/QuizMode.tsx:5` | Unused imports (Trophy, Star, Zap, Target, Brain) | LOW | FIXED |

**Batch 2 total found: 17 issues**
**Fixed: 17**
**New total (all tiers): 41 found, 38 fixed, 1 NAB, 1 noted, 1 pending**

## Batch 2 Summary
- All 3 HIGH and 7 MEDIUM items fixed
- All 7 LOW items fixed
- Zero TypeScript compilation errors after all fixes
- No new pending items — T5-3 (AdminDashboard limit) remains as the only pending item from Batch 1
