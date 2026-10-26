/* Debug: print FULL text of specific untagged bank rows.
 * Usage: node show-chem-rows.cjs <grep-pattern> [subject]   (subject defaults to chemistry)
 */
const { createClient } = require('@supabase/supabase-js');
const URL_ = 'https://gzyczowqqywesqhqqpdi.supabase.co';
const ANON = 'sb_publishable_GVQs-O9yijr0XIbB6cVvEw_pvQyFXbX';

async function main() {
  const grep = new RegExp(process.argv[2] || '.', 'i');
  const subject = process.argv[3] || 'chemistry';
  const db = createClient(URL_, ANON);
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('study_questions')
      .select('id, year, question, course')
      .eq('subject', subject)
      .is('course', null)
      .range(from, from + PAGE - 1);
    if (error) { console.error(error.message); process.exit(1); }
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  let n = 0;
  for (const r of rows) {
    const text = String(r.question || '');
    if (!grep.test(text)) continue;
    n++;
    console.log(`\n===== id=${r.id} year=${r.year} len=${text.length} =====`);
    console.log(text.replace(/\s+/g, ' ').slice(0, 1400));
  }
  console.log(`\n(${n} rows shown)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
