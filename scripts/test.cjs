const https = require('https');

const key = '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';

const data = JSON.stringify({
  model: 'google/gemini-3.1-pro-preview',
  messages: [{ role: 'user', content: 'Answer just: A' }],
  max_tokens: 5,
});

const options = {
  hostname: 'openrouter.ai',
  path: '/api/v1/chat/completions',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
  timeout: 15000,
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body.substring(0, 300));
  });
});

req.on('error', (e) => console.error('Error:', e.code, e.message));
req.on('timeout', () => { req.destroy(); console.error('Timeout'); });
req.write(data);
req.end();
