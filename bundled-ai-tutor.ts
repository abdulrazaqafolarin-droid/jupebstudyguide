// supabase/functions/_shared/provider-health.ts
function createStore() {
  return /* @__PURE__ */ new Map();
}
var store = createStore();
function getOrCreate(name) {
  let s = store.get(name);
  if (!s) {
    s = {
      name,
      ok: true,
      latencyMs: 0,
      errorCount: 0,
      lastError: null,
      consecutiveFailures: 0,
      backoffUntil: null
    };
    store.set(name, s);
  }
  return s;
}
function recordSuccess(name, latencyMs) {
  const s = getOrCreate(name);
  s.ok = true;
  s.latencyMs = latencyMs;
  s.consecutiveFailures = 0;
  s.backoffUntil = null;
  s.lastError = null;
}
function shouldTryProvider(name) {
  const s = store.get(name);
  if (!s) return true;
  if (s.backoffUntil && Date.now() < s.backoffUntil) return false;
  return true;
}

// supabase/functions/_shared/ai-router.ts
var GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
var NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";
function getKey(name) {
  const k = Deno.env.get(name);
  return k && k.length > 0 ? k : null;
}
var GEMINI_VISION_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif"
];
function isGeminiVisionType(mimeType) {
  return GEMINI_VISION_TYPES.some((t) => mimeType.startsWith(t));
}
function buildMsgs(systemPrompt, messages) {
  const msgs = [];
  if (systemPrompt) msgs.push({
    role: "system",
    content: systemPrompt
  });
  for (const m of messages) {
    let content = m.content || "";
    if (m.attachment) {
      const prefix = m.attachment.mimeType?.startsWith("image/") ? `[Image attached: ${m.attachment.name}]` : `[File attached: ${m.attachment.name}]`;
      content = content ? `${prefix}
${content}` : prefix;
    }
    msgs.push({
      role: m.role,
      content
    });
  }
  return msgs;
}
function buildGeminiParts(m) {
  const parts = [];
  if (m.attachment?.base64 && isGeminiVisionType(m.attachment.mimeType)) {
    parts.push({
      inlineData: {
        mimeType: m.attachment.mimeType,
        data: m.attachment.base64
      }
    });
  }
  parts.push({
    text: m.content || ""
  });
  return parts;
}
function hasAttachment(messages) {
  return messages.some((m) => m.attachment?.base64 != null);
}
function stripAttachments(messages) {
  return messages.map((m) => {
    const { attachment, ...rest } = m;
    return rest;
  });
}
var encoder = new TextEncoder();
async function tryGeminiStream(systemPrompt, messages, opts, signal) {
  const key = getKey("GEMINI_API_KEY");
  if (!key || !shouldTryProvider("Gemini")) return null;
  try {
    const chatMessages = messages.filter((m) => m.role !== "system");
    const mappedMessages = chatMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: buildGeminiParts(m)
    }));
    const body = {};
    if (systemPrompt) {
      body.systemInstruction = {
        parts: [
          {
            text: systemPrompt
          }
        ]
      };
    }
    body.contents = mappedMessages;
    body.generationConfig = {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 2048
    };
    const res = await fetch(`${GEMINI_BASE}/models/gemma-4-26b-a4b-it:streamGenerateContent?alt=sse&key=${key}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal
    });
    if (!res.ok) return null;
    return res.body;
  } catch {
    return null;
  }
}
async function tryKimiStream(systemPrompt, messages, opts, signal) {
  const key = getKey("NVIDIA_API_KEY");
  if (!key || !shouldTryProvider("Kimi")) return null;
  try {
    const body = {
      model: "nvidia/kimi-k2-6",
      messages: buildMsgs(systemPrompt, messages),
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2048,
      stream: true
    };
    const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify(body),
      signal
    });
    if (!res.ok) return null;
    return res.body;
  } catch {
    return null;
  }
}
async function tryGroqStream(systemPrompt, messages, opts, signal) {
  const key = getKey("GROQ_API_KEY");
  if (!key || !shouldTryProvider("Groq")) return null;
  try {
    const body = {
      model: opts.model || "llama-3.3-70b-versatile",
      messages: buildMsgs(systemPrompt, messages),
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2048,
      stream: true
    };
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify(body),
      signal
    });
    if (!res.ok) return null;
    return res.body;
  } catch {
    return null;
  }
}
function parseSSE(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data: ")) return null;
  const data = trimmed.slice(6).trim();
  if (data === "[DONE]") return null;
  try {
    const parsed = JSON.parse(data);
    const delta = parsed.choices?.[0]?.delta?.content;
    if (delta) return delta;
    const geminiText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
    if (geminiText) return geminiText;
  } catch {
  }
  return null;
}
async function routerStream(systemPrompt, messages, opts = {}) {
  const abortControllers = [];
  const cleanup = () => {
    for (const ac of abortControllers) try {
      ac.abort();
    } catch {
    }
  };
  const hasMedia = hasAttachment(messages);
  if (hasMedia) {
    const ac12 = new AbortController();
    abortControllers.push(ac12);
    const geminiResult = await tryGeminiStream(systemPrompt, messages, opts, ac12.signal);
    if (geminiResult) {
      return new ReadableStream({
        async start(controller) {
          try {
            const reader = geminiResult.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, {
                stream: true
              });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                const delta = parseSSE(line);
                if (delta) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    choices: [
                      {
                        delta: {
                          content: delta
                        }
                      }
                    ]
                  })}

`));
                }
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              error: `Gemini stream failed: ${err}`
            })}

