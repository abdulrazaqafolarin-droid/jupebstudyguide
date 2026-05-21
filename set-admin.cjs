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
  const users = await sql("SELECT u.id, u.email, p.display_name, p.is_admin, p.is_activated FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id WHERE u.email = 'abdulrazaqafolarin@gmail.com';");
  console.log(JSON.stringify(users, null, 2));
  if (users.length === 0) {
    console.log('User not found. Need to sign up first.');
  } else {
    // Set as admin
    const uid = users[0].id;
    await sql("UPDATE public.profiles SET is_admin = true, is_activated = true WHERE user_id = '" + uid + "';");
    const check = await sql("SELECT user_id, is_admin, is_activated FROM public.profiles WHERE user_id = '" + uid + "';");
    console.log('Admin set:', JSON.stringify(check));
  }
}
main().catch(e => console.error(e.message));
