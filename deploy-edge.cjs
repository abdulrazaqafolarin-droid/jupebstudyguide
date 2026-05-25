const https = require('https');
const fs = require('fs');

const PAT = process.env.SUPABASE_TOKEN;
if (!PAT) { console.error('ERROR: Set SUPABASE_TOKEN env var'); process.exit(1); }
const REF = 'gzyczowqqywesqhqqpdi';

const FUNCTIONS = [
  { name: 'validate-activation', path: 'C:\\Users\\HP\\Downloads\\jupebstudyguide-main\\jupebstudyguide-main\\supabase\\functions\\validate-activation\\index.ts' },
  { name: 'weekly-reset', path: 'C:\\Users\\HP\\Downloads\\jupebstudyguide-main\\jupebstudyguide-main\\supabase\\functions\\weekly-reset\\index.ts' },
];

async function deploy(name, filePath, method) {
  let code = fs.readFileSync(filePath, 'utf8');

  // Strip non-ASCII
  code = code
    .replace(/\u2018/g, "'").replace(/\u2019/g, "'")
    .replace(/\u201c/g, '"').replace(/\u201d/g, '"')
    .replace(/\u2013/g, '-').replace(/\u2014/g, '--')
    .replace(/\u2026/g, '...')
    .split('').filter(c => c.charCodeAt(0) < 128).join('');

  return new Promise((resolve) => {
    const body = JSON.stringify({
      slug: name,
      name: name,
      body: code,
      verify_jwt: false,
    });

    const path = '/v1/projects/' + REF + (method === 'PATCH' ? '/functions/' + name : '/functions');
    const req = https.request({
      hostname: 'api.supabase.com',
      path: path,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + PAT,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 30000,
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        if (res.statusCode < 300) {
          const data = JSON.parse(d);
          console.log('OK   ' + name + ' (v' + (data.version || '?') + ')');
          resolve(true);
        } else {
          console.error('FAIL ' + name + ': HTTP ' + res.statusCode + ' ' + d.slice(0, 200));
          resolve(false);
        }
      });
    });
    req.on('error', e => { console.error('FAIL ' + name + ': ' + e.message); resolve(false); });
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('Deploying edge functions...\n');
  let ok = 0, fail = 0;
  for (const fn of FUNCTIONS) {
    const r = await deploy(fn.name, fn.path);
    if (r) ok++; else fail++;
  }
  console.log('\nDone: ' + ok + ' OK, ' + fail + ' FAIL');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
