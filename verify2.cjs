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
      timeout: 20000,
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
  console.log('MESSAGES columns:');
  const mc = await sql("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' ORDER BY ordinal_position");
  mc.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));
}
main().catch(e => console.error('FAIL:', e.message));
