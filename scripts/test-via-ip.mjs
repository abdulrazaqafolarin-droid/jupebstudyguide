// Try Vercel API via IP directly
const API_URL = 'https://64.29.17.67/api/answer';
const HOST = 'jupebstudyguide-main-3fxndmm80.vercel.app';

async function test() {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': HOST,
    },
    body: JSON.stringify({
      questions: [{
        id: 'test-1',
        question: 'What is 2+2?',
        options: [
          { label: 'A', text: '3' },
          { label: 'B', text: '4' },
          { label: 'C', text: '5' },
          { label: 'D', text: '6' },
        ],
      }],
    }),
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text.substring(0, 500));
}

test().catch(e => console.error('Error:', e.cause?.code || e.message));
