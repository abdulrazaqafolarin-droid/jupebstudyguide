// USAGE: set SUPABASE_TOKEN env var first!
// Windows: $env:SUPABASE_TOKEN="your-token"
// Mac/Linux: export SUPABASE_TOKEN=your-token
const fs = require('fs');
const code = fs.readFileSync('supabase/functions/ai-tutor/index.ts', 'utf8');
const cleaned = code.replace(/[^\x20-\x7E\n\r\t]/g, '');
const token = process.env.SUPABASE_TOKEN;
if (!token) { console.error('ERROR: Set SUPABASE_TOKEN env var'); process.exit(1); }
fetch('https://api.supabase.com/v1/projects/gzyczowqqywesqhqqpdi/functions/ai-tutor', {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ slug: 'ai-tutor', name: 'ai-tutor', body: cleaned, verify_jwt: false }),
})
  .then(r => r.json())
  .then(d => console.log('Deployed:', JSON.stringify(d)))
  .catch(e => console.error('Error:', e.message));
