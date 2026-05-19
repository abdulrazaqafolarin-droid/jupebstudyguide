const https = require('https');
const fs = require('fs');
const path = require('path');

const PAT = 'sbp_6984133e729350ee53823f10122c39f1167f473b';
const PROJECT_REF = 'gzyczowqqywesqhqqpdi';

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
      timeout: 30000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
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
  const file = '20260515000001_activation_system.sql';
  const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', file), 'utf-8');
  console.log(`Running ${file}...`);
  try {
    const result = await runSQL(sql);
    console.log(`  OK (${Array.isArray(result) ? result.length : 'json'} rows)`);
  } catch (err) {
    console.error(`  FAIL: ${err.message}`);
  }

  // Verify
  console.log('\nVerifying functions exist...');
  try {
    const funcs = await runSQL("SELECT proname FROM pg_proc WHERE proname IN ('consume_activation_code', 'generate_activation_codes', 'award_score') ORDER BY proname;");
    console.log(`  Functions: ${JSON.stringify(funcs)}`);
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }

  console.log('\nDone!');
}

main().catch(console.error);
