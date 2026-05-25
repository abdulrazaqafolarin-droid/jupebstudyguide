const https = require('https');
const PAT = process.env.SUPABASE_TOKEN;
const REF = 'gzyczowqqywesqhqqpdi';

function sql(q) {
  return new Promise((res, rej) => {
    const b = JSON.stringify({ query: q });
    const r = https.request({
      hostname: 'api.supabase.com',
      path: '/v1/projects/' + REF + '/database/query',
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + PAT, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) },
      timeout: 30000,
    }, (resp) => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => { if (resp.statusCode < 300) res(JSON.parse(d)); else rej(new Error(d.slice(0, 500))); });
    });
    r.on('error', rej);
    r.write(b);
    r.end();
  });
}

async function main() {
  const check = await sql("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name IN ('bio','privacy_avatar','privacy_profile') ORDER BY column_name");
  console.log('profiles bio/privacy columns:', JSON.stringify(check.map(c=>c.column_name)));
}
main().catch(e => console.error('FAIL:', e.message));
