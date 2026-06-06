/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "npm:@supabase/supabase-js@2";
import { CORS_HEADERS, aiChatJSON } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { fileBase64, mimeType, documentName, subject, documentText } = await req.json();

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
    const userId = user.id;

    if (!documentName || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: documentName, subject" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (fileBase64 && mimeType?.startsWith("image/")) {
      // Groq free models don't support vision/multimodal.
      // For image documents, OCR would be needed first.
      // Fallback: return a helpful error guiding the user.
      return new Response(
        JSON.stringify({
          error: "Image parsing via Groq is not supported. Please upload a text document (PDF/txt) instead, or extract text from the image first. For image parsing, set GEMINI_API_KEY in Supabase secrets to use Gemini.",
        }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (!documentText) {
      return new Response(
        JSON.stringify({ error: "No document text provided. Please upload a PDF or text file." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert at extracting exam questions from documents. Parse the provided content and extract ALL questions with their answers and explanations.

For each question, extract:
1. The question text (clean up OCR artifacts, fix formatting)
2. For MCQ: Extract all options (A, B, C, D, E) with their text
3. The correct answer - SOLVE the question if answer not provided
4. A detailed explanation using Feynman technique
5. The topic/chapter if identifiable
6. The year if mentioned
7. Difficulty level (easy, medium, hard)

IMPORTANT FORMATTING RULES:
- Use LaTeX for ALL mathematical expressions: \\frac{a}{b}, \\sqrt{x}, \\int, \\sum, etc.
- For chemistry: H_2O, Fe^{3+}
- Clean up OCR artifacts
- If correct answer is not shown, SOLVE the question yourself

Return a JSON object with this exact format:
{
  "questions": [
    {
      "question": "question text with $LaTeX$ math",
      "type": "mcq or essay",
      "options": [{"label": "A", "text": "option text"}],
      "correctAnswer": "A or full answer for essay",
      "explanation": "detailed explanation",
      "topic": "topic name",
      "year": 2020,
      "difficulty": "easy | medium | hard"
    }
  ]
}`;

    const userMessage = `Document name: ${documentName}\nSubject: ${subject}\n\nDocument content:\n${documentText}`;

    const result = await aiChatJSON(
      Deno.env,
      systemPrompt,
      [{ role: "user", content: userMessage }],
      { model: "llama-3.3-70b-versatile", temperature: 0.1, maxTokens: 16384 }
    );

    if (!result.questions || !Array.isArray(result.questions)) {
      return new Response(
        JSON.stringify({ error: "No questions found in the document" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const questionsToInsert = result.questions.map((q: any) => ({
      document_name: documentName,
      subject: subject,
      year: q.year || null,
      topic: q.topic || null,
      question: q.question,
      question_type: q.type || 'mcq',
      options: q.options || null,
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty || 'medium',
      user_id: userId,
    }));

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/custom_questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(questionsToInsert),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text().catch(() => "unknown");
      console.error("Insert error:", errText.slice(0, 200));
      return new Response(
        JSON.stringify({ error: "Failed to save questions to database" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const insertData = await insertRes.json();

    return new Response(
      JSON.stringify({
        success: true,
        questionsCount: insertData.length,
        questions: insertData
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Parse document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
