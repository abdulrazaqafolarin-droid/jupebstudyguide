/**
 * Classify untagged chemistry questions (course = null) into JUPEB syllabus
 * topic IDs (src/types/syllabus.ts — the 27 chm-* topics). Deterministic
 * keyword rules, first match wins. Dry-run by default.
 *
 * Many bank rows are multi-part exam-page blobs (several sub-questions in one
 * row), so rule ORDER implements a headline-first heuristic: explicit
 * apparatus/data markers and headline nouns outrank generic words that only
 * appear in later sub-parts (e.g. "chlorine" deep inside an organic row).
 *
 * Usage:
 *   node tag-chem-topics.cjs            # dry run: summary + listing
 *   node tag-chem-topics.cjs --full     # include every classified snippet
 *   WHY=1 node tag-chem-topics.cjs      # print the pattern that matched each row
 *   node tag-chem-topics.cjs --apply    # write tags (needs SUPABASE_SERVICE_ROLE_KEY env)
 */
const { createClient } = require('@supabase/supabase-js');

const URL_ = 'https://gzyczowqqywesqhqqpdi.supabase.co';
const ANON = 'sb_publishable_GVQs-O9yijr0XIbB6cVvEw_pvQyFXbX';

// Some pasted questions contain mathematical italic/bold letters (e.g. glyphs
// for "Kw"). Fold those to ASCII so keyword rules can see them.
function normalizeMathText(text) {
  return text.replace(/[\u{1D400}-\u{1D49B}]/gu, (ch) => {
    // Each family (bold, italic, bold-italic) is 52 code points: 26 upper + 26 lower.
    const off = ch.codePointAt(0) - 0x1d400;
    const blockStart = Math.floor(off / 52) * 52;
    const pos = off - blockStart;
    return pos < 26 ? String.fromCharCode(65 + pos) : String.fromCharCode(97 + pos - 26);
  }).replace(/[\u2080-\u2089]/g, (d) => String.fromCharCode(48 + d.charCodeAt(0) - 0x2080))
    .replace(/\u208a/g, '+').replace(/\u208b/g, '-')
    .replace(/\u2212/g, '-');
}

