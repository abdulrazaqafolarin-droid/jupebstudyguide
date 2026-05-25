const fs = require('fs');
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
      timeout: 60000,
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

async function runAll(sqlFile) {
  const text = fs.readFileSync(sqlFile, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

  // Split into individual SQL statements by tracking $$ blocks
  const lines = text.split('\n');
  const statements = [];
  let current = [];
  let inDollar = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip pure comment lines
    if (trimmed.startsWith('--') && !inDollar) continue;

    current.push(line);

    if (trimmed.includes('$$') && !inDollar) {
      inDollar = true;
      // Check if both opening and closing $$ on same line (rare but possible)
      const firstIdx = trimmed.indexOf('$$');
      const lastIdx = trimmed.lastIndexOf('$$');
      if (firstIdx !== lastIdx) {
        inDollar = false;
      }
    } else if (trimmed.includes('$$') && inDollar) {
      inDollar = false;
      // If it ends with ; after $$, it's a complete statement
    }

    if (!inDollar && trimmed.endsWith(';')) {
      statements.push(current.join('\n'));
      current = [];
    }
  }

  // Add any remaining
  if (current.length > 0) {
    const remaining = current.join('\n').trim();
    if (remaining.length > 0) statements.push(remaining);
  }

  console.log(`Found ${statements.length} SQL statements to execute`);

  let ok = 0, fail = 0;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt || stmt === ';') { ok++; continue; }

    // Skip pure comment blocks
    const cleanStmt = stmt.split('\n').filter(l => !l.trim().startsWith('--')).join('\n').trim();
    if (!cleanStmt || cleanStmt === ';') { ok++; continue; }

    const label = cleanStmt.split('\n')[0].slice(0, 80).replace(/;$/, '');
    try {
      await sql(stmt);
      console.log(`  [${i+1}/${statements.length}] OK: ${label}`);
      ok++;
    } catch (e) {
      const msg = e.message;
      if (msg.includes('already exists') || msg.includes('duplicate key') || msg.includes('IF NOT EXISTS')) {
        console.log(`  [${i+1}/${statements.length}] SKIP (exists): ${label}`);
        ok++;
      } else {
        console.log(`  [${i+1}/${statements.length}] FAIL: ${label}`);
        console.log(`    ${msg.slice(0, 150)}`);
        fail++;
      }
    }
  }
  console.log(`\nDone: ${ok} OK, ${fail} FAIL`);
  return fail === 0;
}

const file = process.argv[2] || 'C:\\Users\\HP\\Downloads\\jupebstudyguide-main\\jupebstudyguide-main\\supabase\\migrations\\20260524000001_profiles_privacy_messaging.sql';
runAll(file).then(success => process.exit(success ? 0 : 1)).catch(e => { console.error('FATAL:', e.message); process.exit(1); });
