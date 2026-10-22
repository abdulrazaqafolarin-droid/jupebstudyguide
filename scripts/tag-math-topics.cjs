/**
 * Classify untagged math questions (course = null) into JUPEB syllabus topic IDs.
 * Deterministic keyword rules, first match wins. Dry-run by default.
 *
 * Usage:
 *   node tag-math.cjs            # dry run: summary + full listing with --full
 *   node tag-math.cjs --apply    # write tags to Supabase (needs SUPABASE_SERVICE_ROLE_KEY env)
 */
const { createClient } = require("@supabase/supabase-js");

const URL_ = "https://gzyczowqqywesqhqqpdi.supabase.co";
const ANON = "sb_publishable_GVQs-O9yijr0XIbB6cVvEw_pvQyFXbX";

// Ordered rules — first match wins. Order matters:
// stats > counting > CALCULUS (int/diff before trig so "∫ sin x dx" is
// integration, not trig) > complex > vectors > trig > logs > coord >
// sequences > algebra > mechanics/forces > kinematics.
const RULES = [
  // ── Statistics & distributions ────────────────────────────────────────
  ["mat-normal", /normal distribution|normally distributed|standard normal|standard score|z[- ]?score|chi[- ]?square|hypothesis test|statistical hypothesis|hypothesis of primary|hypothesis can be|two[- ]tailed|one[- ]tailed|rejection region|type i+ +error|student'?s? t[- ]|t[- ]distribution|goodness of fit|contingency table|sampling distribution|central limit|[~∼]\s*N\s*\(|N\s*\(\s*0,?\s*1\s*\)|P\s*\(\s*Z\b/i],
  ["mat-regression", /regression|correlation|product moment|scatter diagram|rank correlation|spearman|strongest linear|linear relationsh|r\s*²|β_?[01]|beta_?[01]/i],
  ["mat-statistics", /\bmean\b|\bmedian\b|\bmode\b|standard deviation|variance of (the )?(data|numbers|values)|quartile|interquartile|skewness|kurtosis|ogive|histogram|frequency (table|polygon|distribution)|measure(s)? of (central|dispersion|location)|dispersion of|largest and smallest|calculate the (mean|average)|weighted mean|bars are joined/i],
  ["mat-sampling", /\bsampl(e|ing|ed)\b.*(technique|size|frame|population|method)|finite population|infinite population|random sampl|population parameter|point estimat/i],
  ["mat-probability", /probabilit|at random|likelihood|\bchance\b|bernoulli|poisson|P\s*_?\s*0\s*\(|[~∼]\s*Bi|Bi\s*\(\s*\d|binomial experiment|binomial distribution|two outcomes|\bindependent\b|expected value|expectation of|E\s*\(\s*[A-Z]\s*\)|continuous random|discrete random|\bleq\b|with(?:out)? replacement|balls? (are|is) selected|p\s*\(\s*only|p\s*\(\s*[a-z]+\s+[a-z]+\s*\)|p\s*\(\s*[a-z0-9]+\s*(?:[∩∪]\s*[a-z0-9]+\s*)?\)\s*[=<>≤≥]|p\s*\(\s*[a-z]+\s*[∩∪]/i],

  // ── Counting ──────────────────────────────────────────────────────────
  ["mat-counting", /permutation|combination|factorial|arrangements? of|distinct (letters|objects|ways)|n!? ?c ?r|Cr\s*=|how many (ways|different)|how many [a-z]+\s*-?\s*letter|code\s*-?\s*words|tossed together|tossed simultaneously/i],

  // ── Calculus: integration (before differentiation and trig) ───────────
  ["mat-int-apps", /volume (generated|of revolution|when the area|of tetrahedron)?|area under (the )?curve|area between|area bounded|ordinat|trapezoidal rule|simpson'?s? rule|rotated (about|through)|evaluate the area of/i],
  ["mat-int", /\bintegrat(e|ion|ed|able)\b|∫|\bint\b|antiderivative|indefinite integral|definite integral|by parts\b|reduction formula|integral of/i],

  // ── Calculus: differentiation ─────────────────────────────────────────
  ["mat-diff-apps", /maximum and minimum|maxima and minima|\bmax(imum)?\s*value\b|rate of (change|increase|decrease)|curve sketch|maclaurin|taylor'?s? series|stationary point|turning point|relative (maximum|minimum)|approximate (value|change)|increase at the rate|solid of revolution/i],
  ["mat-ode", /differential equation|second[- ]order|d\s*2\s*y\s*\/\s*d\s*x\s*2|\bd2y\b|d\s*\^\s*\d+\s*y|\bhomogeneous\b.*(equation|differential)|complementary function|particular integral|exponential growth|exponential decay/i],
  ["mat-diff", /\bd\s*y\s*\/\s*d\s*x\b|dfrac\s*\(\s*dy|\bd\s*[\^²2]\s*y|\bdelta\s*[xy]\b|Δ[xy]|y\s*''|y''|differentia|derivative|gradient of (the |a )?(curve|graph|function)|gradient of y|gradient of f|gradient of [\dx(]|differentiate|first principles|nth derivative|\blim\b|lim\s*_|limx|\blimits?\b|continuous|continuity|x\s*dy|dy\s*\+|\+\s*y\s*dx|chain rule|quotient rule/i],

  // ── Complex numbers ───────────────────────────────────────────────────
  ["mat-complex", /complex number|argand|polar form|de moivre|modulus of.*i\b|conjuga\w+ of|roots of unity|z\s*=\s*\d+\s*[-+]\s*\d*i|nth root of unity|\(2\s*\+\s*3i\)|\bi\s*\^?\s*2\b|where i is the imaginary|i\s*\)\s*[⁻\^²]|\bx\s*\+\s*i\s*y\b|in the form a|imaginary (unit|part)|real and imaginary/i],

  // ── Vectors ───────────────────────────────────────────────────────────
  ["mat-vectors", /\bvector(s)?\b|\bunit vector\b|\bscalar product\b|\bdot product\b|\bcross product\b|position vector|vector addition|vector equation of|equation of the plane containing|sum of the vectors|adjacent sides are|parallelogram whose|scalar quantity|vector quantity|mathbf|tetrahedron|projection of|\d?[ijk]\^?\s*[+\-−]\s*\d?[ijk]\^?|\)\s*[ijk]\b|\bx\s*[-–]\s*component|component of their resultant|\bi\s*[·*×x]\s*j\b|\b2i\s*\+\s*j\b|direction cosines/i],

  // ── Trigonometry (function names not preceded/followed by letters:
  //    catches "6tanθ", "7sec^2", "sin²" while ignoring "tangent", "cost") ─
  ["mat-trig", /(?<![a-z])(?:sin|cos|tan|sec|cosec|cot)(?![a-z])|trigonometr|trigonomatr|angle of (elevation|depression)|radian|arc length|sector (area|of a circle)|sine rule|cosine rule|identit(y|ies) (of|in) (sin|cos|the three)|complementary (angle|ratio)|bearing/i],

  // ── Logs / exponentials (log laws & equations → Algebra) ─────────────
  ["mat-logarithm", /log(arithm)?s?\b.{0,40}(deriv|differ|limit|graph|exponential)|differ\w*\s+of\s+\w*log|log\w*\s+(graph|curve)|change of base/i],
  ["mat-exponential", /\be\^\s*\(|exponential (function|curve|growth|decay|graph|model)|\(e\^|\d+\^\s*\(?x|compute x if|compute the value of x|expression for e/i],
  ["mat-algebra", /log[_\d₀-₉(]|log(arithm)?s?\s|\bindices\b|\bpowers of\b/i],

  // ── Coordinate geometry ───────────────────────────────────────────────
  ["mat-coord", /\bcircles?\b|straight line|gradient of (a |the )?line|slope of|midpoint|parallel (lines|to)|perpendicular (lines|to)|equation of (a |the )?line|equation of the normal|equation of the tangent|asymptote|common points|points of intersection|locus|parabola|ellipse|hyperbola|normal to the (line|curve)|tangent (to|of|at) (the )?(line|circle|curve)|angle between (the )?lines|centre and (the )?radius|center and radius|distance between (the )?points|coordinate(s)? of the (point|vertices)|cartesian/i],

  // ── Sequences / real numbers ──────────────────────────────────────────
  ["mat-numbers", /\bsequence\b|\bseries\b|arithmetic (progression|sequence)|geometric (progression|sequence)|harmonic progression|progression|common difference|common ratio|sum to infinity|sum of the first|mathematical induction|binary operation|rational (number|s) and|irrational|surds?|U[_\s]?\d|U[_\s]n\s*=|T[_\s]n\s*=/i],

  // ── Sets / algebra catch-alls (after the precise rules) ───────────────
  ["mat-algebra", /\bset(s)?\b|venn|universal set|subset|∪|∩|n\s*\(\s*[A-Z]\s*[∩n]\s*[A-Z]|n\s*\(\s*[A-Z]\s*\)|quadratic (equation|expression|formula)|roots of the (equation)|equal roots|real roots|whose roots|are (the )?roots|sum of (the )?roots|product of (the )?roots|simultaneous|inequalit|range of values|\sle\s|\sge\s|≥|≤|\bmatrix\b|\bmatrices\b|vmatrix|det\(|determinant|partial[- ]fraction|∂\s*fraction|binomial (theorem|expansion|coefficient)|coefficient of|constant term in the expansion|in the expansion of|factor(is|iz)e|factors of|remainder (theorem|when|is)|factor theorem|divided by|quotient when|polynomial|inverse function|find f\(|compute f\s*\(|f\(\s*-?\d|f\(x\s*[-+]|f\s*-\s*1\s*\(|∘|\bcirc\b|√|\bsqrt\b|solve for x|find the value of x|equation of the line through|solve .*log|log_[a-z0-9]/i],

  // ── Mechanics / forces / kinematics ───────────────────────────────────
  ["mat-rigid-body", /moment of inertia|radius of gyration|perpendicular axis|parallel axis|angular acceleration|rotating (body|disc|rod)|centripetal/i],
  ["mat-forces", /equilibrium|resultant force|moment (of|about)|couple|centre of (gravity|mass)|parallel forces|inclined plane|friction|\btension|thrust|reaction (of|on|at)|smooth (plane|surface|peg|inclined)|coefficient of (friction|limiting)|weight of|least force|mu\s*=|\bhangs by|two forces|inclined at .* to the (vertical|horizontal)/i],
  ["mat-mechanics", /momentum|kinetic energy|potential energy|work done|power developed|newton'?s? laws|conservation of (energy|momentum)|impulse|\bforce\b.*(engine|brake|resistance)|weight of an object|mass of/i],
  ["mat-kinematics", /\bdisplacement\b|\bvelocity\b|\bspeed\b|acceleration|retardation|stopping distance|brakes|dropped from|falls freely|reaches the ground|comes? to (rest|a stop)|time to come|moving (at|with) \d|distance,? (moved|covered|travelled)|s\s*\(t\s*\)|v\s*\(t\s*\)|particle (moves|moving|starting)|projected (at|up|vertically|from)|per second\b.*\bm\b|uniformly (accelerated|retarded)/i],
];

function classify(q) {
  const text = String(q.question || "");
  for (const [topic, re] of RULES) {
    if (re.test(text)) return topic;
  }
  return null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = createClient(URL_, apply ? srk : ANON);
  if (apply && !srk) { console.error("SUPABASE_SERVICE_ROLE_KEY required for --apply"); process.exit(1); }

  // Fetch all math questions with null course (paginated).
  // --recoded also includes old "MAT 00x: …" course-code rows (paper-style
  // questions that can't match any syllabus topic name).
  const recoded = process.argv.includes("--recoded");
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = db
      .from("study_questions")
      .select("id, year, question, course")
      .eq("subject", "math")
      .range(from, from + PAGE - 1);
    q = recoded ? q.or('course.is.null,course.like."MAT %"') : q.is("course", null);
    const { data, error } = await q;
    if (error) { console.error("fetch error:", error.message); process.exit(1); }
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  console.log(`fetched ${rows.length} untagged math questions`);

  const byTopic = {};
  const untagged = [];
  const plan = [];
  for (const r of rows) {
    const t = classify(r);
    if (!t) { untagged.push(r); continue; }
    (byTopic[t] = byTopic[t] || []).push(r.id);
    plan.push({ id: r.id, year: r.year, topic: t, snippet: String(r.question).replace(/\s+/g, " ").slice(0, 90) });
  }

  console.log("\n=== classification summary ===");
  for (const [t, ids] of Object.entries(byTopic).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(ids.length).padStart(4)}  ${t}`);
  }
  console.log(`  ${String(untagged.length).padStart(4)}  (no match — stays null)`);
  console.log(`  coverage: ${plan.length}/${rows.length} (${Math.round(100 * plan.length / rows.length)}%)`);

  if (process.argv.includes("--full")) {
    console.log("\n=== full listing ===");
    for (const p of plan) console.log(`${p.topic.padEnd(16)} ${p.year} ${p.snippet}`);
    console.log("\n=== UNMATCHED ===");
    for (const r of untagged) console.log(`(null)           ${r.year} ${String(r.question).replace(/\s+/g, " ").slice(0, 90)}`);
  }

  if (!apply) { console.log("\n(dry run — rerun with --apply to write)"); return; }

  // Apply: one UPDATE per topic (grouped ids)
  let updated = 0;
  for (const [topic, ids] of Object.entries(byTopic)) {
    const { error } = await db.from("study_questions").update({ course: topic }).in("id", ids);
    if (error) { console.error(`update ${topic} failed:`, error.message); }
    else updated += ids.length;
  }
  console.log(`\napplied: ${updated} rows tagged`);
}

main().catch((e) => { console.error(e); process.exit(1); });
