const https = require('https');

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
  // 1. Create consume_activation_code function
  console.log('Creating consume_activation_code...');
  try {
    await runSQL(`
CREATE OR REPLACE FUNCTION public.consume_activation_code(
  p_code TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record public.activation_codes;
  v_result JSONB;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id AND is_activated = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already activated');
  END IF;
  SELECT * INTO v_record
  FROM public.activation_codes
  WHERE code = p_code
    AND is_used = false
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE SKIP LOCKED;
  IF v_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired activation code');
  END IF;
  UPDATE public.activation_codes
  SET is_used = true, used_by = p_user_id, used_at = now()
  WHERE id = v_record.id;
  UPDATE public.profiles
  SET is_activated = true
  WHERE user_id = p_user_id;
  RETURN jsonb_build_object('success', true, 'plan_type', v_record.plan_type, 'code', v_record.code);
END;
$$;
`);
    await runSQL(`REVOKE EXECUTE ON FUNCTION public.consume_activation_code(TEXT, UUID) FROM PUBLIC, anon;`);
    await runSQL(`GRANT EXECUTE ON FUNCTION public.consume_activation_code(TEXT, UUID) TO authenticated;`);
    console.log('  OK');
  } catch (e) { console.error(`  FAIL: ${e.message}`); }

  // 2. Check users and set admin
  console.log('\nChecking users...');
  try {
    const users = await runSQL(`SELECT u.id, u.email, p.display_name FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id ORDER BY u.created_at DESC LIMIT 10;`);
    console.log(`  Users: ${JSON.stringify(users, null, 2)}`);
    
    if (users.length > 0) {
      const email = users[0].email;
      const uid = users[0].id;
      console.log(`\nSetting admin for ${email}...`);
      await runSQL(`UPDATE public.profiles SET is_admin = true, is_activated = true WHERE user_id = '${uid}';`);
      console.log('  Admin set!');
      
      // Verify
      const check = await runSQL(`SELECT user_id, display_name, is_admin, is_activated FROM public.profiles WHERE user_id = '${uid}';`);
      console.log(`  Verified: ${JSON.stringify(check)}`);
    }
  } catch (e) { console.error(`  FAIL: ${e.message}`); }

  // 3. Verify all functions
  console.log('\nAll functions:');
  const funcs = await runSQL(`SELECT proname, pg_get_function_identity_arguments(oid) AS args FROM pg_proc WHERE proname IN ('consume_activation_code', 'generate_activation_codes', 'award_score', 'current_week_start', 'current_week_end', 'get_weekly_leaderboard') ORDER BY proname;`);
  console.log(JSON.stringify(funcs, null, 2));

  console.log('\nAll done!');
}

main().catch(console.error);
