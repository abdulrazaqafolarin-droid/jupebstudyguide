// DEPRECATED — Use `node deploy-all.cjs --function=validate-activation` instead.
const fs = require('fs');
const https = require('https');
const PAT = process.env.SUPABASE_TOKEN;
const REF = 'gzyczowqqywesqhqqpdi';
const name = 'validate-activation';

let code = fs.readFileSync('supabase/functions/validate-activation/index.ts', 'utf8');
code = code.replace(/\u2018/g, "'").replace(/\u2019/g, "'")
  .replace(/\u201c/g, '"').replace(/\u201d/g, '"')
  .replace(/\u2013/g, '-').replace(/\u2014/g, '--')
  .replace(/\u2026/g, '...')
  .split('').filter(c => c.charCodeAt(0) < 128).join('');

const body = JSON.stringify({ slug: name, name: name, body: code, verify_jwt: false });
const req = https.request({
  hostname: 'api.supabase.com',
  path: '/v1/projects/' + REF + '/functions/' + name,
  method: 'PATCH',
  headers: { 'Authorization': 'Bearer ' + PAT, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  timeout: 30000,
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    if (res.statusCode < 300) { const data = JSON.parse(d); console.log('OK v' + data.version); }
    else console.log('FAIL ' + res.statusCode + ' ' + d.slice(0, 300));
  });
});
req.on('error', e => console.log('Error:', e.message));
req.write(body);
req.end();
