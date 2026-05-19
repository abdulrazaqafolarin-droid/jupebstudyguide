export default async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'Gemini API key not configured' });

  const { questions } = req.body || {};
  if (!questions?.length) return res.status(400).json({ error: 'No questions' });

  const qText = questions.map((q, i) =>
    `${i + 1}. ${q.question}\n${q.options.map(o => `${o.label}. ${o.text}`).join('\n')}`
  ).join('\n\n');

  const prompt = `You are a JUPEB exam expert. For each MCQ below, determine the SINGLE correct answer.

Reply with ONLY a JSON array:
[{ "idx": 1, "correctAnswer": "A", "explanation": "..." }]

Questions:
${qText}`;

  try {
    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      throw new Error(`Gemini error (${apiRes.status}): ${errText}`);
    }

    const data = await apiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const json = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] || '[]');
    res.status(200).json({ answers: json });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
