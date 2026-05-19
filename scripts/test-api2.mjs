const URL = 'https://jupebstudyguide-main-3fxndmm80.vercel.app/api/answer';

async function test() {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questions: [{
        id: 'test-1',
        question: 'Which of the following phenomena posed a significant challenge to the wave theory of light in the 19th century?',
        options: [
          { label: 'A', text: 'Interference patterns' },
          { label: 'B', text: 'Photoelectric effect observations' },
          { label: 'C', text: 'Polarization of light' },
          { label: 'D', text: 'Diffraction of light around obstacles' },
        ],
      }],
    }),
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text.substring(0, 500));
}

test().catch(e => console.error('Error:', e.cause?.code || e.message));
