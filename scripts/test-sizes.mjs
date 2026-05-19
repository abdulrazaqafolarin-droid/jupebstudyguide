const key = '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';

async function tryOnce(prompt, desc) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3.1-pro-preview',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 5,
      }),
    });
    const data = await res.json();
    console.log(`${desc}: OK - "${data.choices?.[0]?.message?.content?.substring(0,50)}"`);
  } catch (e) {
    console.log(`${desc}: FAIL (${e.cause?.code || e.message})`);
  }
}

await tryOnce('Reply exactly with just: A', '5-word prompt');
await tryOnce('What is 2+2? Just the number.', '8-word prompt');
await tryOnce('Which is correct? A) 1 B) 2 C) 3. Answer: Just one letter.', '16-word prompt');
await tryOnce('Which of the following phenomena posed a significant challenge to the wave theory of light? A. Interference B. Photoelectric effect C. Polarization D. Diffraction. Reply: just the letter.', 'long prompt');