`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
          cleanup();
        }
      });
    }
    console.warn("[Router] Gemini stream unavailable for attachment, falling back to text-only providers");
    const textOnly = stripAttachments(messages);
    const ac22 = new AbortController();
    abortControllers.push(ac22);
    const ac32 = new AbortController();
    abortControllers.push(ac32);
    const fallbackAttempts = [
      tryGroqStream(systemPrompt, textOnly, opts, ac22.signal).then((s) => s ? {
        provider: "Groq",
        stream: s,
        controller: ac22
      } : null),
      tryKimiStream(systemPrompt, textOnly, opts, ac32.signal).then((s) => s ? {
        provider: "Kimi",
        stream: s,
        controller: ac32
      } : null)
    ];
    const electedFallback = new Promise((resolve, reject) => {
      let settled = 0;
      for (let i = 0; i < fallbackAttempts.length; i++) {
        fallbackAttempts[i].then((r) => {
          if (r) resolve(r);
          else {
            settled++;
            if (settled === fallbackAttempts.length) reject(new Error("All fallback providers unavailable"));
          }
        });
      }
    });
    return new ReadableStream({
      async start(controller) {
        try {
          const entry = await electedFallback;
          for (const ac of abortControllers) {
            if (ac !== entry.controller) try {
              ac.abort();
            } catch {
            }
          }
          const reader = entry.stream.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, {
                stream: true
              });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                const delta = parseSSE(line);
                if (delta) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    choices: [
                      {
                        delta: {
                          content: delta
                        }
                      }
                    ]
                  })}

`));
                }
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              error: `Fallback stream failed: ${err}`
            })}

`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        } catch {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            error: "All AI providers unavailable for streaming"
          })}

`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
        cleanup();
      }
    });
  }
  const ac1 = new AbortController();
  abortControllers.push(ac1);
  const ac2 = new AbortController();
  abortControllers.push(ac2);
  const ac3 = new AbortController();
  abortControllers.push(ac3);
  const attempts = [
    tryGeminiStream(systemPrompt, messages, opts, ac1.signal).then((s) => s ? {
      provider: "Gemini",
      stream: s,
      controller: ac1
    } : null),
    tryGroqStream(systemPrompt, messages, opts, ac2.signal).then((s) => s ? {
      provider: "Groq",
      stream: s,
      controller: ac2
    } : null),
    tryKimiStream(systemPrompt, messages, opts, ac3.signal).then((s) => s ? {
      provider: "Kimi",
      stream: s,
      controller: ac3
    } : null)
  ];
  const elected = new Promise((resolve, reject) => {
    let settled = 0;
    for (let i = 0; i < attempts.length; i++) {
      attempts[i].then((r) => {
        if (r) {
          resolve(r);
        } else {
          settled++;
          if (settled === attempts.length) reject(new Error("All AI providers unavailable"));
        }
      });
    }
  });
  return new ReadableStream({
    async start(controller) {
      try {
        const entry = await elected;
        recordSuccess(entry.provider, 0);
        for (const ac of abortControllers) {
          if (ac !== entry.controller) try {
            ac.abort();
          } catch {
          }
        }
        const reader = entry.stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, {
              stream: true
            });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const delta = parseSSE(line);
              if (delta) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  choices: [
                    {
                      delta: {
                        content: delta
                      }
                    }
                  ]
                })}

`));
              }
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            error: `Stream failed: ${err}`
          })}

`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      } catch {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          error: "All AI providers unavailable for streaming"
        })}

