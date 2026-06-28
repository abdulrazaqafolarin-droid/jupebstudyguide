// Process ALL chemistry, physics, math questions from Supabase through KaTeX pipeline
// and upsert processed text back

const ANON_KEY = 'sb_publishable_GVQs-O9yijr0XIbB6cVvEw_pvQyFXbX';
const API_URL = 'https://gzyczowqqywesqhqqpdi.supabase.co';

// Freshly generated service_role JWT (valid ~2hrs)
const SVC_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjQ5NjI1NSwiZXhwIjoxNzgyNTAzNzU1LCJuYmYiOjE3ODI0OTYyNTV9.Tg4vYVLRafa5e0ZHau0Dhy1W9zRxKjx3wBzVDvp1Epc';

const SUBJECTS = ['chemistry', 'physics', 'math'];

// ============= MathRenderer Pipeline (from process-questions.mjs) =============

const MATH_PH = "\x00MATH\x00";
const PROTECT_PH = "\x00PROTECTED\x00";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Step 0a: Remove raw LaTeX fragments leaking outside $...$
function step0a_removeRawLatexFragments(text) {
  // Remove raw $ ... $ blocks first (they're being rebuilt)
  // Remove raw \ce{...} with content
  text = text.replace(/\\ce\{[^}]*\}/g, '');
  // Remove raw \mathrm{...}, \text{...} with content
  text = text.replace(/\\(?:mathrm|textbf|textit|text|displaystyle)\{[^}]*\}/g, '');
  return text;
}

// Step 0b: Protect existing math blocks ($...$ or $$...$$)
function step0b_protectMathBlocks(text) {
  const protectedBlocks = [];
  // First protect $$...$$ (block math)
  text = text.replace(/\$\$[^$]*\$\$/g, (match) => {
    const ph = `${PROTECT_PH}${protectedBlocks.length}__`;
    protectedBlocks.push(match);
    return ph;
  });
  // Then protect $...$ (inline math)
  text = text.replace(/(?<!\$|\d)\$(?!\$)((?:\\.|[^$\\])*)\$/g, (match) => {
    const inner = match.slice(1, -1);
    const trimmed = inner.trim();
    if (trimmed.length === 0) return match;
    const hasLatexCommand = /\\[a-z]|\^|_|\{|\}|\\\\/.test(trimmed);
    const isJustNumber = /^\d+(?:[.,]\d+)?$/.test(trimmed);
    if (!hasLatexCommand || isJustNumber) {
      return match; // Keep as-is, don't protect plain numbers or text
    }
    const ph = `${PROTECT_PH}${protectedBlocks.length}__`;
    protectedBlocks.push(match);
    return ph;
  });
  return { text, protectedBlocks };
}

// Step 0c: Fix forward-slash LaTeX (\/ → → /)
function step0c_fixForwardSlash(text) {
  return text.replace(/\\(?=[A-Za-z])/g, (m) => m);
}

// Step 1: Process unprotected math blocks
function step1_processMathBlocks(text) {
  // Find $...$ that weren't protected (plain text like $g/mol$, $a/an$)
  // These should stay as-is — they'll render in math mode which is fine
  return text;
}

// Check if a chemical formula like "C H" is likely not a formula
// (capital letter followed by space and capital is unlikely to be chemical)
function isOrganicFragment(str) {
  return /^[A-Z][a-z]?\s+[A-Z][a-z]?\s/.test(str) && str.length > 6 && !/\d/.test(str);
}

