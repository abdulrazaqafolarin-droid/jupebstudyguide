const https = require('https');
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
  // Check for missing columns on messages
  const msgCols = await sql("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' ORDER BY ordinal_position");
  const msgNames = msgCols.map(c => c.column_name);
  console.log('messages has is_deleted:', msgNames.includes('is_deleted'));
  console.log('messages has delivered_at:', msgNames.includes('delivered_at'));
  console.log('messages has read_at:', msgNames.includes('read_at'));
  console.log('messages has file_url:', msgNames.includes('file_url'));
  console.log('messages has file_name:', msgNames.includes('file_name'));

  // Check for missing columns on profiles
  const profCols = await sql("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position");
  const profNames = profCols.map(c => c.column_name);
  console.log('profiles has bio:', profNames.includes('bio'));
  console.log('profiles has privacy_avatar:', profNames.includes('privacy_avatar'));
  console.log('profiles has privacy_profile:', profNames.includes('privacy_profile'));

  // Check other tables
  const tables = await sql("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  const tNames = tables.map(t => t.table_name);
  console.log('Has leaderboard_weeks:', tNames.includes('leaderboard_weeks'));
  console.log('Has textbook_chunks:', tNames.includes('textbook_chunks'));
  console.log('Has orders:', tNames.includes('orders'));
  console.log('Has order_items:', tNames.includes('order_items'));

  // Check RPC functions
  const funcs = await sql("SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND proname IN ('update_updated_at_column','get_friends','get_mutual_friends','send_friend_request','block_user','unblock_user','can_view_profile','get_relationship_status','consume_activation_code','current_week_start','current_week_end','get_weekly_leaderboard','delete_my_account') ORDER BY proname");
  console.log('RPC functions:', JSON.stringify(funcs.map(f => f.proname)));

  // Check storage buckets
  const buckets = await sql("SELECT id, name FROM storage.buckets ORDER BY name");
  console.log('Storage buckets:', JSON.stringify(buckets));

  // Check which migrations may have run by checking creation dates of entities
  const triggers = await sql("SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema='public' AND trigger_name IN ('update_friend_requests_updated_at','on_message_read','on_auth_user_created') ORDER BY trigger_name");
  console.log('Triggers:', JSON.stringify(triggers.map(t => t.trigger_name)));
}

main().catch(e => console.error('FAIL:', e.message));
