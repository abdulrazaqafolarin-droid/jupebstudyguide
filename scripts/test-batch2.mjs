import fs from 'fs';

const key = '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';

async function callGemini(prompt, timeoutMs = 120000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-pro-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timeout);
  }
}

const qs = JSON.parse(fs.readFileSync('src/data/new-questions/physics/2025.json', 'utf-8'));
const batch = qs.filter(q => q.category === 'objective' && !q.correctAnswer).slice(0, 5);

const qText = batch.map((q, i) =>
  `${i + 1}. ${q.question}\n${q.options.map(o => `${o.label}. ${o.text}`).join('\n')}`
).join('\n\n');

const prompt = `You are a JUPEB exam expert. For each MCQ below, determine the SINGLE correct answer and provide a brief explanation.

Reply with ONLY a JSON array:
[{ "idx": 1, "correctAnswer": "A", "explanation": "..." }]

Questions:
${qText}`;

console.log('Calling API with', batch.length, 'questions...');
const response = await callGemini(prompt);
console.log('Response length:', response.length);

const jsonMatch = response.match(/\[[\s\S]*\]/);
if (jsonMatch) {
  try {
    const json = JSON.parse(jsonMatch[0]);
    console.log('Parsed OK:', json.length, 'answers');
    for (const a of json) {
      console.log(`  ${a.idx}: ${a.correctAnswer} - ${(a.explanation || '').substring(0, 60)}`);
    }
  } catch (e) {
    console.error('Parse error:', e.message);
    console.log('Raw:', response.substring(0, 500));
  }
} else {
  console.log('No JSON array found in response');
  console.log('Raw:', response.substring(0, 500));
}