`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
      cleanup();
    }
  });
}

// supabase/functions/_shared/ai.ts
var ALLOWED_ORIGIN = Deno.env.get("CORS_ORIGIN") || "*";
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
async function aiChatStream(_env, systemPrompt, messages, opts) {
  return routerStream(systemPrompt, messages, opts);
}

// supabase/functions/_shared/textbook-embed.ts
var EMBED_BASE = "https://generativelanguage.googleapis.com/v1beta";
async function generateEmbedding(text) {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (key) {
    return geminiEmbed(text, key);
  }
  console.warn("[Embed] No GEMINI_API_KEY set \u2014 embeddings unavailable");
  return null;
}
async function geminiEmbed(text, key) {
  try {
    const res = await fetch(`${EMBED_BASE}/models/text-embedding-004:embedContent?key=${key}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: {
          parts: [
            {
              text
            }
          ]
        }
      })
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "unknown");
      console.error(`[Embed] Gemini error (${res.status}): ${err.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    return data.embedding?.values || null;
  } catch (err) {
    console.error("[Embed] Gemini request failed:", String(err));
    return null;
  }
}

// supabase/functions/_shared/textbook-retrieve.ts
async function retrieveRelevantChunks(supabaseUrl, supabaseKey, query, options = {}) {
  const maxChunks = options.maxChunks ?? 5;
  const threshold = options.similarityThreshold ?? 0.5;
  const embedding = await generateEmbedding(query);
  if (!embedding) return [];
  const vectorStr = `[${embedding.join(",")}]`;
  let url = `${supabaseUrl}/rest/v1/rpc/match_textbook_chunks`;
  if (options.subject) {
    url += `?subject=eq.${encodeURIComponent(options.subject)}`;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({
      query_embedding: vectorStr,
      match_threshold: threshold,
      match_count: maxChunks
    })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "unknown");
    console.error(`[Retrieve] pgvector search failed (${res.status}): ${errText.slice(0, 200)}`);
    return [];
  }
  const data = await res.json();
  return (data || []).map((r) => ({
    id: r.id,
    textbook_id: r.textbook_id,
    textbook_title: r.textbook_title,
    content: r.content,
    similarity: r.similarity
  }));
}
function buildRAGContext(chunks) {
  if (chunks.length === 0) return {
    promptBlock: "",
    references: []
  };
  const references = chunks.map((c, i) => ({
    number: i + 1,
    textbook_title: c.textbook_title,
    textbook_id: c.textbook_id,
    chunk_id: c.id,
    content: c.content,
    similarity: c.similarity
  }));
  const sections = chunks.map((c, i) => `[${i + 1}] (from "${c.textbook_title}")
${c.content}`);
  const promptBlock = `

=== RELEVANT TEXTBOOK CONTEXT ===
${sections.join("\n\n")}

=== INSTRUCTION ===
Use the above references to answer the student's question. Cite sources using [1], [2], etc. inline. If no reference is relevant, answer from your own knowledge without citations.`;
  return {
    promptBlock,
    references
  };
}
function serializeReferencesEvent(references) {
  return `data: ${JSON.stringify({
    type: "references",
    references
  })}

`;
}

