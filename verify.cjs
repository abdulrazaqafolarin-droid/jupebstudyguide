const https = require('https');
// USAGE: set SUPABASE_TOKEN env var first!
const PAT = process.env.SUPABASE_TOKEN;
if (!PAT) { console.error('ERROR: Set SUPABASE_TOKEN env var'); process.exit(1); }
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
  const triggers = await sql("SELECT trigger_name, event_manipulation FROM information_schema.triggers WHERE event_object_table='users' AND trigger_schema='auth';");
  console.log('Triggers:', JSON.stringify(triggers));
  const func = await sql("SELECT proname FROM pg_proc WHERE proname='handle_new_user';");
  console.log('Function:', JSON.stringify(func));
  const cols = await sql("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position;");
  console.log('Profiles cols:', JSON.stringify(cols));
}
main().catch(e => console.error(e.message));