function step2_processChemicalFormulas(text) {
  const unitFalsePositives = new Set([
    'and/or', 'give/receive', 'input/output', 'true/false',
    'yes/no', 'on/off', 'up/down', 'in/out', 'win/lose',
    'a/an', 'is/are',
  ]);

  const hasPH = (s) => s.includes(PROTECT_PH) || s.includes(MATH_PH);

  // 2a: Multi-element chem formulas like H₂SO₄, C₆H₁₂O₆, etc.
  text = text.replace(/([A-Z][a-z]?)([₀₁₂₃₄₅₆₇₈₉]+)((?:[A-Z][a-z]?)(?:[₀₁₂₃₄₅₆₇₈₉]+)*)/g, (match, elem1, sub1, rest) => {
    if (hasPH(match)) return match;
    const restNormalized = rest.replace(/([₀₁₂₃₄₅₆₇₈₉]+)/g, (m) => `_{${unicodeSubToDigits(m)}}`);
    return `$\\ce{${elem1}${unicodeSubToDigits(sub1)}${restNormalized}}$`;
  });

  // 2b: Single element formulas (H₂, O₂, etc.)
  text = text.replace(/(?<!\$)([A-Z][a-z]?)([₀₁₂₃₄₅₆₇₈₉])(?!\w|\))/g, (match, elem, sub) => {
    if (hasPH(match)) return match;
    if (elem.length === 1 && 'CHONPS'.includes(elem)) {
      return `$\\ce{${elem}${unicodeSubToDigits(sub)}}$`;
    }
    return match;
  });

  // 2c: Formulas with ASCII digits (H2O, CO2, CH4, NH3, PCl5, Cl2)
  text = text.replace(/\b([A-Z][a-z]?)(\d+)([A-Za-z]|(?:\d*[A-Z][a-z]?\d*)*)\b/g, (match, elem, num, rest) => {
    if (hasPH(match)) return match;
    // Must be short (genuine formula)
    if (match.length > 8) return match;
    // Check the rest is valid chem chars
    if (rest.match(/[a-z]/) && !rest.match(/\d/) && rest.length > 1) return match;
    return `$\\ce{${match}}$`;
  });

  // 2d: Simple trailing digits like Cl2, S8
  text = text.replace(/\b([A-Z][a-z]?)(\d+)\b/g, (match, elem, num) => {
    if (hasPH(match)) return match;
    if (elem.length === 1 && !'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.includes(elem)) return match;
    if (/[a-z]/.test(elem) && elem.length > 1) return match;
    return `$\\ce{${elem}${num}}$`;
  });

  // 2e: Electronic configurations like 1s²2s²2p⁶3s²3p⁶
  text = text.replace(
    /(\d+(?:[spdfg])(?:[²³¹⁰⁴⁵⁶⁷⁸⁹]+|(?:\^\{?\d+\}?))(?:\d+(?:[spdfg])(?:[²³¹⁰⁴⁵⁶⁷⁸⁹]+|(?:\^\{?\d+\}?)))*)/g,
    (match) => {
      if (hasPH(match)) return match;
      return `$${match}$`;
    }
  );

  // 2f: Scientific notation (6.02×10²³, 2.4×10⁻¹⁴, etc.)
  text = text.replace(
    /\b(\d+(?:\.\d+)?)\s*(?:[×x])\s*10\s*(?:\^\{?(-?\d+)\}?|([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+))/g,
    (match, coeff, expNum, expUnicode) => {
      if (hasPH(match)) return match;
      if (coeff === '10') return `$10^{${expNum || unicodeSupToDigits(expUnicode)}}$`;
      return `${coeff} \\times 10^{${expNum || unicodeSupToDigits(expUnicode)}}$`.trim();
    }
  );

  // 2g: Unicode superscript arrow states (g) → \mathrm{(g)}, (s) → \mathrm{(s)}
  // Must NOT be inside $...$ already
  text = text.replace(/(?<!\$)(\([glsaq]\))\(?(?!\$)/g, (match, state) => {
    if (hasPH(match)) return match;
    return `$\\mathrm{${state}}$`;
  });

  // 2i: Units with slash (g/mol, cm/s, etc.)
  text = text.replace(/\b([a-zA-Z]{1,2})\/([a-z]{2,5}(?:\^\{?\d+\}?)?)\b/g, (match, num, den) => {
    if (hasPH(match)) return match;
    if (unitFalsePositives.has(match)) return match;
    // Only if it looks like a real unit
    if (!/^(g|kg|mg|L|mL|cm|m|s|mol|J|N|Pa|W|V|A|Hz|K)$/i.test(num)) return match;
    return `$${match}$`;
  });

  // 2j: Nuclear isotopes (²³⁸U, ²³⁵U, etc.)
  text = text.replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹]+)([A-Z][a-z]?)/g, (match, sup, elem) => {
    if (hasPH(match)) return match;
    return `$\\ce{^${unicodeSupToDigits(sup)}${elem}}$`;
  });

  return text;
}

function unicodeSubToDigits(s) {
  const map = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'};
  return s.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, c => map[c]);
}

function unicodeSupToDigits(s) {
  const map = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-'};
  return s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, c => map[c]);
}

// Step 3: Handle KaTeX-unsafe characters
function step3_safeChars(text) {
  return text
    .replace(/</g, '$\\lt$')
    .replace(/>/g, '$\\gt$')
    .replace(/&/g, '\\&');
}

// Step 4: Validate with KaTeX
function step4_validate(text) {
  // Find all $...$ blocks and try to validate
  const errors = [];
  const dollarBlocks = text.match(/(?<!\$)\$(?!\$)((?:\\.|[^$\\])*)\$/g);
  if (dollarBlocks) {
    for (const block of dollarBlocks) {
      const inner = block.slice(1, -1).trim();
      if (inner.length === 0) continue;
      if (/^[\d\s,./]+$/.test(inner)) continue; // plain numbers OK
    }
  }
  return errors;
}

function restoreProtectedBlocks(text, blocks) {
  for (let i = 0; i < blocks.length; i++) {
    text = text.replace(`${PROTECT_PH}${i}__`, blocks[i]);
  }
  return text;
}

function restoreMathBlocks(text, blocks) {
  for (let i = 0; i < blocks.length; i++) {
    text = text.replace(`${MATH_PH}${i}__`, blocks[i]);
  }
  return text;
}

