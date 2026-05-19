export default async function handler(req, res) {
  const key = process.env.VITE_OPENROUTER_API_KEY;
  if (!key) return res.status(500).json({ error: 'No API key' });

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
    const apiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://jupebstudyguide-main.vercel.app',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-pro-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });
    const data = await apiRes.json();
    const text = data.choices?.[0]?.message?.content || '';
    const json = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] || '[]');
    res.status(200).json({ answers: json });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
