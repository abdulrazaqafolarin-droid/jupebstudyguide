const https = require('https');
const fs = require('fs');
const path = require('path');

const PAT = 'sbp_6984133e729350ee53823f10122c39f1167f473b';
const PROJECT_REF = 'gzyczowqqywesqhqqpdi';

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

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
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`Running ${file}...`);
    try {
      const result = await runSQL(sql);
      console.log(`  OK (${Array.isArray(result) ? result.length : 'json'} rows)`);
    } catch (err) {
      console.error(`  FAIL: ${err.message}`);
      // Continue with next migration
    }
  }

  // Check users
  console.log('\nChecking auth.users...');
  try {
    const users = await runSQL("SELECT id, email FROM auth.users LIMIT 10;");
    console.log(`  Users: ${JSON.stringify(users)}`);
  } catch (err) {
    console.log(`  Could not query users: ${err.message}`);
  }

  console.log('\nMigration complete!');
}

main().catch(console.error);