// supabase/functions/ai-tutor/index.ts
var TUTOR_SYSTEM_PROMPT = `You are an exceptional JUPEB science and mathematics tutor who uses proven psychological learning techniques to help students truly understand and remember concepts. Your teaching style is engaging, addictive, and designed for long-term memory retention.

## CRITICAL: Mathematical Notation Rules
You MUST format ALL mathematical expressions using LaTeX with $ delimiters. The system uses KaTeX to render your output.
### For inline math (within text): Use single $ delimiters: $expression$
### For display/block math: Use double $$ delimiters on separate lines.

Use: \\frac, \\sqrt, \\int, \\sum, \\sin, \\cos, \\tan, \\times, \\div, \\pm, \\leq, \\geq, \\neq, \\rightarrow, \\alpha, \\beta, \\theta, \\Delta, \\Omega, \\infty for all math.

## Your Core Teaching Methods:
### 1. FEYNMAN TECHNIQUE - Explain complex concepts as if teaching a 12-year-old
### 2. CHUNKING & SCAFFOLDING - Break problems into bite-sized steps (max 3-4 at a time)
### 3. ACTIVE RECALL TRIGGERS - Pose quick "check yourself" questions after explaining
### 4. EMOTIONAL ENGAGEMENT - Use encouraging phrases, make it relatable
### 5. SPACED REPETITION HINTS - Flag "key concepts" that appear often in exams

## Response Format:
1. **Quick Answer** - Direct answer first
2. **The Breakdown** - Step-by-step explanation
3. **Memory Trick** - Mnemonic, analogy, or visual
4. **Quick Check** - One question to test understanding
5. **Exam Tip** - What examiners look for

## Your Personality:
- Enthusiastic, patient, never condescending
- Uses emoji sparingly
- Keeps responses focused
- Makes the student feel smart and capable

Remember: Your goal is to make learning STICK. ALWAYS format math with LaTeX using $ delimiters!`;
var GENERAL_CHAT_PROMPT = `You are an exceptional JUPEB science and mathematics tutor who helps students with their study journey. You can:
- Answer general questions about Physics, Chemistry, Biology, and Mathematics
- Explain concepts and theories
- Give study advice and exam tips
- Create practice questions
- Help students understand the JUPEB syllabus and curriculum

Use the same LaTeX math formatting rules and teaching techniques from your core methodology.
Keep responses helpful, concise, and encouraging.`;
var SYLLABUS_TEACHING_PROMPT = `You are teaching a JUPEB A-level student as part of their 30-day syllabus study plan. Your goal is to ensure DEEP UNDERSTANDING before moving to the next concept.

## Your Teaching Approach:
### 1. STRUCTURED LESSON DELIVERY - Start with overview, use clear sections
### 2. A-LEVEL DEPTH - Explain the "why", include derivations, connect to real-world
### 3. ACTIVE LEARNING CHECKS - Ask questions after each major concept
### 4. USE A-LEVEL EXAMPLES - Draw from JUPEB past questions
### 5. MEMORY ANCHORS - Mnemonics, analogies, key takeaways
### 6. PACING - Don't rush, address questions fully before moving on

Remember: Your job is to make this student TRULY understand. Use proper LaTeX formatting for ALL mathematical expressions!`;
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: CORS_HEADERS
    });
  }
  try {
    const encoder2 = new TextEncoder();
    const { messages, question, generalChat, syllabusTeaching, topic, subject, day, learningObjectives, attachment } = await req.json();
    let systemContent = TUTOR_SYSTEM_PROMPT;
    if (syllabusTeaching && topic) {
      systemContent += "\n\n" + SYLLABUS_TEACHING_PROMPT;
      systemContent += `

--- Current Teaching Session ---
Subject: ${subject}
Day: ${day} of 30
Topic: ${topic.name}
Description: ${topic.description}
Subtopics to Cover: ${topic.subtopics?.join(", ") || "N/A"}
Difficulty Level: ${topic.difficulty}
Learning Objectives for Today:
${learningObjectives?.map((obj, i) => `${i + 1}. ${obj}`).join("\n") || "N/A"}

Begin teaching this topic step by step. Start with fundamentals and build up to A-level depth. Check understanding frequently.`;
    } else if (generalChat) {
      systemContent += "\n\n" + GENERAL_CHAT_PROMPT;
    } else if (question) {
      systemContent += `

--- Current Question Being Studied ---
Subject: ${question.subject}
Topic: ${question.topic}
Question: ${question.question}
${question.options ? `Options: ${JSON.stringify(question.options)}` : ""}
Correct Answer: ${question.correctAnswer}
Explanation: ${question.explanation}`;
    }
    let referencesEvent = "";
    const lastUserMsg = [
      ...messages || []
    ].reverse().find((m) => m.role === "user");
    if (lastUserMsg?.content) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const chunks = await retrieveRelevantChunks(supabaseUrl, supabaseKey, lastUserMsg.content, {
        subject: subject || void 0,
        maxChunks: 3
      });
      const rag = buildRAGContext(chunks);
      if (rag.promptBlock) {
        systemContent += rag.promptBlock;
        referencesEvent = serializeReferencesEvent(rag.references);
      }
    }
    const chatMessages = (messages || []).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.attachment?.mimeType?.startsWith("image/") ? `[User attached an image: ${m.attachment.name}]
${m.content || ""}` : m.content,
      ...m.attachment?.base64 ? {
        attachment: {
          base64: m.attachment.base64,
          mimeType: m.attachment.mimeType,
          name: m.attachment.name
        }
      } : {}
    }));
    const aiStream = await aiChatStream(Deno.env, systemContent, chatMessages, {
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      maxTokens: 2048
    });
    const combinedStream = new ReadableStream({
      async start(controller) {
        if (referencesEvent) {
          controller.enqueue(encoder2.encode(referencesEvent));
        }
        const reader = aiStream.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      }
    });
    return new Response(combinedStream, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/event-stream"
      }
    });
  } catch (error) {
    console.error("AI tutor error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json"
      }
    });
  }
});
