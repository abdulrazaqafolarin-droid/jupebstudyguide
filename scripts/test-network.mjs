const key = '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';

async function tryFetch(url, body) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { ok: true, status: res.status, text: text.substring(0, 200) };
  } catch (e) {
    return { ok: false, error: e.cause?.code || e.message };
  }
}

// Test 1: Minimal request to OpenRouter with a different model
console.log('Test 1: OpenRouter with deepseek model');
let r = await tryFetch('https://openrouter.ai/api/v1/chat/completions', {
  model: 'deepseek/deepseek-chat',
  messages: [{ role: 'user', content: 'What is 2+2?' }],
  max_tokens: 10,
});
console.log('  ', r.ok ? `OK: ${r.text}` : `FAIL: ${r.error}`);

// Test 2: Google Gemini direct API
console.log('Test 2: Generic HTTPS reachability');
try {
  const r2 = await fetch('https://httpbin.org/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: true, data: 'x'.repeat(2000) }),
  });
  const t2 = await r2.text();
  console.log('  OK, status:', r2.status);
} catch (e) {
  console.log('  FAIL:', e.cause?.code || e.message);
}
