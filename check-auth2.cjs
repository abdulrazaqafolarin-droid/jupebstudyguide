const https = require('https');
const PAT = 'sbp_6984133e729350ee53823f10122c39f1167f473b';
const REF = 'gzyczowqqywesqhqqpdi';
function sql(q) {
  return new Promise((res, rej) => {
    const b = JSON.stringify({ query: q });
    const r = https.request({ hostname: 'api.supabase.com', path: '/v1/projects/' + REF + '/database/query', method: 'POST', headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) }, timeout: 30000 }, (resp) => { let d = ''; resp.on('data', c => d += c); resp.on('end', () => { if (resp.statusCode < 300) res(JSON.parse(d)); else rej(new Error(d.slice(0, 500))); }); });
    r.on('error', rej);
    r.write(b);
    r.end();
  });
}
async function main() {
  // Check auth config from the database
  const config = await sql("SELECT * FROM auth.config;");
  console.log('Auth config:', JSON.stringify(config, null, 2));
}
main().catch(e => console.error('FAIL:', e.message));
