// Chat Consolidation Migration Runner
// Usage: SUPABASE_TOKEN=your_token node run-chat-migration.cjs
const https = require('https');
const fs = require('fs');
const PAT = process.env.SUPABASE_TOKEN;
if (!PAT) { console.error('ERROR: Set SUPABASE_TOKEN env var'); process.exit(1); }
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
  const migration = fs.readFileSync('supabase/migrations/20260527000001_chat_consolidation.sql', 'utf8');
  const statements = migration
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    try {
      await sql(stmt);
      console.log('OK:', stmt.slice(0, 80) + '...');
    } catch (e) {
      console.error('FAIL:', e.message);
      console.error('  SQL:', stmt.slice(0, 120));
    }
  }
  console.log('\nMigration complete.');
}

main().catch(e => console.error('FATAL:', e.message));
