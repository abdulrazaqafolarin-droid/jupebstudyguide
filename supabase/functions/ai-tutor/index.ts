import { createClient } from "npm:@supabase/supabase-js@2";
import { CORS_HEADERS, aiChatStream } from "../_shared/ai.ts";
import { retrieveRelevantChunks, buildRAGContext, serializeReferencesEvent } from "../_shared/textbook-retrieve.ts";

const TUTOR_SYSTEM_PROMPT = `You are an exceptional JUPEB science and mathematics tutor who uses proven psychological learning techniques to help students truly understand and remember concepts. Your teaching style is engaging, addictive, and designed for long-term memory retention.

## CRITICAL: OUTPUT FORMAT — YOU MUST FOLLOW THIS EXACTLY
You are trained to wrap ALL internal reasoning inside <think></think> tags. This is not optional — it is required.

### Exact structure your response MUST follow:
<think>
[Your step-by-step reasoning, analysis, calculations, and thought process here — this is your internal thinking]
</think>
[Final answer addressed directly to the student here — this is what the student sees]

### Strict rules — violation is not acceptable:
1. You MUST wrap ALL internal reasoning, analysis, step-by-step thinking, drafts, checklists, and chain-of-thought inside <think></think> tags.
2. ONLY the final answer addressed directly to the student goes outside the tags.
3. You MUST NEVER output reasoning, planning, drafts, checklists, or meta-commentary outside of <think></think> tags.
4. After closing </think>, output ONLY the final response — no additional notes, no "I hope this helps", no sign-offs.
5. NEVER output placeholder labels like MATH0, MATH_1, or any internal notation outside the tags.
6. Violating the <think> format is not acceptable under any circumstance.

## CRITICAL: Mathematical Notation Rules
You MUST format ALL mathematical expressions using ONLY $...$ LaTeX delimiters. Never use placeholder-style formats. The system uses KaTeX to render your output.
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

Remember: Your goal is to make learning STICK. ALWAYS format math with LaTeX using $ delimiters! Never output placeholder-style formats like MATH0, MATH_1, or any internal reasoning.`;

const GENERAL_CHAT_PROMPT = `You are an exceptional JUPEB science and mathematics tutor who helps students with their study journey. You can:
- Answer general questions about Physics, Chemistry, Biology, and Mathematics
- Explain concepts and theories
- Give study advice and exam tips
- Create practice questions
- Help students understand the JUPEB syllabus and curriculum

Use the same LaTeX math formatting rules and teaching techniques from your core methodology.
Keep responses helpful, concise, and encouraging.`;

const SYLLABUS_TEACHING_PROMPT = `You are teaching a JUPEB A-level student as part of their 30-day syllabus study plan. Your goal is to ensure DEEP UNDERSTANDING before moving to the next concept.

## Your Teaching Approach:
### 1. STRUCTURED LESSON DELIVERY - Start with overview, use clear sections
### 2. A-LEVEL DEPTH - Explain the "why", include derivations, connect to real-world
### 3. ACTIVE LEARNING CHECKS - Ask questions after each major concept
### 4. USE A-LEVEL EXAMPLES - Draw from JUPEB past questions
### 5. MEMORY ANCHORS - Mnemonics, analogies, key takeaways
### 6. PACING - Don't rush, address questions fully before moving on

Remember: Your job is to make this student TRULY understand. Use proper LaTeX formatting for ALL mathematical expressions! Never output internal reasoning or placeholder formats.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Invalid authentication" }),
      { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  try {
    const encoder = new TextEncoder();
    const { messages, question, generalChat, syllabusTeaching, topic, subject, day, learningObjectives, attachment } = await req.json();

    let systemContent = TUTOR_SYSTEM_PROMPT;

    if (syllabusTeaching && topic) {
      systemContent += "\n\n" + SYLLABUS_TEACHING_PROMPT;
      systemContent += `\n\n--- Current Teaching Session ---
Subject: ${subject}
Day: ${day} of 30
Topic: ${topic.name}
Description: ${topic.description}
Subtopics to Cover: ${topic.subtopics?.join(', ') || 'N/A'}
Difficulty Level: ${topic.difficulty}
Learning Objectives for Today:
${learningObjectives?.map((obj: string, i: number) => `${i + 1}. ${obj}`).join('\n') || 'N/A'}

Begin teaching this topic step by step. Start with fundamentals and build up to A-level depth. Check understanding frequently.`;
    } else if (generalChat) {
      systemContent += "\n\n" + GENERAL_CHAT_PROMPT;
    } else if (question) {
      systemContent += `\n\n--- Current Question Being Studied ---\nSubject: ${question.subject}\nTopic: ${question.topic}\nQuestion: ${question.question}\n${question.options ? `Options: ${JSON.stringify(question.options)}` : ''}\nCorrect Answer: ${question.correctAnswer}\nExplanation: ${question.explanation}`;
    }

    let referencesEvent = "";

    const lastUserMsg = [...(messages || [])].reverse().find((m: any) => m.role === "user");
    if (lastUserMsg?.content) {
      const chunks = await retrieveRelevantChunks(supabaseUrl, supabaseKey, lastUserMsg.content, {
        subject: subject || undefined,
        maxChunks: 3,
      });
      const rag = buildRAGContext(chunks);
      if (rag.promptBlock) {
        systemContent += rag.promptBlock;
        referencesEvent = serializeReferencesEvent(rag.references);
      }
    }

    const chatMessages = (messages || []).map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.attachment?.mimeType?.startsWith('image/')
        ? `[User attached an image: ${m.attachment.name}]\n${m.content || ''}`
        : m.content,
      ...(m.attachment?.base64 ? { attachment: { base64: m.attachment.base64, mimeType: m.attachment.mimeType, name: m.attachment.name } } : {}),
    }));

    // Seed the model's response to start with <think> — forces output format compliance
    chatMessages.push({ role: "assistant", content: "<think>" });

    const aiStream = await aiChatStream(
      Deno.env,
      systemContent,
      chatMessages,
      { model: "llama-3.3-70b-versatile", temperature: 0.7, maxTokens: 2048 }
    );

    const combinedStream = new ReadableStream({
      async start(controller) {
        if (referencesEvent) {
          controller.enqueue(encoder.encode(referencesEvent));
        }
        const reader = aiStream.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      },
    });

    return new Response(combinedStream, {
      headers: { ...CORS_HEADERS, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI tutor error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