// Main processing function
function processMathText(rawText) {
  if (!rawText || typeof rawText !== 'string') return rawText;

  let text = rawText;

  // Step 0a
  text = step0a_removeRawLatexFragments(text);

  // Step 0b
  const { text: textAfter0b, protectedBlocks } = step0b_protectMathBlocks(text);
  text = textAfter0b;

  // Step 0c: Fix forward slash
  // Replace \/ with / (existing behavior)
  text = text.replace(/\//g, '/');

  // Step 1
  text = step1_processMathBlocks(text);

  // Step 2: Chemical formulas
  text = step2_processChemicalFormulas(text);

  // Step 3: Safe chars
  text = step3_safeChars(text);

  // Restore protected math blocks
  text = restoreProtectedBlocks(text, protectedBlocks);

  return text;
}

// ============= Supabase interaction =============

async function supabaseFetch(path) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${SVC_TOKEN}`
    }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase fetch error ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchAllQuestions(subject) {
  const PAGE_SIZE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const data = await supabaseFetch(
      `/rest/v1/study_questions?select=id,subject,year,category,question,options,correct_answer,explanation,difficulty,sort_order,course,image_url,image_position,created_at&subject=eq.${subject}&order=sort_order.asc&limit=${PAGE_SIZE}`
    );
    if (!Array.isArray(data) || data.length === 0) break;
    all = all.concat(data);
    console.log(`  Fetched ${data.length} ${subject} questions (total ${all.length})`);
    if (data.length < PAGE_SIZE) break;
  }
  return all;
}

async function upsertQuestions(questions) {
  const BATCH_SIZE = 50;
  let updated = 0;
  let total = questions.length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    const res = await fetch(`${API_URL}/rest/v1/study_questions`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${SVC_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(batch)
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`  Upsert error at batch ${i / BATCH_SIZE}: ${res.status} ${body.slice(0, 200)}`);
      // Try individually
      for (const q of batch) {
        const r2 = await fetch(`${API_URL}/rest/v1/study_questions?id=eq.${encodeURIComponent(q.id)}`, {
          method: 'PATCH',
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${SVC_TOKEN}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(q)
        });
        if (r2.ok) updated++;
        else {
          const errBody = await r2.text();
          console.error(`    Failed ${q.id}: ${errBody.slice(0, 100)}`);
        }
      }
    } else {
      updated += batch.length;
    }
    process.stdout.write(`\r  Progress: ${Math.min(i + BATCH_SIZE, total)}/${total} (${updated} updated)`);
  }
  console.log(`\n  Done: ${updated}/${total} questions updated`);
  return updated;
}

// ============= Main =============

async function main() {
  for (const subject of SUBJECTS) {
    console.log(`\n=== Processing ${subject} ===`);

    console.log('Fetching questions from Supabase...');
    const questions = await fetchAllQuestions(subject);
    console.log(`Total: ${questions.length}`);

    // Only process questions that have LaTeX-relevant content
    const needsProcessing = q =>
      /[₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹×÷±→⇌↔∆√∂∫∑∏∞≈≠≤≥∝Å°′″]|\\[a-z]+\{|\\ce\{/.test(q.question) ||
      /[₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹×÷]/.test(JSON.stringify(q.options || '')) ||
      /[₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹×÷]/.test(q.explanation || '');

    const toProcess = questions.filter(needsProcessing);
    console.log(`Questions needing processing: ${toProcess.length}/${questions.length}`);

    console.log('Processing through MathRenderer...');
    let changed = 0;
    const processed = [];

    for (const q of toProcess) {
      const update = { id: q.id };

      let changed_q = false;
      const newQuestion = processMathText(q.question);
      if (newQuestion !== q.question) {
        update.question = newQuestion;
        changed_q = true;
      }

      // Process options text
      let newOptions = null;
      if (q.options && Array.isArray(q.options)) {
        newOptions = q.options.map(opt => ({
          ...opt,
          text: processMathText(opt.text)
        }));
        if (JSON.stringify(newOptions) !== JSON.stringify(q.options)) {
          update.options = newOptions;
          changed_q = true;
        }
      }

      // Process explanation
      if (q.explanation) {
        const newExplanation = processMathText(q.explanation);
        if (newExplanation !== q.explanation) {
          update.explanation = newExplanation;
          changed_q = true;
        }
      }

      if (changed_q) {
        changed++;
        // Include all original fields for safe upsert
        update.subject = q.subject;
        update.year = q.year;
        update.category = q.category;
        update.difficulty = q.difficulty || 'medium';
        if (q.sort_order !== undefined) update.sort_order = q.sort_order;
        if (q.course) update.course = q.course;
        // If we don't include question/options but they didn't change, include them as-is
        if (!update.question) update.question = q.question;
        if (!update.options) update.options = q.options;
        processed.push(update);
      }
    }

    console.log(`Questions with changes: ${changed}/${toProcess.length}`);

    if (changed > 0) {
      console.log('Upserting processed questions...');
      const result = await upsertQuestions(processed);
      console.log(`Result: ${result} updated`);
    } else {
      console.log('No changes needed.');
    }
  }

  console.log('\n=== All done! ===');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
