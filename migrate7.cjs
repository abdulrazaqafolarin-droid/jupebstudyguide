const https = require('https');
// USAGE: set SUPABASE_TOKEN env var first!
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
  // Check columns on profiles
  const cols = await sql("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position;");
  console.log('Profiles columns:', JSON.stringify(cols, null, 2));

  // Add is_admin and is_activated if missing
  console.log('\nAdding columns to profiles...');
  try { await sql('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_activated BOOLEAN NOT NULL DEFAULT false;'); console.log('  is_activated OK'); } catch (e) { console.log('  is_activated: ' + e.message); }
  try { await sql('ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;'); console.log('  is_admin OK'); } catch (e) { console.log('  is_admin: ' + e.message); }

  // Create indexes
  try { await sql('CREATE INDEX IF NOT EXISTS idx_profiles_activated ON public.profiles(is_activated);'); } catch (e) {}
  try { await sql('CREATE INDEX IF NOT EXISTS idx_profiles_admin ON public.profiles(is_admin);'); } catch (e) {}
  console.log('Indexes OK');

  // Create RLS policies for activation_codes
  console.log('\nCreating RLS policies...');
  try {
    await sql(`
CREATE POLICY "Users can view their own used codes"
ON public.activation_codes FOR SELECT
TO authenticated
USING (
  used_by = auth.uid() 
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);
`);
    console.log('  SELECT policy OK');
  } catch (e) { console.log('  SELECT policy: ' + e.message); }

  try {
    await sql(`
CREATE POLICY "Admins can insert activation codes"
ON public.activation_codes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true
  )
);
`);
    console.log('  INSERT policy OK');
  } catch (e) { console.log('  INSERT policy: ' + e.message); }

  // Create consume_activation_code
  console.log('\nCreating consume_activation_code...');
  try {
    await sql(`
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
    console.log('  Function created OK');
  } catch (e) { console.log('  Function: ' + e.message); }

  try { await sql('REVOKE EXECUTE ON FUNCTION public.consume_activation_code(TEXT, UUID) FROM PUBLIC, anon;'); console.log('  Revoke OK'); } catch (e) {}
  try { await sql('GRANT EXECUTE ON FUNCTION public.consume_activation_code(TEXT, UUID) TO authenticated;'); console.log('  Grant OK'); } catch (e) {}

  // Verify final state
  const funcs = await sql("SELECT proname, pg_get_function_identity_arguments(oid) AS args FROM pg_proc WHERE proname IN ('consume_activation_code', 'generate_activation_codes', 'award_score', 'current_week_start', 'current_week_end', 'get_weekly_leaderboard') ORDER BY proname;");
  console.log('\nAll functions:', JSON.stringify(funcs, null, 2));
  console.log('\nSchema migration complete!');
}

main().catch(e => console.error('FAIL:', e.message));
