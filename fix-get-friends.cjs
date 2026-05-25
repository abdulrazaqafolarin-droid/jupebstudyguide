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
  console.log('Dropping and recreating get_friends...');
  await sql("DROP FUNCTION IF EXISTS public.get_friends(uuid);");
  console.log('Dropped old function');

  // Use CREATE instead of CREATE OR REPLACE since return type changed
  const newFunc = `
CREATE FUNCTION public.get_friends(user_id uuid)
RETURNS TABLE(friend_id uuid, display_name text, avatar_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END,
    p.display_name,
    p.avatar_url
  FROM public.friend_requests fr
  JOIN public.profiles p
    ON p.user_id = CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END
  WHERE (fr.sender_id = get_friends.user_id OR fr.receiver_id = get_friends.user_id)
    AND fr.status = 'accepted'
    AND NOT EXISTS (
      SELECT 1 FROM public.friend_requests b
      WHERE b.status = 'blocked'
        AND ((b.sender_id = get_friends.user_id AND b.receiver_id = CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END)
          OR (b.sender_id = CASE WHEN fr.sender_id = get_friends.user_id THEN fr.receiver_id ELSE fr.sender_id END AND b.receiver_id = get_friends.user_id))
    );
END;
$$;
`;
  await sql(newFunc);
  console.log('Recreated get_friends');

  // Revoke/grant permissions
  await sql("REVOKE EXECUTE ON FUNCTION public.get_friends(uuid) FROM anon;");
  await sql("GRANT EXECUTE ON FUNCTION public.get_friends(uuid) TO authenticated;");
  console.log('Permissions set');
  console.log('Done - get_friends fixed');
}
main().catch(e => console.error('FATAL:', e.message));
