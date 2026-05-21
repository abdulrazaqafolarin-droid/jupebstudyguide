# JUPEB Study Guide — System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL ARCHITECTURE                                │
│                                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────────────┐          │
│  │ Browser  │    │ Android App  │    │     Vercel (CDN)         │          │
│  │ (React)  │───►│ (Capacitor)  │───►│  vite build → dist/      │          │
│  │          │    │              │    │  SPA routing             │          │
│  └────┬─────┘    └──────────────┘    └──────────┬───────────────┘          │
│       │                                         │                           │
│       │  HTTPS / JWT                             │                           │
│       ▼                                         │                           │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                   SUPABASE PLATFORM                              │       │
│  │                                                                  │       │
│  │  ┌──────────────────────────────────────────────────────────┐    │       │
│  │  │             EDGE FUNCTIONS (Deno / TypeScript)            │    │       │
│  │  │                                                           │    │       │
│  │  │  ┌──────────┐  ┌──────────┐  ┌───────────────┐           │    │       │
│  │  │  │chat-proxy│  │ai-tutor  │  │parse-document │           │    │       │
│  │  │  │(streaming│  │(teaching │  │(OCR+question  │           │    │       │
│  │  │  │ AI chat) │  │ prompts) │  │ extraction)   │           │    │       │
│  │  │  └────┬─────┘  └────┬─────┘  └───────┬───────┘           │    │       │
│  │  │       │              │                │                   │    │       │
│  │  │  ┌────▼──────────────▼────────────────▼───────────┐       │    │       │
│  │  │  │           _shared/ AI PIPELINE                  │       │    │       │
│  │  │  │                                                 │       │    │       │
│  │  │  │  ai.ts ──► ai-router.ts ──► provider-health.ts  │       │    │       │
│  │  │  │            (parallel dispatch)  (backoff)       │       │    │       │
│  │  │  └─────────────────────┬───────────────────────────┘       │    │       │
│  │  │                        │                                    │    │       │
│  │  │  ┌─────────────────────▼───────────────────────────┐       │    │       │
│  │  │  │           RAG PIPELINE (NEW)                     │       │    │       │
│  │  │  │                                                 │       │    │       │
│  │  │  │  textbook-ingest ─► textbook-chunk.ts            │       │    │       │
│  │  │  │    (admin upload)    (text splitter)             │       │    │       │
│  │  │  │                          │                       │       │    │       │
│  │  │  │                    textbook-embed.ts              │       │    │       │
│  │  │  │                  (Gemini embedding API)           │       │    │       │
│  │  │  │                          │                       │       │    │       │
│  │  │  │                    textbook-retrieve.ts           │       │    │       │
│  │  │  │               (pgvector similarity search)       │       │    │       │
│  │  │  └──────────────────────────────────────────────────┘       │    │       │
│  │  │                                                              │    │       │
│  │  │  ┌────────────┐  ┌──────────────────┐                       │    │       │
│  │  │  │weekly-reset│  │validate-activation│                       │    │       │
│  │  │  │(leaderboard│  │(activation codes) │                       │    │       │
│  │  │  │ cron)      │  │                   │                       │    │       │
│  │  │  └────────────┘  └──────────────────┘                       │    │       │
│  │  └─────────────────────────────────────────────────────────────┘    │       │
│  │                                                                      │       │
│  │  ┌─────────────────────────────────────────────────────────────┐    │       │
│  │  │              SUPABASE DATABASE (PostgreSQL)                  │    │       │
│  │  │                                                              │    │       │
│  │  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │    │       │
│  │  │  │  profiles   │  │ score_events │  │ leaderboard_weeks │    │    │       │
│  │  │  │  (auth)     │  │ (xp/gamifica)│  │ (weekly champs)   │    │    │       │
│  │  │  └─────────────┘  └──────────────┘  └──────────────────┘    │    │       │
│  │  │                                                              │    │       │
│  │  │  ┌─────────────┐  ┌──────────────────┐  ┌──────────────┐    │    │       │
│  │  │  │  textbooks  │  │ textbook_chunks  │  │custom_questns│    │    │       │
│  │  │  │  (metadata) │  │ (pgvector 768d)  │  │(user-uploadd)│    │    │       │
│  │  │  └─────────────┘  └──────────────────┘  └──────────────┘    │    │       │
│  │  │                                                              │    │       │
│  │  │  + 30 more tables (chat_messages, appointments, services...) │    │       │
│  │  │  + 106 RLS policies + 6 enums                                │    │       │
│  │  └─────────────────────────────────────────────────────────────┘    │       │
│  │                                                                      │       │
│  │  ┌────────────────────────────────────────────┐                     │       │
│  │  │          SUPABASE STORAGE + AUTH            │                     │       │
│  │  │  (PDF uploads, user profiles, JWT tokens)   │                     │       │
│  │  └────────────────────────────────────────────┘                     │       │
│  └──────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
│                                 ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                    AI PROVIDERS (parallel dispatch)                   │       │
│  │                                                                       │       │
│  │  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │       │
│  │  │   GEMINI 2.5     │  │  Kimi K2.6 via    │  │  GROQ            │    │       │
│  │  │   Flash          │  │  NVIDIA NIM       │  │  llama-3.3-70b   │    │       │
│  │  │   (cheapest)     │  │  (free, 40 RPM)   │  │  (fallback)      │    │       │
│  │  │   $0.125/1M in   │  │                   │  │  free tier       │    │       │
│  │  │   $0.75/1M out   │  │                   │  │                  │    │       │
│  │  └────────┬─────────┘  └────────┬──────────┘  └────────┬─────────┘    │       │
│  │           │                     │                       │              │       │
│  │           └──────────┬──────────┴──────────┬────────────┘              │       │
│  │                      ▼                     ▼                           │       │
│  │            First valid response wins    Mid-stream handoff on failure  │       │
│  └─────────────────────────────────────────────────────────────────────────┘      │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                       INTERNAL DATA FLOWS                                        │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐     │
│  │  FLOW 1: Admin uploads textbook (NEW)                                   │     │
│  │                                                                          │     │
│  │  Admin ──► TextbookUploader.tsx ──► POST /textbook-ingest                │     │
│  │                                         │                                 │     │
│  │                                         ▼                                 │     │
│  │                                   chunkText(content)                      │     │
│  │                                         │                                 │     │
│  │                                         ▼                                 │     │
│  │                                   generateEmbeddings(chunks)              │     │
│  │                                    (Gemini text-embedding-004)            │     │
│  │                                         │                                 │     │
│  │                                         ▼                                 │     │
│  │                              INSERT INTO textbooks (metadata)             │     │
│  │                              INSERT INTO textbook_chunks (embeddings)     │     │
│  │                                    (pgvector 768-dim)                    │     │
│  └─────────────────────────────────────────────────────────────────────────┘     │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐     │
│  │  FLOW 2: Student asks AI tutor                                           │     │
│  │                                                                          │     │
│  │  Student ──► AITutor.tsx ──► POST /ai-tutor                              │     │
│  │                                  │                                        │     │
│  │                                  ▼                                        │     │
│  │                          retrieveRelevantChunks(query)                    │     │
│  │                                  │                                        │     │
│  │                                  ▼                                        │     │
│  │                     embed query (Gemini embedding API)                    │     │
│  │                                  │                                        │     │
│  │                                  ▼                                        │     │
│  │                     pgvector cosine similarity search                     │     │
│  │                     SELECT ... ORDER BY embedding <=> $query              │     │
│  │                                  │                                        │     │
│  │                                  ▼                                        │     │
│  │                    buildRAGContext(chunks) → [1] [2] citations            │     │
│  │                    Append to system prompt                                │     │
│  │                                  │                                        │     │
│  │                                  ▼                                        │     │
│  │                    aiChatStream(systemPrompt + RAG, messages)             │     │
│  │                                  │                                        │     │
│  │                                  ▼                                        │     │
│  │                    routerStream() ──► Parallel provider dispatch          │     │
│  │                                  │                                        │     │
│  │                     ┌────────────┼────────────┐                           │     │
│  │                     ▼            ▼            ▼                           │     │
│  │                  Gemini  →  Kimi/NVIDIA  →  Groq                          │     │
│  │                  (winner wins, others aborted)                            │     │
│  │                                  │                                        │     │
│  │                                  ▼                                        │     │
│  │                    SSE stream back to client:                              │     │
│  │                    data: {"type":"references", ...}                       │     │
│  │                    data: {"choices":[{"delta":{"content":"..."}}]}        │     │
│  │                    data: [DONE]                                           │     │
│  └─────────────────────────────────────────────────────────────────────────┘     │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐     │
│  │  FLOW 3: Existing client-side RAG (legacy, still works)                  │     │
│  │                                                                          │     │
│  │  Student ──► TextbookUploader.tsx ──► processPDF(file)                   │     │
│  │                                  │                                        │     │
│  │                                  ▼                                        │     │
│  │                    pdfjs-dist extracts text from PDF                      │     │
│  │                                  │                                        │     │
│  │                                  ▼                                        │     │
│  │                    chunkText(text) (local, in browser)                    │     │
│  │                                  │                                        │     │
│  │                                  ▼                                        │     │
│  │                    generateEmbedding(chunk) ──► Ollama local              │     │
│  │                                  │            or chat-proxy proxy        │     │
│  │                                  ▼                                        │     │
│  │                    store in IndexedDB (browser-local only)                │     │
│  │                                  │                                        │     │
│  │                                  ▼                                        │     │
│  │                    searchRelevantChunks(query) ← cosineSimilarity         │     │
│  │                                  │                                        │     │
│  │                                  ▼                                        │     │
│  │                    Inject context into chat stream                        │     │
│  └─────────────────────────────────────────────────────────────────────────┘     │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐     │
│  │  PROVIDER FAILOVER CHAIN                                                  │     │
│  │                                                                          │     │
│  │  routerText() / routerStream()                                           │     │
│  │       │                                                                  │     │
│  │       ├── try Gemini ─────────────────► success  ──► return              │     │
│  │       │      │ fail (429/no key/timeout)                                 │     │
│  │       │      ▼                                                           │     │
│  │       ├── try Kimi/NVIDIA ───────────► success  ──► return               │     │
│  │       │      │ fail                                                     │     │
│  │       │      ▼                                                           │     │
│  │       └── try Groq ──────────────────► success  ──► return               │     │
│  │              │ fail                                                      │     │
│  │              ▼                                                           │     │
│  │          All providers failed → error response                           │     │
│  │                                                                          │     │
│  │  Backoff: 3 consecutive failures → 30s cooldown per provider             │     │
│  │  Mid-stream: if elected provider dies → handoff to next buffered stream  │     │
│  └─────────────────────────────────────────────────────────────────────────┘     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                        TECHNICAL STACK                                          │
│                                                                                 │
│  Frontend    │  React 18 + Vite 5 + TypeScript 5 + Tailwind 3 + shadcn/ui      │
│  Mobile      │  Capacitor (Android APK build via gradlew)                       │
│  Backend     │  Supabase Edge Functions (Deno 2 / TypeScript)                   │
│  Database    │  PostgreSQL 15 + pgvector (768-dim HNSW index)                   │
│  Auth        │  Supabase Auth (JWT) + Activation Codes                          │
│  AI Primary  │  Gemini 2.5 Flash ($0.125/1M in, $0.75/1M out)                  │
│  AI Fallback │  Kimi K2.6 via NVIDIA NIM (free, 40 RPM)                        │
│  AI Legacy   │  Groq llama-3.3-70b (free tier, existing key)                   │
│  Embedding   │  Gemini text-embedding-004 (768-dim)                             │
│  Storage     │  Supabase Storage (PDFs, images)                                 │
│  Deployment  │  Vercel (frontend) + Supabase (edge functions + DB)              │
│  PDF Parse   │  pdfjs-dist (client-side) / supabase edge fn (server-side)       │
│  Dev Env     │  Android Termux (no laptop)                                      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                     DATABASE TABLES (key ones for RAG)                           │
│                                                                                  │
│  textbooks                          textbook_chunks                              │
│  ───────────                        ───────────────                              │
│  id UUID PK                         id UUID PK                                   │
│  title TEXT                         textbook_id UUID FK → textbooks(id)          │
│  subject TEXT                       chunk_index INT                              │
│  level TEXT                         content TEXT                                 │
│  created_by UUID FK → profiles(id)  embedding VECTOR(768) ← HNSW index           │
│  created_at                         metadata JSONB                               │
│  updated_at                         created_at                                   │
│                                                                                  │
│  RLS: SELECT all, INSERT admin only   RLS: SELECT all, INSERT admin only         │
│                                                                                  │
│  match_textbook_chunks(query_embedding, match_threshold, match_count)            │
│    RETURNS TABLE (id, textbook_id, textbook_title, content, similarity)          │
│    ORDER BY embedding <=> query_embedding                                        │
│    LIMIT match_count                                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```
