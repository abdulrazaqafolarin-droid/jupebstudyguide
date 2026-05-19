const https = require('https');
const PAT = 'sbp_6984133e729350ee53823f10122c39f1167f473b';
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
  console.log('Creating consume_activation_code...');
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
  console.log('OK - function created');

  await sql('REVOKE EXECUTE ON FUNCTION public.consume_activation_code(TEXT, UUID) FROM PUBLIC, anon;');
  await sql('GRANT EXECUTE ON FUNCTION public.consume_activation_code(TEXT, UUID) TO authenticated;');
  console.log('OK - permissions granted');

  const check = await sql("SELECT proname FROM pg_proc WHERE proname = 'consume_activation_code';");
  console.log('Verified:', JSON.stringify(check));
}

main().catch(e => console.error('FAIL:', e.message));