// Ordered rules — first match wins.
const RULES = [
  // ---- Periodicity (above electro: trend blobs also mention conductivity
  //      or electrode-free sub-questions later in the page) ----------------
  ['chm-periodicity', /periodic (table|law|trend|propert|classific)|mendeleev|ionization (energy|potential|enthalpy)|ionisation (energy|potential|enthalpy)|electron affinity|electronegativit|atomic (radius|size)|ionic radii|isoelectronic|order of melting points|periodic (group|relationship)|shielding|screening effect/i],
  ['chm-periodicity-advanced', /s[- ]?block|alkali metal|alkaline earth|diagonal relationship|group (i|ii|1|2)[ -]?(metal|element)s?\b|extraction of (sodium|potassium|calcium|magnesium|lithium)|hydrogen (isotope|hydride|peroxide|occurrence)|anomalous (period )?ii|period iii (trend|element)/i],

  // ---- Electrochemistry (explicit cell/electrode data) -------------------
  ['chm-electrochemistry', /electrolys|electrode|electrochemical|electrolytic|\bemf\b|e\.?\s*m\.?\s*f\.|half[- ]?cell|e\s*[\u00b0\u2205]\s*=|nernst|faraday'?s? law|conductivit|conductance|\banode\b|\bcathode\b|galvanic|voltammetr|fuel cell|electroplating|electrochemical series|standard (electrode|reduction) potential|discharge potential|quantity of electricity|current through.{0,30}solution|oxidation potential/i],

  // ---- Mole: quantitative-analysis HEADLINE guard (before equilibrium
  //      steals titration practicals via "indicator"/"pH") ---------------
  ['chm-mole', /\bquantitative analysis|\baverage titre\b|titre value|burette readings?|^(?:[\s\S]{0,80})\b(molality|molarity|mole fraction)\b/i],

  // ---- Nuclear (before thermo: blobs pair decay data with enthalpy
  //      definitions; "half-life of the reaction" stays with kinetics) ----
  ['chm-nuclear', /radioactiv|(alpha|beta|gamma)[- ]?(decay|particle|radiation|emission|ray)|type of radiation|half[- ]?life(?! of the reaction)|carbon[- ]?14|carbon dating|mass defect|nuclear (equation|reaction|fission|fusion|stability)|nuclide|activity of a (sample|source)|geiger|fallout|nuclear fuel|binding energy per nucleon|decay constant|\u03b1[- ](decay|particle)|\u03b2[- ]particle/i],

  // ---- Energy -------------------------------------------------------------
  ['chm-thermochemistry', /enthalpy|exotherm|endotherm|hess'?s? law|born[- ]?haber|heat of (combustion|formation|neutralization|solution|reaction)|bond energy|bond enthalpy|calorimetr|heat capacity|temperature (change|rise|fall).{0,30}(reaction|solution|mixture)|thermochem|[\u2206\u0394]\s*h/i],
  ['chm-thermodynamics', /entropy|gibbs|spontane(ous|ity)|first law of thermodynamics|second law|internal energy|adiabatic|isothermal|(work|heat).{0,20}(done )?(by|on) the (gas|system)|free energy|carnot/i],

  // ---- Kinetics -----------------------------------------------------------
  ['chm-kinetics', /rate of reaction|rate constant|order of reaction|activation energy|arrhenius|catalys|collision theory|velocity of reaction|temperature coefficient|half[- ]?life of the reaction|rate (law|expression)|initial rate|specific rate/i],

  // ---- Equilibrium (incl. acid-base, pH, Ksp, reversible arrows) ---------
  ['chm-equilibrium', /equilibrium|le chatelier|law of mass action|\bk\s*_?[cp]\b|equilibrium constant|\bp\s*h\b|buffer|solubility product|\bk\s*sp\b|common ion|salt hydrolysis|hydrolysis (of (a )?salt|constant)|ionization constant|\bk\s*a\b|\bk\s*b\b|\bk\s*w\b|degree of dissociation|ionization of|\bindicators?\b|titration curve|equilibrium (concentration|position|shift)|ph scale|hydrogen ion concentration|weak (acid|base)|acid[- ]base|\u21c4|\u21cc|<->/i],

  // ---- Organic macromolecules (headline of polymer blobs, which also
  //      contain alkyl-halide reaction sub-questions) ---------------------
  ['chm-macromolecules', /carbohydrate|protein|amino acid|peptide|zwitterion|\bpolymer|glucose|fructose|sucrose|starch|cellulose|thermoset|thermoplastic|natural rubber|triglyceride|lipid|denatur/i],

  // ---- Types of reactions -------------------------------------------------
  ['chm-reactions', /neutraliz|precipitat|disproportion|double (displacement|decomposition|exchange)|single (displacement|replacement)|oxidation number|oxidation state of|balancing (the )?(redox|oxidation)|oxidizing agent|reducing agent|redox reaction|volume of .{0,30}(acid|alkali|base).{0,40}neutraliz|reacts? with (the )?water|with water to (give|form)|\+ ?H2O|balanced chemical equation/i],

  // ---- Mole concept / quantitative (incl. volumetric analysis) -----------
  ['chm-mole', /\bmole\b|stoichiom|avogadro|limiting reagent|percentage yield|percent yield|empirical formula|percent(age)? composition|relative (atomic|molecular) mass|molecular mass|molar mass|vapour density|mass spectr(um|om|a)|molarity|molality|mole fraction|standard solution|serial dilution|concentration of (the|a) solution|\bmol\s*(dm|dm3|-3|per)|ppm\b|titre|titrat|volumetric analysis/i],

  // ---- Organic block (before p-block: "CH3Cl–benzene + NaOH", "chlorine +
  //      methane" rows; mechanism terms before family names) ---------------
  // Isomer-HEADLINE guard: "What is isomerism?" rows also contain later
  // sub-parts about electrophilic substitution etc.
  ['chm-isomerism', /^(?:[\s\S]{0,120})\bisomer/i],
  ['chm-organic-reactions', /\bsn1\b|\bsn2\b|nucleophil|electrophil|addition reaction|substitution reaction|elimination reaction|free radical|homolytic|heterolytic|inductive effect|mesomeric|electromeric|markovnikov|reaction mechanism|dehydrohalogen/i],
  ['chm-hydrocarbons', /\balkane|\balkene|\balkyne|aromatic|benzene|toluene|phenol|\balcohol|\baldehyde|\bketone|carboxylic acid|\bester|\bamine|\bamide|haloalkane|alkyl halide|lucas test|jones test|nitration of|sulphonation|sulfonation|friedel[- ]?crafts|ethanol|methanol|ethanoic|ethene|ethyne|(?:meth|eth|prop|but|pent|hex|hept|oct|non|dec)an(?:one|al|ol|amine)\b|anoic acid|glycerol|saponification/i],
  ['chm-isomerism', /isomer|geometrical|cis[- ]?trans|\bcis\b|\btrans\b (isomer|form)|optical|chiral|enantiomer|tautomer|metameris|racemic|dextrorotatory|levorotatory/i],
  ['chm-organic-structure', /iupac|nomenclature|homologous series|functional group|tetravalen|sigma and pi|structural formula|degree of unsaturation/i],

  // ---- Bonding & shapes (VSEPR before p-block steals "shape of ICl3") ---
  ['chm-bonding', /vsepr|lone pair|bond pair|shape of (the )?molecule|molecular shape|hybridis|hybridiz|ionic (bond|compound)|electrovalent|covalent (bond|compound)|coordinate (bond|compound)|dative|metallic bond|hydrogen bond|intermolecular|van der waals|bond (energy|length|polarity|angle|order)|sigma bond|pi bond|dipole|sp[23] hybrid|\bep pair|electron (pair )?repulsion/i],

  // ---- Inorganic blocks ------------------------------------------------------
  ['chm-pblock', /halogen|hydrogen halide|interhalogen|allotrop|group (14|15|16|17|iv|v|vi|vii)[ -]?(element|metal|non)?|carbon group|nitrogen group|sulphur group|sulfur group|\b(ammonia|sulphur dioxide|sulfur dioxide|nitrogen dioxide|carbon monoxide|silicon)\b|contact process|haber process|chlorine|bromine|iodine|fluorine|phosphorus|\bsulphuric\b|\bsulfuric\b|\bnitric acid\b|oxides of/i],
  ['chm-dblock', /transition (element|metal)|coordination|ligand|complex ion|crystal field|chelat|coordination number|d[- ]?block|lanthanid|actinid|variable oxidation state|valence bond theory|nomenclature of.{0,30}(complex|compound)|interstitial|alloy of/i],

  // ---- Atomic structure ------------------------------------------------------
  ['chm-atomic', /atomic structure|bohr|quantum number|orbital|electron configuration|electronic configuration|aufbau|hund'?s? rule|pauli|subatomic|proton|neutron|de broglie|schrodinger|heisenberg|isotop|mass number|excited (state|electron)|ground state|atomic number/i],

  // ---- Gases / separation / environment etc. -----------------------------------
  ['chm-gases', /gas law|boyle'?s? law|charles'?s? law|gay[- ]?lussac|ideal gas|kinetic (theory|molecular).{0,20}gas|kinetic theory of gases|van der waals|boltzmann|molar volume (of|at)|22[.,]4\s*(dm|litre|liter)|avogadro'?s? law|partial pressure|dalton'?s? law|gaseous (state|law|property)|compressib|\bp\s*v\s*=\s*nrt\b|pressure of (the |a )?gas|density of (the |a )?gas|liquefaction|occupies|\d+\s*dm\s*3/i],
  ['chm-petroleum', /crude oil|petroleum|cracking|petrochemical|refinery|refining|fractional distillation of|reforming|gasoline|kerosene|naphtha|fractionation of .{0,20}crude/i],
  ['chm-separation', /chromatograph|distillation|recrystall|purification|separating funnel|sodium fusion|Rf value|melting point (of|determin)|sublimation (of|technique)|crystallization|solvent extraction|drying agent|anhydrous/i],
  ['chm-environment', /greenhouse|acid rain|ozone|global warming|climate change|\bCFC\b|photochemical smog|pollut|depletion of the ozone/i],
  ['chm-nanochemistry', /\bnano|fullerene|nanotube|nanoparticle|nanomaterial/i],
  ['chm-measurement', /\bSI unit|significant figure|precision|accuracy|systematic error|random error|standard deviation|vernier|micrometer|dimensional analysis|reproducib|sensitivity of|limit of error|uncertaint|unit of measurement|measurement of/i],
  ['chm-matter', /three states|states of matter|phase (change|diagram|transition)|interconver|amorphous|crystalline|brownian|(solid|liquid).{0,30}(property|structure)|plastic crystal|supercooled/i],
  ['chm-solutions', /raoult|colligative|freezing point (depression|lowering|of the solution)|boiling point (elevation|of the solution)|osmotic|vapour pressure (lowering|of)|relative lowering|azeotrop|ideal (and )?non[- ]?ideal solution/i],
];

function classify(q) {
  const text = normalizeMathText(String(q.question || ''));
  for (const [topic, re] of RULES) {
    if (re.test(text)) {
      if (process.env.WHY === '1') {
        const m = text.match(re);
        console.error(
          `WHY ${topic} <= /${re.source.slice(0, 90)}/ => "${String(m && m[0]).slice(0, 60)}" | ${text.replace(/\s+/g, ' ').slice(0, 70)}`,
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
      .eq('subject', 'chemistry')
      .is('course', null)
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('fetch error:', error.message);
      process.exit(1);
    }
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  console.log(`fetched ${rows.length} untagged chemistry questions`);

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
      id: r.id,
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
