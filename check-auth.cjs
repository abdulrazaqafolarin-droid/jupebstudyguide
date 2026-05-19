const https = require('https');
const PAT = 'sbp_6984133e729350ee53823f10122c39f1167f473b';
const REF = 'gzyczowqqywesqhqqpdi';
function api(method, path, body) {
  return new Promise((res, rej) => {
    const opts = { hostname: 'api.supabase.com', path: '/v1/projects/' + REF + path, method, headers: { Authorization: 'Bearer ' + PAT, 'Content-Type': 'application/json' }, timeout: 20000 };
    const r = https.request(opts, (resp) => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => { if (resp.statusCode < 300) res(JSON.parse(d)); else rej(new Error(resp.statusCode + ': ' + d.slice(0, 500))); });
    });
    r.on('error', rej);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}
async function main() {
  // Check auth settings
  const settings = await api('GET', '/config/auth/settings');
  console.log('Auth settings:', JSON.stringify(settings, null, 2));
}
main().catch(e => console.error(e.message));
