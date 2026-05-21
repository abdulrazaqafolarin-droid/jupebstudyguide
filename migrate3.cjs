const https = require('https');
const fs = require('fs');
const path = require('path');

// USAGE: set SUPABASE_TOKEN env var first!
const PAT = process.env.SUPABASE_TOKEN;
if (!PAT) { console.error('ERROR: Set SUPABASE_TOKEN env var'); process.exit(1); }
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
  // Step 1: Drop old function if exists
  console.log('Dropping old function signatures...');
  try {
    await runSQL(`DROP FUNCTION IF EXISTS public.generate_activation_codes(integer, text, uuid);`);
    console.log('  OK');
  } catch (e) { console.log(`  ${e.message}`); }

  // Step 2: Create the function
  console.log('Creating generate_activation_codes...');
  const createSQL = `
CREATE OR REPLACE FUNCTION public.generate_activation_codes(
  p_created_by UUID,
  p_count INTEGER DEFAULT 1,
  p_plan_type TEXT DEFAULT 'basic'
)
RETURNS TABLE(code TEXT, plan_type TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_is_admin BOOLEAN;
  v_code TEXT;
  v_i INTEGER;
BEGIN
  SELECT is_admin INTO v_user_is_admin
  FROM public.profiles
  WHERE user_id = p_created_by;
  IF NOT v_user_is_admin THEN
    RAISE EXCEPTION 'Only admins can generate activation codes';
  END IF;
  FOR v_i IN 1..p_count LOOP
    v_code := upper(
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 4)
    );
    INSERT INTO public.activation_codes (code, plan_type, created_by)
    VALUES (v_code, p_plan_type, p_created_by);
    code := v_code;
    plan_type := p_plan_type;
    expires_at := NULL;
    RETURN NEXT;
  END LOOP;
END;
$$;
`;
  try {
    await runSQL(createSQL);
    console.log('  OK');
  } catch (e) { console.error(`  FAIL: ${e.message}`); }

  // Step 3: Grant permissions  
  console.log('Granting permissions...');
  try {
    await runSQL(`REVOKE EXECUTE ON FUNCTION public.generate_activation_codes(UUID, INTEGER, TEXT) FROM PUBLIC, anon;`);
    await runSQL(`GRANT EXECUTE ON FUNCTION public.generate_activation_codes(UUID, INTEGER, TEXT) TO authenticated;`);
    console.log('  OK');
  } catch (e) { console.error(`  FAIL: ${e.message}`); }

  // Step 4: Verify
  console.log('\nVerification:');
  const funcs = await runSQL("SELECT proname, pg_get_function_identity_arguments(oid) AS args FROM pg_proc WHERE proname IN ('consume_activation_code', 'generate_activation_codes', 'award_score') ORDER BY proname;");
  console.log(JSON.stringify(funcs, null, 2));

  console.log('\nDone!');
}

main().catch(console.error);
