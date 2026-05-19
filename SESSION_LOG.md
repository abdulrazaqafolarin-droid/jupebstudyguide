# SESSION LOG — JUPEB Master Study Guide

**Session Started:** Automated Continuous Session  
**Last Updated:** Always append new findings  
**Version:** 1.0  

---

## PROJECT IDENTITY

| Field | Value |
|---|---|
| **Product Name** | JUPEB Master |
| **Full Name** | JUPEB Master - Past Questions Study App |
| **Short Name** | JUPEB Master |
| **Repo** | jupebstudyguide-main |
| **Tagline** | Master Your Exams with Spaced Repetition |
| **Description** | Master JUPEB exams with spaced repetition and AI tutoring. Study Physics, Chemistry & Biology past questions. |
| **Stack** | React 18 + Vite 5 + TypeScript 5 + Tailwind v3 + shadcn/ui |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions) |
| **AI Engine** | Gemini 2.5 Flash via Lovable AI Gateway (ai.gateway.lovable.dev) |
| **Auth** | Supabase Auth (email/password) |
| **Deployment** | Vite dev server (localhost:8080) |

---

## SESSION CONTEXT — WHAT WAS DONE

### Objective
Perform a thorough survey and complete understanding of the entire codebase at the level where we know the app better than the owner.

### Coverage
- Read **100% of source files** (~100+ files)
- Analyzed every hook, component, page, edge function, type definition, data file, and configuration file
- Traced all data flows, state management, authentication, routing, and dependencies

---

## ARCHITECTURE MAP

