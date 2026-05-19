const key = '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';

async function callGemini(prompt) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-3.1-pro-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// Single question
const prompt = `You are a JUPEB exam expert. For the MCQ below, determine the SINGLE correct answer.

Reply with ONLY: {"idx":1,"correctAnswer":"X"}

Question: Which of the following phenomena posed a significant challenge to the wave theory of light in the 19th century?
A. Interference patterns observed in double-slit experiments.
B. Photoelectric effect observations.
C. Polarization of light.
D. Diffraction of light around obstacles.`;

console.log('Testing single MCQ...');
console.log('Prompt length:', prompt.length);
const response = await callGemini(prompt);
console.log('Response length:', response.length);
console.log('Response:', response.substring(0, 300));
