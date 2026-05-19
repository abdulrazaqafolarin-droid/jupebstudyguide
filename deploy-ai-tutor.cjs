const fs = require('fs');
const code = fs.readFileSync('supabase/functions/ai-tutor/index.ts', 'utf8');
const cleaned = code.replace(/[^\x20-\x7E\n\r\t]/g, '');
fetch('https://api.supabase.com/v1/projects/gzyczowqqywesqhqqpdi/functions/ai-tutor', {
  method: 'PATCH',
  headers: {
    Authorization: 'Bearer sbp_6984133e729350ee53823f10122c39f1167f473b',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ slug: 'ai-tutor', name: 'ai-tutor', body: cleaned, verify_jwt: false }),
})
  .then(r => r.json())
  .then(d => console.log('Deployed:', JSON.stringify(d)))
  .catch(e => console.error('Error:', e.message));
