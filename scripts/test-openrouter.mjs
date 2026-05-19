const key = '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';

// First test: simple text completion
async function test() {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://jupebstudyguide-main.vercel.app',
    },
    body: JSON.stringify({
      model: 'google/gemini-3.1-pro-preview',
      messages: [{ role: 'user', content: 'Say hello in one word' }],
      temperature: 0.1,
      max_tokens: 100,
    }),
  });
  const data = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', data.substring(0, 500));
}

test().catch(e => console.error('Error:', e.message));
