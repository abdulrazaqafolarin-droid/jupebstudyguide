const urls = [
  'https://jupebstudyguide-main.vercel.app/api/answer',
  'https://jupebstudyguide-main-etd2oibzp.vercel.app/api/answer',
];

async function testUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: [{ question: 'test', options: [{label:'A',text:'1'},{label:'B',text:'2'}], id: 'test-1' }] }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    console.log(`${url}: OK status=${res.status}`, JSON.stringify(data).substring(0, 100));
  } catch (e) {
    console.log(`${url}: FAIL (${e.cause?.code || e.message})`);
  }
}

await testUrl(urls[0]);
await testUrl(urls[1]);
