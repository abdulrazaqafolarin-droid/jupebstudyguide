/**
 * Classify untagged biology questions (course = null) into JUPEB syllabus
 * topic IDs (src/types/syllabus.ts — bio-* topics). Deterministic keyword
 * rules, first match wins. Dry-run by default.
 *
 * Rule order implements a headline-first heuristic for multi-part exam blobs:
 * hormone names and specific organism words outrank generic terms that only
 * appear in later sub-parts.
 *
 * Usage:
 *   node tag-bio-topics.cjs              # dry run
 *   node tag-bio-topics.cjs --full       # full listing + unmatched
 *   WHY=1 node tag-bio-topics.cjs        # print matching pattern per row
 *   node tag-bio-topics.cjs --apply      # write (needs SUPABASE_SERVICE_ROLE_KEY)
 */
const { createClient } = require('@supabase/supabase-js');

const URL_ = 'https://gzyczowqqywesqhqqpdi.supabase.co';
const ANON = 'sb_publishable_GVQs-O9yijr0XIbB6cVvEw_pvQyFXbX';

function normalizeMathText(text) {
  return text.replace(/[\u{1D400}-\u{1D49B}]/gu, (ch) => {
    const off = ch.codePointAt(0) - 0x1d400;
    const blockStart = Math.floor(off / 52) * 52;
    const pos = off - blockStart;
    return pos < 26 ? String.fromCharCode(65 + pos) : String.fromCharCode(97 + pos - 26);
  }).replace(/[\u2080-\u2089]/g, (d) => String.fromCharCode(48 + d.charCodeAt(0) - 0x2080))
    .replace(/\u208a/g, '+').replace(/\u208b/g, '-').replace(/\u2212/g, '-');
}

