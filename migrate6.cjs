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
  // Check tables
  const tables = await sql("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;");
  console.log('Tables:', JSON.stringify(tables));

  // Create activation_codes table
  console.log('\nCreating activation_codes table...');
  await sql(`
CREATE TABLE public.activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'basic' CHECK (plan_type IN ('basic', 'premium', 'lifetime')),
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT valid_code_format CHECK (code ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$')
);
`);
  console.log('OK');

  // Enable RLS
  await sql('ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;');
  console.log('RLS enabled');

  // Create RLS policies
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
  console.log('RLS policies created');

  // Now create the function
  console.log('\nCreating consume_activation_code...');
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
  console.log('Function created');

  await sql('REVOKE EXECUTE ON FUNCTION public.consume_activation_code(TEXT, UUID) FROM PUBLIC, anon;');
  await sql('GRANT EXECUTE ON FUNCTION public.consume_activation_code(TEXT, UUID) TO authenticated;');
  console.log('Permissions granted');

  // Final verification
  const funcs = await sql("SELECT proname, pg_get_function_identity_arguments(oid) AS args FROM pg_proc WHERE proname IN ('consume_activation_code', 'generate_activation_codes', 'award_score', 'current_week_start', 'current_week_end', 'get_weekly_leaderboard') ORDER BY proname;");
  console.log('\nAll functions:', JSON.stringify(funcs, null, 2));
  console.log('\nDatabase migration complete!');
}

main().catch(e => console.error('FAIL:', e.message));
