/* Report DB course values (per subject) that neither match a syllabus topic ID
 * nor a COURSE_TOPIC_MAP key in daily-mission-engine.ts (normalized).
 * Usage: node report-unmapped-courses.cjs [subject]
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const URL_ = 'https://gzyczowqqywesqhqqpdi.supabase.co';
const ANON = 'sb_publishable_GVQs-O9yijr0XIbB6cVvEw_pvQyFXbX';

const norm = (v) => (v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function main() {
  const db = createClient(URL_, ANON);
  const subject = process.argv[2]; // optional filter

  // syllabus topic IDs from src/types/syllabus.ts
  const syl = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'types', 'syllabus.ts'),
    'utf8',
  );
  const ids = new Set([...syl.matchAll(/id:\s*'([a-z]+-[a-z0-9-]+)'/g)].map((m) => m[1]));

  // map keys from daily-mission-engine.ts
  const eng = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'lib', 'daily-mission-engine.ts'),
    'utf8',
  );
  const keys = new Set(
    [...eng.matchAll(/^ {2}"([^"]+)":/gm)].map((m) => norm(m[1])),
  );

  // distinct course values with counts
  let q = db
    .from('study_questions')
    .select('course', { count: 'exact' })
    .not('course', 'is', null);
  if (subject) q = q.eq('subject', subject);
  const { data, error, count } = await q.limit(5000);
  if (error) { console.error(error.message); process.exit(1); }

  const tally = {};
  for (const r of data) tally[r.course] = (tally[r.course] || 0) + 1;
  console.log(`rows with course: ${count}, distinct values: ${Object.keys(tally).length}`);

  const unmapped = [];
  for (const [course, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    const k = norm(course);
    if (ids.has(course) || ids.has(k.replace(/ /g, '-')) || keys.has(k)) continue;
    unmapped.push([course, k, n]);
  }
  console.log(`\nUNMAPPED (${unmapped.length}):`);
  for (const [course, k, n] of unmapped) console.log(`  ${String(n).padStart(4)}  "${course}"  => key "${k}"`);
}
main().catch((e) => { console.error(e); process.exit(1); });