```
src/
├── main.tsx                          # Entry: createRoot + <App />
├── App.tsx                            # Router + Providers (QueryClient, Tooltip, Auth, BrowserRouter, Toasts)
├── index.css                          # Chalkboard dark theme (HSL tokens, subject colors, animations)
│
├── contexts/
│   └── AuthContext.tsx                # Auth provider: signIn, signUp, signOut, session listener, cross-account purge
│
├── integrations/supabase/
│   ├── client.ts                      # Supabase client singleton
│   └── types.ts                       # Auto-generated DB types (DO NOT EDIT)
│
├── types/
│   ├── question.ts                    # Subject, Question, MCQOption, StudyProgress, StudySession, SUBJECT_INFO
│   └── syllabus.ts                    # SyllabusTopic, DailyTask, UserSubjectCombination, SyllabusProgress, SYLLABUSES
│
├── data/
│   ├── questions.ts                   # Aggregator (~50 hardcoded questions + imports from all year files)
│   ├── questions-2015-actual.ts       # ~100 questions (Chemistry, Biology, Physics 2015 actual)
│   ├── questions-2015-math.ts         # ~50 Math 2015 questions
│   ├── questions-2019-physics.ts      # ~50 Physics 2019 questions (718 lines)
│   ├── questions-2019-chemistry.ts    # ~50 Chemistry 2019 questions
│   ├── questions-2019-math.ts         # ~50 Math 2019 questions
│   ├── questions-2020-biology.ts      # ~50 Biology 2020 questions
│   ├── questions-2020-chemistry.ts    # ~50 Chemistry 2020 questions
│   └── questions-2020-math.ts         # ~50 Math 2020 questions
│   TOTAL: ~500+ hardcoded JUPEB past questions (2015-2020)
│
├── hooks/
│   ├── useUserStorage.ts              # Per-user localStorage namespacing (u:<userId>:<key>) + cross-account purge
│   ├── useStudyProgress.ts            # SM-2 spaced repetition algorithm (SuperMemo 2)
│   ├── useStreak.ts                   # Study streak tracking (stale detection > 1 day)
│   ├── useSyllabusProgress.ts         # 30-day syllabus engine (generate tasks, complete day, reorder subjects)
│   ├── useAchievements.ts             # 27 achievements with condition checks + rarity tiers
│   ├── useNotifications.ts            # In-app + Browser Notification API (auto reminders at 9am/6pm)
│   ├── useStatsSync.ts                # Debounced leaderboard stats push to Supabase user_stats
│   ├── useProfile.ts                  # Profile CRUD + avatar upload to Supabase Storage
│   ├── useCustomQuestions.ts          # Fetch user-uploaded questions from custom_questions table
│   ├── useChat.ts                     # Peer-to-peer messaging (optimistic sends, realtime subscriptions)
│   ├── useAITutorChats.ts             # Persisted AI chat sessions (db-backed, auto-title)
│   ├── usePresence.ts                 # Realtime online/typing presence via Supabase Realtime
│   ├── useLeaderboard.ts              # Real-time top-N leaderboard with profile joins
│   ├── useAttachment.ts               # File attachment processing (base64, preview, validation)
│   ├── use-mobile.tsx                 # Responsive detection
│   └── use-toast.ts                   # Toast notification hook
│
├── pages/
│   ├── Auth.tsx                       # Login/Signup (zod validation, eye toggle, loading states)
│   ├── Index.tsx                      # Main dashboard (hero, overall stats, subject cards, streaks, achievements,
│   │                                  #   leaderboard, quick actions, quiz setup, study view, syllabus, tips)
│   ├── Chat.tsx                       # Peer messaging hub (sidebar + area, responsive layout)
│   ├── Profile.tsx                    # Display name edit + avatar upload (file picker, 4MB limit)
│   └── NotFound.tsx                   # 404 page
│
├── components/
│   ├── ProtectedRoute.tsx             # Auth guard (redirects to /auth if no user)
│   ├── UserAvatar.tsx                 # Avatar with fallback to initials
│   ├── ProgressRing.tsx               # SVG circular progress with gradient
│   │
│   │  === STUDY COMPONENTS ===
│   ├── SubjectCard.tsx                # Per-subject mastery card (icon, progress bar, studied/learned counts)
│   ├── StudyView.tsx                  # Two-mode study (Learn All / Review Due) with shuffle
│   ├── Flashcard.tsx                  # Interactive flip-card (MCQ options + essay mode + rating system)
│   │
│   │  === QUIZ COMPONENTS ===
│   ├── QuizSetup.tsx                  # Quiz builder: subject picker, uniform/per-subject counts (15/30/50)
│   ├── QuizMode.tsx                   # Quiz engine: questions, scoring, timer, results, retry
│   │
│   │  === SYLLABUS COMPONENTS ===
│   ├── SyllabusSetup.tsx              # Subject combination picker (core: physics+chem, elective: bio/math)
│   ├── SyllabusTracker.tsx            # 30-day grid, progress per subject, streak, completion celebration
│   ├── SyllabusDayView.tsx            # Day detail: topics, objectives checklist, self-assessment, mastery score
│   ├── SubjectReorder.tsx             # Drag to reorder subjects mid-syllabus journey
│   │
│   │  === AI COMPONENTS ===
│   ├── AITutor.tsx                    # Modal AI tutor for specific questions (streaming, quick prompts, attachments)
│   ├── FloatingAITutor.tsx            # Persistent floating chat bubble (minimizable, chat history, multi-session)
│   ├── AITeachingPage.tsx             # Full-screen syllabus teaching mode with AI
│   │
│   │  === GAMIFICATION ===
│   ├── StreakDisplay.tsx              # Compact + full streak display with flame animation
│   ├── AchievementsPanel.tsx          # Unlocked/locked badges, progress bar, expandable
│   ├── AchievementBadge.tsx           # Individual achievement badge (icon, name, rarity colors)
│   ├── AchievementPopup.tsx           # New achievement celebration with animation
│   ├── LeaderboardPanel.tsx           # Top-25 live leaderboard with medals, online indicator
│   │
│   │  === UTILITIES ===
│   ├── MathRenderer.tsx               # KaTeX rendering + markdown formatting (bold, italic, code, lists, headers)
│   ├── DocumentUpload.tsx             # OCR document upload (PDF/image/text) with progress
│   ├── NotificationCenter.tsx         # Bell icon, notification list, mark-all-read
│   ├── InstallPrompt.tsx              # PWA install banner
│   ├── NavLink.tsx                    # Navigation link component
│   └── chat/
│       ├── ChatSidebar.tsx            # Conversation list, search users, skeleton loading
│       └── ChatArea.tsx               # Message bubbles, date groups, read receipts, typing indicator
│
│  === SHADCN/UI COMPONENTS (45+) ===
│   ./ui/accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button,
│   calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog,
│   drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu,
│   pagination, popover, progress, radio-group, resizable, scroll-area, select, separator,
│   sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster,
│   toggle, toggle-group, tooltip
│
├── assets/
│   └── rutex-logo.jpg                 # "Built by Rutex" branding logo
│
└── test/
    ├── setup.ts                        # Test environment config
    └── example.test.ts                # Sample test

supabase/
├── config.toml                        # Supabase CLI config
├── functions/
│   ├── ai-tutor/
│   │   └── index.ts                   # Edge function: Gemini AI tutor (3 modes: question, general, syllabus)
│   └── parse-document/
│       └── index.ts                   # Edge function: OCR document parsing + AI question extraction
└── migrations/                        # Database migrations (DO NOT EDIT existing)

Public Assets:
├── favicon.ico, favicon.svg, placeholder.svg
├── pwa-192x192.png, pwa-192x192.svg, pwa-512x512.png
├── robots.txt

Config Files:
├── package.json (name: "vite_react_shadcn_ts", version 0.0.0)
├── vite.config.ts (PWA setup, path alias @/, Lovable tagger)
├── vitest.config.ts
├── tailwind.config.ts (dark mode only, subject colors, custom fonts)
├── postcss.config.js
├── tsconfig.json, tsconfig.app.json, tsconfig.node.json
├── eslint.config.js
├── components.json (shadcn config)
└── .env (Supabase URL, project ID, anon key)
```

---

## DATA FLOW DIAGRAM

