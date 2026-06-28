// Fix corrupted question text in Supabase
// Patterns to fix:
// 1. \ce{$\ce{X}$} or $\ce{$\ce{X}$}$ → $\ce{X}$
// 2. \mathrm{$...} → $\mathrm{...}$
// 3. Clean up double dollar signs

const ANON_KEY = 'sb_publishable_GVQs-O9yijr0XIbB6cVvEw_pvQyFXbX';
const API_URL = 'https://gzyczowqqywesqhqqpdi.supabase.co';

const SVC_TOKEN = (
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjQ5Njk2NCwiZXhwIjoxNzgyNTA0Mjg0LCJuYmYiOjE3ODI0OTY5NjR9.bto0ISEf64XNOf0dFhTgeJ3JLLOGtFrPoVV2OhYRuqs'
);

async function getJSON(url) {
  const res = await fetch(url, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${SVC_TOKEN}`
    }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Fetch error ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// Fix patterns
function fixNestedLatex(text) {
  if (!text || typeof text !== 'string') return text;

  let before = text;

  // Pattern: \ce{$\ce{...}$} → $\ce{...}$
  text = text.replace(/\\ce\{\$\\ce\{([^}]*)\}\$\}/g, (m, inner) => {
    return '$\\ce{' + inner + '}$';
  });

  // Pattern: $$...$$ → $...$ when content has \ce or \mathrm
  text = text.replace(/\$\$(.+?)\$\$/g, (match, inner) => {
    if (!inner.includes('$$') && (inner.includes('\\ce') || inner.includes('\\mathrm'))) {
      return '$' + inner + '$';
    }
    return match;
  });

  // Remove empty \ce{}
  text = text.replace(/\\ce\{\}/g, '');

  return text !== before ? text : null;
}

async function main() {
  for (const subject of ['chemistry', 'physics', 'math']) {
    console.log(`\n=== ${subject} ===`);
    // Fetch in pages to avoid JSON parse stack overflow with large responses
    let data = [];
    let from = 0;
    const PAGE_SIZE = 500;
    while (true) {
      const page = await getJSON(
        `${API_URL}/rest/v1/study_questions?select=id,question,options,explanation&subject=eq.${subject}&offset=${from}&limit=${PAGE_SIZE}`
      );
      if (!Array.isArray(page) || page.length === 0) break;
      data = data.concat(page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    if (!Array.isArray(data)) {
      console.log(`  Error: ${JSON.stringify(data).slice(0, 100)}`);
      continue;
    }

    let fixed = 0;
    for (const q of data) {
      const update = { id: q.id };
      let changed = false;

      const fixedQ = fixNestedLatex(q.question);
      if (fixedQ) { update.question = fixedQ; changed = true; }

      if (q.options && Array.isArray(q.options)) {
        const newOpts = q.options.map(opt => {
          const fixed = fixNestedLatex(opt.text);
          if (fixed) changed = true;
          return { ...opt, text: fixed || opt.text };
        });
        if (changed) update.options = newOpts;
      }

      if (q.explanation) {
        const fixedE = fixNestedLatex(q.explanation);
        if (fixedE) { update.explanation = fixedE; changed = true; }
      }

      if (changed) {
        // Must include required fields for upsert
        update.subject = subject;
        update.question = update.question || q.question;
        update.options = update.options || q.options;

        // PATCH individual
        const res = await fetch(`${API_URL}/rest/v1/study_questions?id=eq.${encodeURIComponent(q.id)}`, {
          method: 'PATCH',
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${SVC_TOKEN}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(update)
        });
        if (!res.ok) {
          const body = await res.text();
          console.error(`  FAILED ${q.id}: ${body.slice(0, 100)}`);
        } else {
          fixed++;
        }
      }
    }
    console.log(`  Fixed: ${fixed}/${data.length}`);
  }
  console.log('\nDone!');
}

main().catch(e => console.error('Fatal:', e.message));
