import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, mimeType, documentName, subject, documentText } = await req.json();
    
    // Get user from authorization header
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    let messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // Build the user message based on input type
    if (fileBase64 && mimeType) {
      // Image or PDF as base64 - use vision capabilities
      const isImage = mimeType.startsWith('image/');
      const isPdf = mimeType === 'application/pdf';
      
      if (isImage) {
        // Direct image input with vision
        messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: `Document name: ${documentName}\nSubject: ${subject}\n\nPlease extract ALL exam questions from this image. Look carefully for question numbers, options (A, B, C, D), and any mathematical formulas or diagrams.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${fileBase64}`
              }
            }
          ]
        });
      } else if (isPdf) {
        // For PDFs, we need to send multiple pages as images
        // Gemini can handle PDFs directly as inline_data
        messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: `Document name: ${documentName}\nSubject: ${subject}\n\nPlease extract ALL exam questions from this PDF document. Look carefully for question numbers, options (A, B, C, D), and any mathematical formulas or diagrams. The document may contain multiple pages.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${fileBase64}`
              }
            }
          ]
        });
      }
    } else if (documentText) {
      // Plain text input (legacy support)
      messages.push({
        role: "user",
        content: `Document name: ${documentName}\nSubject: ${subject}\n\nDocument content:\n${documentText}`
      });
    } else {
      return new Response(
        JSON.stringify({ error: "No document content provided. Please upload a file." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending document to AI for parsing...");
    console.log("Document:", documentName, "Subject:", subject, "Has base64:", !!fileBase64);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: messages,
        response_format: { type: "json_object" },
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to parse document. Please try a smaller file or different format." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("AI response received, parsing...");

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

    console.log(`Extracted ${parsedQuestions.questions.length} questions`);

    // Store questions in Supabase
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

    const { data, error } = await supabase
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

    console.log(`Saved ${data.length} questions to database`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        questionsCount: data.length,
        questions: data 
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