```
User Action → Component → Hook → localStorage OR Supabase

LOCALSTORAGE PATH (per-user, key prefix: u:<userId>:):
  - study-progress: SM-2 algorithm data (ease factor, interval, repetitions, next review)
  - streak: current/longest streak, last study date, total days/questions
  - syllabus-progress: 30-day plan state, completed days, subject progress
  - achievements-unlocked: array of unlocked achievement IDs
  - notifications: notification history (max 50)

SUPABASE PATH:
  - auth.users → profiles (auto-created via trigger)
  - profiles: display_name, avatar_url
  - custom_questions: AI-parsed questions from documents
  - conversations + conversation_participants + messages: peer chat
  - ai_chats + ai_chat_messages: AI tutor history
  - user_stats: leaderboard data (upserted via useStatsSync)
```

---

## CRITICAL FILES (NEVER EDIT)

| File | Reason |
|---|---|
| `src/integrations/supabase/client.ts` | Auto-generated Supabase client |
| `src/integrations/supabase/types.ts` | Auto-generated DB types |
| `.env` | Environment variables (secrets) |
| `supabase/migrations/*` | Never edit existing migrations. Add new only. |

---

## ROUTES

| Path | Component | Protected | Description |
|---|---|---|---|
| `/auth` | `Auth.tsx` | No | Login/Signup page |
| `/` | `Index.tsx` + `FloatingAITutor` | Yes | Main dashboard |
| `/chat` | `Chat.tsx` | Yes | Peer-to-peer messaging |
| `/profile` | `Profile.tsx` | Yes | User profile settings |
| `*` | `NotFound.tsx` | No | 404 catch-all |

---

## THEME SYSTEM

- **Dark chalkboard theme** inspired by academic settings
- Background: `hsl(220 20% 10%)` (dark navy-black)
- Primary: `hsl(38 92% 50%)` (warm amber/gold)
- Accent: `hsl(168 76% 42%)` (teal for correct answers)
- Destructive: `hsl(0 72% 51%)` (red for incorrect)
- Subject colors: physics (blue), chemistry (green), biology (pink), math (purple)
- Chalk texture overlay on cards (CSS noise SVG)
- Custom animations: slideInUp, pulseGlow, flashcard 3D flip
- Fonts: Space Grotesk (body), JetBrains Mono (code/math)
- Border radius: 0.75rem default

---

## KNOWN BUGS & ISSUES

1. **Cross-account localStorage leak**: purgeForeignUserData() called on auth change but not on initial page load with recovered session.
2. **AI Gateway dependency**: Both edge functions use Lovable's proxy (ai.gateway.lovable.dev / LOVABLE_API_KEY), not direct Gemini API.
3. **Supabase project mismatch**: .env uses `lsjlehxmfnjpyyjgqdas` but AGENTS.md references different project IDs.
4. **Deno imports**: Edge functions import from deno.land — will fail with --no-remote flag on deploy.
5. **Hardcoded questions**: ~500+ questions in TypeScript files require code deploy to update.
6. **Syllabus progress is localStorage only**: No cross-device sync for syllabus data.
7. **QuizMode lacks time enforcement**: Tracks time but doesn't enforce limits.
8. **PWA cache for API**: Workbox caches Lovable gateway with 1hr TTL — streaming AI responses won't cache properly.

---

## ENV VARS NEEDED

| Variable | Source | Used In |
|---|---|---|
| `VITE_SUPABASE_URL` | .env | Supabase client + Edge function calls |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | .env | Supabase client + Edge function auth |
| `VITE_SUPABASE_PROJECT_ID` | .env | Supabase project reference |
| `LOVABLE_API_KEY` | (not in .env) | ai-tutor edge function |
| `SUPABASE_SERVICE_ROLE_KEY` | (not in .env) | parse-document edge function |

---

## ACHIEVEMENTS SYSTEM (27 total)

| Category | Count | Examples |
|---|---|---|
| Streak | 5 | First Step (1 day), Monthly Master (30 days) |
| Questions Answered | 5 | Getting Started (10), Question Master (1000) |
| Mastery | 4 | First Mastery (10), Grandmaster (200) |
| Accuracy | 3 | Sharp Mind (80%), Perfectionist (90%), Perfect Ten |
| Subject Coverage | 2 | Well Rounded (3 subjects), Renaissance Student (4) |
| Document Uploads | 3 | Content Creator (1), Archive Master (10) |
| Syllabus | 5 | Journey Begins, Syllabus Champion |
| Special | 2 | Night Owl, Early Bird |

---

## EDGE FUNCTIONS API

### ai-tutor (POST)
```
Request: { messages, question?, generalChat?, syllabusTeaching?, topic?, subject?, day?, learningObjectives?, attachment? }
Response: SSE stream (OpenAI-compatible format)
Auth: LOVABLE_API_KEY header
```

### parse-document (POST)
```
Request: { fileBase64, mimeType, documentName, subject, documentText? }
Response: { success, questionsCount, questions[] }
Auth: Bearer token (user session)
```

---

## SESSION CHECKLIST

- [x] Project identity and purpose understood
- [x] Every source file read and catalogued
- [x] Architecture mapped (components, hooks, pages, services)
- [x] Data flow traced (localStorage vs Supabase paths)
- [x] Routing documented
- [x] Theme system analyzed
- [x] Dependencies catalogued
- [x] Known issues identified
- [x] Environment variables documented
- [x] Edge function APIs documented
- [x] Achievement system mapped
- [x] Database tables identified
