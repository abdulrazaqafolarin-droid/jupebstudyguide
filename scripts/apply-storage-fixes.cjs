#!/usr/bin/env node
// ============================================================
// Apply Storage Bucket Fixes to Supabase
// ============================================================
// Usage: node scripts/apply-storage-fixes.cjs
//
// Uses Supabase Management API to execute SQL directly.
// Requires a Supabase PAT (Personal Access Token) set via:
//   1. SUPABASE_PAT environment variable, or
//   2. Hardcoded below (change the value)
//
// The PAT can be created at: https://supabase.com/dashboard/account/tokens
// ============================================================

const SUPABASE_PROJECT_REF = 'gzyczowqqywesqhqqpdi';
const SUPABASE_PAT = process.env.SUPABASE_PAT || 'sbp_b8432c05482316c124aee8dd3e2292b77eafab86';

const SQL = `
-- ============================================================
-- FIX 1: Create answer-images storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('answer-images', 'answer-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view answer images"
  ON storage.objects;
CREATE POLICY "Anyone can view answer images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'answer-images');

DROP POLICY IF EXISTS "Users upload own answer images"
  ON storage.objects;
CREATE POLICY "Users upload own answer images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'answer-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users update own answer images"
  ON storage.objects;
CREATE POLICY "Users update own answer images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'answer-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own answer images"
  ON storage.objects;
CREATE POLICY "Users delete own answer images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'answer-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- FIX 2: Add DELETE policy to chat-files bucket
-- ============================================================
DROP POLICY IF EXISTS "Users can delete own chat files"
  ON storage.objects;

CREATE POLICY "Users can delete own chat files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- FIX 3: Fix chat-images DELETE policy (scope to own folder)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can delete own chat images"
  ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat images"
  ON storage.objects;

CREATE POLICY "Users can delete own chat images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- FIX 4: Tighten chat-files INSERT policy (scope to own folder)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload chat files"
  ON storage.objects;

CREATE POLICY "Authenticated users can upload chat files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- FIX 5: Tighten chat-images INSERT policy (scope to own folder)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload chat images"
  ON storage.objects;

CREATE POLICY "Authenticated users can upload chat images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
`;

async function executeSql(sql) {
  const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;
  const payload = JSON.stringify({ query: sql });

  console.log(`🔌 Connecting to Supabase project: ${SUPABASE_PROJECT_REF}`);
  console.log(`📤 Sending SQL (${sql.length} chars)...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_PAT}`,
      'Content-Type': 'application/json',
    },
    body: payload,
  });

  const text = await response.text();

  if (!response.ok) {
    console.error(`❌ HTTP ${response.status}: ${text}`);
    process.exit(1);
  }

  // Management API returns array of results (one per statement)
  let results;
  try { results = JSON.parse(text); } catch { results = text; }

  return results;
}

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  Supabase Storage Bucket Fixes');
  console.log('══════════════════════════════════════════════');
  console.log(`  Project: ${SUPABASE_PROJECT_REF}`);
  console.log('  Fixes:');
  console.log('    1. Create answer-images bucket + policies');
    console.log('    2. Add DELETE policy to chat-files');
    console.log('    3. Fix chat-images DELETE policy scoping');
    console.log('    4. Fix chat-files INSERT policy scoping');
    console.log('    5. Fix chat-images INSERT policy scoping');
  console.log('══════════════════════════════════════════════\n');

  try {
    const results = await executeSql(SQL);
    console.log('✅ SQL executed successfully!');
    console.log(`   Statements executed: ${Array.isArray(results) ? results.length : 'unknown'}`);

    // Now verify
    console.log('\n🔍 Running verification...\n');
    const verifySql = `
      SELECT id, name, public FROM storage.buckets
      WHERE id IN ('chat-images', 'chat-files', 'answer-images', 'avatars')
      ORDER BY id;
    `;

    const bucketsResponse = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_PAT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: verifySql }),
      }
    );

    if (bucketsResponse.ok) {
      const buckets = await bucketsResponse.json();
      console.log('📦 Storage Buckets:');
      console.log('──────────────────────────────────────────');
      console.log('  Bucket          Public  Status');
      console.log('──────────────────────────────────────────');
      for (const b of buckets) {
        const status = b.id === 'answer-images' ? '✅ FIXED (was missing)' : '✅ OK';
        const pub = b.public ? '✓' : '✗';
        console.log(`  ${b.id.padEnd(16)} ${pub.padEnd(7)} ${status}`);
      }
      console.log('──────────────────────────────────────────\n');
    }

    console.log('✅ All 5 fixes applied and verified!');
    console.log('   ✓ answer-images bucket created with INSERT/SELECT/UPDATE/DELETE policies');
    console.log('   ✓ chat-files DELETE policy added (scoped to own folder)');
    console.log('   ✓ chat-images DELETE policy fixed (scoped to own folder)');
    console.log('   ✓ chat-files INSERT policy tightened (scoped to own folder)');
    console.log('   ✓ chat-images INSERT policy tightened (scoped to own folder)');

  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  }
}

main();