const RULES = [
  // ---- Headline guards (multi-part blobs whose later sub-parts steal) ---
  ['bio-evolution', /^(?:[\s\S]{0,80})evolution/i],
  ['bio-microbial-ecology', /^(?:[\s\S]{0,130})immun|^(?:[\s\S]{0,150})infectious disease/i],
  ['bio-animal-taxonomy', /^(?:[\s\S]{0,80})\bphylum\b/i],
  ['bio-chordates', /^(?:[\s\S]{0,90})characteristics of (the )?(class )?mammals/i],
  ['bio-micro-types', /^(?:[\s\S]{0,140})intermediate host|^(?:[\s\S]{0,100})sub kingdom/i],
  ['bio-micro-structure', /^(?:[\s\S]{0,130})gram.?positive|^(?:[\s\S]{0,130})gram.?negative/i],
  ['bio-plant-reproduction', /^(?:[\s\S]{0,90})fertilization/i],
  ['bio-plant-nutrition', /^(?:[\s\S]{0,100})macro.?element/i],
  ['bio-plant-diversity', /^(?:[\s\S]{0,100})spermatophyt/i],
  ['bio-origin', /^(?:[\s\S]{0,80})in an experiment/i],

  // ---- Headline-specific (rare tokens first; scoped to the headline so
  //      hormone/crop words buried in later sub-parts can't steal) ---------
  ['bio-growth-regulators', /^(?:[\s\S]{0,150})(auxin|gibberellin|cytokinin|\bethylen|ascorbic acid|anti.?transpirant|growth regulator|plant hormone)/i],
  ['bio-crop-improvement', /^(?:[\s\S]{0,150})(genetically modified|GM crops?\b|\bGMOs?\b|crop improvement|food insecurity)/i],
  ['bio-micro-history', /^(?:[\s\S]{0,150})(spontaneous generation|germ theory|golden era of microbiolog|historical developments of microbiolog|history of the (discovery|development) of micro|discovery of viruses|pasteur|koch'?s? postulates|leeuwenhoek|\bredi\b)/i],

  // ---- Conservation & ecology (before micro/plant grab-bags) ------------
  ['bio-plant-conservation', /(?<!water )\bconserv|in.situ|ex.situ|biological control/i],
  ['bio-ecology', /ecosystem|autecology|synecology|biosphere|niche\b|microhabitat|symbios|mutualis|commensal|parasitis|relationship|environmental study|food chain|food web|amount of energy|ecological|vegetable zones|(distribution|abundance) of|pollut|ozone|zone layer|climate change|decomposition process|balance (of|in) nature|atmospher(?!ic nitrogen)|population stud/i],

  // ---- Plant block ------------------------------------------------------
  ['bio-plant-transport', /xylem|phloem|transpiration|root hair|wilting|translocat|water uptake|guard cell|stomata/i],
  ['bio-plant-anatomy', /monocot|dicot|tap root|fibrous root|petiole|leaf (types|modification|venation)|stem (anatomy|structure)|flower structure|fruit|xerophyt|water conservation|anatom/i],
  ['bio-plant-tissues', /parenchyma|collenchyma|sclerenchyma|periderm|cambium|plant tissue|leaf veins|vascular tissue|epiderm/i],
  ['bio-plant-nutrition', /photosynth|chemosynth|autotrophic|heterotrophic nutrition|chlorophyll|macro.?element|micro.?element|essential element|deficien|fertiliz|atmospheric nitrogen|nitrif|denitrif|mineral requirement/i],
  ['bio-plant-respiration', /\bstomata\b|lenticel|aerobic|anaerobic|pyruvate|glycolysis|krebs cycle|respiration (of|in) (plants|green)/i],
  ['bio-plant-diversity', /algae|chlorella|spirogyra|\bfungi\b|yeast|rhizopus|bryophyt|riccia|funaria|pteridophyt|spermatophyt|gymnosperm|angiosperm|cycas|\bpinus\b|lichen|seed plants|ascomycota|basidiomycota|zygomycota|phycomycota/i],
  ['bio-plant-taxonomy', /plant nomenclature|taxonomy of (the )?plant|classification of (the )?plant/i],
  ['bio-plant-reproduction', /asexual|pollinat|gametophyte|fertilization|seed.{0,10}fruits?|angiosperm flower|sexual reproduction in (plants|flowers?)/i],

  // ---- Animal block -----------------------------------------------------
  ['bio-physiology', /alimentary|digest|gaseous exchange|respiratory surface|mammalian respirat|alveoli|breathing|diaphragm|tooth|molar|skeleton|scapula|ischium|bone|cartilage|\bjoint\b|testosteron|gametogenesis|spermato|ovar|uter|menstru|reproductive (system|organ)|male reproductive|female reproductive|\bbrain\b|inner ear|\bear\b|short.sighted|myopia|\blens\b|growth hormone|pituitary|balanced diet|classes of food|food test|biuret|violet coloration|iodine test/i],
  ['bio-transport', /heart|pulmonary|circulat|arter|\bvein\b|nephron|kidney|osmoregul|excret|re.?absor[bp]|diffusion|osmosis|active transport|passive transport|turgor|haemoglob|plasma|serum|blood (cell|pressure|vessel|transfusion)|components of blood/i],
  ['bio-chordates', /reptil|mammal|monotreme|marsupial|vertebrate|amphibian|cold.blooded|warm.blooded/i],
  ['bio-animal-evolution', /adaptations?\b.{0,40}(aquatic|water|land|air|habitat|forest)|aquatic habit|\bfins\b|camouflage|colou?r change/i],
  ['bio-animal-diversity', /social behav|lifestyles?\b|agama|categories of animals|diversity of habit/i],
  ['bio-animal-taxonomy', /\bphylum\b|invertebrate|coelom|annelid|mollusc|arthropod|jointed appendage|segmented animal|bilateral symmetry|metazoan|dissection/i],
  ['bio-invertebrates', /flatworm|platyhelminth|tapeworm|fasciol|schistosoma|arthropod success|most successful|\bhydra\b/i],
  ['bio-animal-economic', /benefits? of animals|economic importance of (the )?(animal|arthropod)|importance of animals to man/i],

  // ---- Micro block ------------------------------------------------------
  ['bio-microbial-ecology', /infectious disease|immun|antibod|antigen|synerg|predation|spoilage|control of microbial|water.borne/i],
  ['bio-micro-structure', /gram.positive|gram.negative|hypha|prokaryotic cell|bacterial cell|safranin|cultural characteristic|biochemical characteristic|culture media|growth media|media that are used for the growth|flagellat|endospore/i],
  ['bio-micro-types', /\bbacteria\b|\bbacterium\b|virus|protozoa|plasmodium|archaea|bacteriophage|yeast|mould|mold|aseptic/i],
  ['bio-micro-nucleic', /\bdna\b|\brna\b|nucleotide|nucleoside|genetic code|transcription|translation|genetic (transfer|material)|replication|plasmid/i],

  // ---- Genetics & cells -------------------------------------------------
  ['bio-genetics', /genotype|phenotype|allele|dominant|recessive|punnett|inherit|breeder|offspring|cross(es)? between|blood group|sex.linked|chromosome|monozygotic|albino|\bgene\b|mendel|mitosis|meiosis/i],
  ['bio-cells', /cell theory|omn?is cellula|discovered a cell|plant cell|animal cell|cell membrane|organelle|microscope|tissue.{0,40}found in animals|types of tissue/i],

  // ---- General biology --------------------------------------------------
  ['bio-taxonomy', /binomial|nomenclature|identification of|adaptive feature|egret|\bheron\b|systematic/i],
  ['bio-evolution', /organic evolution|evolution|divergent|convergent|mutation theory|fossil|natural selection|evolved structure/i],
  ['bio-molecules', /carbohydrate|lipid|nucleic acid|reducing sugar|\bprotein\b|amino acid/i],
  ['bio-origin', /scientific method|in an experiment|experiment to|set of data|hypothesis|data (analysis|collection|represent)/i],
  ['bio-bio-methods', /part.{0,15}labeled|space labeled|is labeled|labeled [ivx]+\b|name of the diagram|diagram represented|magnification|specimen|drawing rule|biological drawing/i],

  // ---- Last-resort fallbacks ---------------------------------------------
  ['bio-growth-regulators', /for growth to occur|rate of growth/i],
];

function classify(q) {
  const text = normalizeMathText(String(q.question || '')).replace(/\s+/g, ' ');
  for (const [topic, re] of RULES) {
    if (re.test(text)) {
      if (process.env.WHY === '1') {
        const m = text.match(re);
        console.error(
          `WHY ${topic} <= /${re.source.slice(0, 80)}/ => "${String(m && m[0]).slice(0, 50)}" | ${text.replace(/\s+/g, ' ').slice(0, 60)}`,
        );
      }
      return topic;
    }
  }
  return null;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = createClient(URL_, apply ? srk : ANON);
  if (apply && !srk) {
    console.error('SUPABASE_SERVICE_ROLE_KEY required for --apply');
    process.exit(1);
  }

  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('study_questions')
      .select('id, year, question, course')
      .eq('subject', 'biology')
      .is('course', null)
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('fetch error:', error.message);
      process.exit(1);
    }
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  console.log(`fetched ${rows.length} untagged biology questions`);

  const byTopic = {};
  const untagged = [];
  const plan = [];
  for (const r of rows) {
    const t = classify(r);
    if (!t) {
      untagged.push(r);
      continue;
    }
    (byTopic[t] = byTopic[t] || []).push(r.id);
    plan.push({
      year: r.year,
      topic: t,
      snippet: String(r.question).replace(/\s+/g, ' ').slice(0, 90),
    });
  }

  console.log('\n=== classification summary ===');
  for (const [t, ids] of Object.entries(byTopic).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(ids.length).padStart(4)}  ${t}`);
  }
  console.log(`  ${String(untagged.length).padStart(4)}  (no match — stays null)`);
  console.log(
    `  coverage: ${plan.length}/${rows.length} (${rows.length ? Math.round((100 * plan.length) / rows.length) : 0}%)`,
  );

  if (process.argv.includes('--full')) {
    console.log('\n=== full listing ===');
    for (const p of plan) console.log(`${p.topic.padEnd(24)} ${p.year} ${p.snippet}`);
    console.log('\n=== UNMATCHED ===');
    for (const r of untagged) {
      console.log(
        `(null)               ${r.year} ${String(r.question).replace(/\s+/g, ' ').slice(0, 90)}`,
      );
    }
  }

  if (!apply) {
    console.log('\n(dry run — rerun with --apply to write)');
    return;
  }

  let updated = 0;
  for (const [topic, ids] of Object.entries(byTopic)) {
    const { error } = await db.from('study_questions').update({ course: topic }).in('id', ids);
    if (error) console.error(`update ${topic} failed:`, error.message);
    else updated += ids.length;
  }
  console.log(`\napplied: ${updated} rows tagged`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
