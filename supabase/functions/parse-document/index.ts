import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, mimeType, documentName, subject, documentText } = await req.json();

    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const authSupabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user } } = await authSupabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!documentName || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: documentName, subject" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert at extracting exam questions from documents and images. Your task is to parse the provided content and extract ALL questions with their answers and explanations.

For each question, extract:
1. The question text (clean it up, fix formatting issues, OCR artifacts)
2. For MCQ: Extract all options (A, B, C, D, E) with their text
3. The correct answer - SOLVE the question if answer not provided
4. A detailed explanation using the Feynman technique (explain like teaching a beginner)
5. The topic/chapter if identifiable
6. The year if mentioned
7. Difficulty level (easy, medium, hard) - estimate based on complexity

IMPORTANT FORMATTING RULES:
- Use LaTeX for ALL mathematical expressions: \\frac{a}{b} for fractions, \\sqrt{x}, \\int, \\sum, etc.
- Use proper LaTeX notation: $inline$ or $$block$$
- For chemistry: Use subscripts H_2O, superscripts: Fe^{3+}
- Clean up OCR artifacts and formatting issues
- Ensure all questions are complete and make sense
- Include memory tricks and mnemonics where helpful
- If the correct answer is not shown, SOLVE the question yourself

Return a JSON object with this exact format:
{
  "questions": [
    {
      "question": "The question text with $LaTeX$ math formatting",
      "type": "mcq" or "essay",
      "options": [{"label": "A", "text": "option text with $math$"}, ...] (for MCQ only),
      "correctAnswer": "A" or "full answer for essay",
      "explanation": "Detailed explanation with $LaTeX$ math and memory tricks",
      "topic": "Topic name if identifiable",
      "year": 2020 (if mentioned, otherwise null),
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}`;

    const userInstruction = `Document name: ${documentName}\nSubject: ${subject}\n\nPlease extract ALL exam questions from this document. Look carefully for question numbers, options (A, B, C, D), and any mathematical formulas or diagrams.`;

    let geminiParts: any[] = [];

    if (fileBase64 && mimeType) {
      geminiParts.push({
        inlineData: { mimeType, data: fileBase64 }
      });
      geminiParts.push({ text: userInstruction });
    } else if (documentText) {
      geminiParts.push({ text: `${userInstruction}\n\nDocument content:\n${documentText}` });
    } else {
      return new Response(
        JSON.stringify({ error: "No document content provided. Please upload a file." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: geminiParts }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 16384,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to parse document. Please try a smaller file or different format." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", e);
      console.error("Content:", content.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!parsedQuestions.questions || !Array.isArray(parsedQuestions.questions)) {
      console.error("Invalid response structure:", parsedQuestions);
      return new Response(
        JSON.stringify({ error: "No questions found in the document" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const questionsToInsert = parsedQuestions.questions.map((q: any) => ({
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

    const { data: insertData, error } = await supabase
      .from('custom_questions')
      .insert(questionsToInsert)
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save questions to database" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        questionsCount: insertData.length,
        questions: insertData
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Parse document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
