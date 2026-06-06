// Fix remaining migration items (function + trigger failed due to $$ splitting)
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
  // Step 1: Create the function (escaped $$ as a single statement)
  await sql(`
    CREATE OR REPLACE FUNCTION public.update_conversations_updated_at()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SET search_path = public
    AS $f$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $f$;
  `);
  console.log('OK: created function update_conversations_updated_at');

  // Step 2: Create the trigger
  await sql(`
    DROP TRIGGER IF EXISTS trg_conversations_updated_at ON public.conversations;
    CREATE TRIGGER trg_conversations_updated_at
      BEFORE UPDATE ON public.conversations
      FOR EACH ROW
      EXECUTE FUNCTION public.update_conversations_updated_at();
  `);
  console.log('OK: created trigger trg_conversations_updated_at');

  // Step 3: Drop starred_messages if it exists
  try {
    await sql('DROP TABLE IF EXISTS public.starred_messages CASCADE');
    console.log('OK: dropped starred_messages');
  } catch (e) {
    console.log('SKIP: starred_messages', e.message.slice(0, 60));
  }

  // Step 4: Verify
  const tables = await sql("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  const names = tables.map(t => t.table_name);
  console.log('\nRemaining tables:', names.filter(n => n.startsWith('direct_') || n.startsWith('message_') || n.startsWith('starred')));
  console.log('has group_name on conversations:', (await sql("SELECT column_name FROM information_schema.columns WHERE table_name='conversations' AND column_name='group_name'")).length > 0);
  console.log('has chat-images bucket:', (await sql("SELECT id FROM storage.buckets WHERE id='chat-images'")).length > 0);
}

main().catch(e => console.error('FATAL:', e.message));
