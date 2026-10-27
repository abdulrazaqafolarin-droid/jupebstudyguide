#!/usr/bin/env node
// Apply the Study Chat migration live (idempotent — safe to re-run).
// Usage: node scripts/apply-study-chat-migration.cjs
// Reads the SQL straight from supabase/migrations so file and DB never drift.

const fs = require('fs');
const path = require('path');

const SUPABASE_PROJECT_REF = 'gzyczowqqywesqhqqpdi';
// Never hardcode tokens here — push protection blocks them. Export the
// Supabase dashboard token (Account → Tokens) before running:
//   SUPABASE_PAT=sbp_... node scripts/apply-study-chat-migration.cjs
const SUPABASE_PAT = process.env.SUPABASE_PAT || '';
const MIGRATION = '20261027000001_study_chat_topic_threads.sql';

async function runQuery(sql, label) {
  if (!SUPABASE_PAT) {
    throw new Error('SUPABASE_PAT env var is required (Supabase dashboard → Account → Tokens).');
  }
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${label} failed (${res.status}): ${text.slice(0, 400)}`);
  }
  return text;
}

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', MIGRATION),
    'utf8',
  );
  console.log(`Applying ${MIGRATION} ...`);
  await runQuery(sql, 'migration');
  console.log('✓ migration applied');

  const verify = await runQuery(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'ai_chats'
       AND column_name IN ('subject', 'topic_id', 'subtopic')
     ORDER BY column_name;`,
    'verify',
  );
  console.log('✓ ai_chats columns:');
  console.log(verify);

  const index = await runQuery(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = 'idx_ai_chats_topic';`,
    'index verify',
  );
  console.log('✓ index:');
  console.log(index);
  console.log('✅ Study Chat migration live.');
}

main().catch((err) => {
  console.error('❌ Failed:', err.message);
  // Exit code via process.exitCode so buffered stdout still flushes.
  process.exitCode = 1;
});
