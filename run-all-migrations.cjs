const https = require('https');
const fs = require('fs');
const path = require('path');

// ── CONFIG ──────────────────────────────────────────────────────────────────
const PROJECT_REF = 'gzyczowqqywesqhqqpdi';
const PAT = process.env.SUPABASE_TOKEN;
if (!PAT) {
  console.error('ERROR: Set SUPABASE_TOKEN env var first');
  console.error('  export SUPABASE_TOKEN=sbp_xxxxxxxxxxxx');
  process.exit(1);
}

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`Project: ${PROJECT_REF}`);
console.log(`Migrations found: ${files.length}`);

function runSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 60000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 500)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

async function main() {
  let passed = 0;
  let failed = 0;

  for (const file of files) {
    process.stdout.write(`[${passed + failed + 1}/${files.length}] ${file} ... `);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    try {
      await runSQL(sql);
      console.log('OK');
      passed++;
    } catch (err) {
      // IF NOT EXISTS / DROP IF EXISTS should handle re-runs
      if (err.message.includes('already exists') || err.message.includes('duplicate') || err.message.includes('42710') || err.message.includes('42P07') || err.message.includes('42701')) {
        console.log('SKIP (already applied)');
        passed++;
      } else {
        console.log(`FAIL: ${err.message.slice(0, 120)}`);
        failed++;
      }
    }
  }

  // Verify key tables exist
  console.log('\n── Verification ──');
  const checks = [
    "SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name='achievements'",
    "SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_admin'",
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='score_events') AS exists",
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='activation_codes') AS exists",
    "SELECT COUNT(*) AS cnt FROM auth.users",
  ];
  for (const check of checks) {
    try {
      const result = await runSQL(check);
      const label = check.split("'")[1] || check.slice(0, 60);
      const val = Array.isArray(result) ? JSON.stringify(result[0] || result) : result;
      console.log(`  ${label}: ${val}`);
    } catch (err) {
      console.log(`  ${check.slice(0, 60)}: ERROR ${err.message.slice(0, 80)}`);
    }
  }

  console.log(`\nDone. ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    console.log('Some migrations failed — check errors above. Non-fatal if already applied.');
  }
}

main().catch(console.error);
