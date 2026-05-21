// Fallback chain: Groq → Gemini → OpenRouter
const GROQ_BASE = "https://api.groq.com/openai/v1";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

async function tryGroq(questions) {
  if (!process.env.GROQ_API_KEY) return null;
  const body = {
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "You are a JUPEB exam expert. For each MCQ below, determine the SINGLE correct answer. Reply with ONLY a JSON array: [{ \"idx\": 1, \"correctAnswer\": \"A\", \"explanation\": \"...\" }]" },
      { role: "user", content: "Questions:\n" + questions }
    ],
    temperature: 0.1, max_tokens: 4096,
    response_format: { type: "json_object" }
  };
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (res.status === 429) return null;
  return res;
}

async function tryGemini(questions) {
  if (!process.env.GEMINI_API_KEY) return null;
  const prompt = `You are a JUPEB exam expert. For each MCQ below, determine the SINGLE correct answer.\n\nReply with ONLY a JSON array:\n[{ "idx": 1, "correctAnswer": "A", "explanation": "..." }]\n\nQuestions:\n${questions}`;
  const res = await fetch(
    `${GEMINI_BASE}/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096, responseMimeType: "application/json" }
      }),
    }
  );
  if (res.status === 429) return null;
  return res;
}

async function tryOpenRouter(questions) {
  if (!process.env.OPENROUTER_API_KEY) return null;
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://jupeb-master.vercel.app",
    },
    body: JSON.stringify({
      model: "mistralai/mistral-7b-instruct:free",
      messages: [
        { role: "system", content: "You are a JUPEB exam expert. Reply with ONLY a JSON array." },
        { role: "user", content: questions }
      ],
      temperature: 0.1, max_tokens: 4096,
      response_format: { type: "json_object" }
    }),
  });
  if (res.status === 429) return null;
  return res;
}

const PROVIDERS = [
  { name: "Groq", fn: tryGroq },
  { name: "Gemini", fn: tryGemini },
  { name: "OpenRouter", fn: tryOpenRouter },
];

export default async function handler(req, res) {
  const { questions } = req.body || {};
  if (!questions?.length) return res.status(400).json({ error: "No questions" });

  const qText = questions.map((q, i) =>
    `${i + 1}. ${q.question}\n${q.options.map(o => `${o.label}. ${o.text}`).join("\n")}`
  ).join("\n\n");

  for (const p of PROVIDERS) {
    try {
      const apiRes = await p.fn(qText);
      if (!apiRes) continue;
      if (!apiRes.ok) {
        const err = await apiRes.text();
        console.log(`${p.name} error ${apiRes.status}: ${err.slice(0, 200)}`);
        continue;
      }
      let content = "";
      if (p.name === "Gemini") {
        const data = await apiRes.json();
        content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        const data = await apiRes.json();
        content = data.choices?.[0]?.message?.content || "";
      }
      const json = JSON.parse(content.match(/\[[\s\S]*\]/)?.[0] || "[]");
      console.log(`Answered via ${p.name}`);
      return res.status(200).json({ answers: json, provider: p.name });
    } catch (e) {
      console.log(`${p.name} failed: ${e.message}`);
    }
  }

  res.status(500).json({ error: "All AI providers unavailable. Set GROQ_API_KEY in Vercel env vars." });
}
