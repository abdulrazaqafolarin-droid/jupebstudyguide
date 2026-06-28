import { chatCompletionJSON } from "./ai-service";
import { validateAndFixKaTeX, type KaTeXValidationError } from "./katex-validator";

export interface AIAnalysisResult {
  correctAnswer: string | null;
  topic: string | null;
  explanation: string;
  katexFixed: string | null;
  optionsFixed: { label: string; text: string }[] | null;
  katexErrors?: string[];
}

const KATEX_PROMPT_SECTION = `## LaTeX Quality Requirements (CRITICAL)

You MUST format ALL math, chemistry, and physics content using proper LaTeX inside $...$ or $$...$$ delimiters. Every formula MUST render correctly in KaTeX.

### Chemical Formulas
Always use \\ce{} inside $...$ for chemical notation:

WRONG → RIGHT:
- Cl2 → $\\ce{Cl2}$
- H2O → $\\ce{H2O}$
- H2SO4 → $\\ce{H2SO4}$
- Fe2+ → $\\ce{Fe^{2+}}$
- Fe3+ → $\\ce{Fe^{3+}}$
- SO4(2-) → $\\ce{SO4^{2-}}$
- [Co(NH3)6]F3 → $\\ce{[Co(NH3)6]F3}$
- 2H2O → $2\\ce{H2O}$
- Ca(OH)2 → $\\ce{Ca(OH)2}$
- MgSO4.7H2O → $\\ce{MgSO4.7H2O}$
- (g), (s), (l), (aq) as state symbols → $\\ce{(g)}$, $\\ce{(s)}$, $\\ce{(l)}$, $\\ce{(aq)}$
- NaCl(aq) → $\\ce{NaCl(aq)}$

### Electronic Configurations
- 1s2 2s2 2p6 → $1s^{2} 2s^{2} 2p^{6}$
- [Ar] 3d10 4s2 → $[Ar] 3d^{10} 4s^{2}$
- 1s²2s²2p⁶3s²3p⁶ → $1s^{2}2s^{2}2p^{6}3s^{2}3p^{6}$

### Scientific Notation
- 6.02 x 10^23 → $6.02 \\times 10^{23}$
- 1.5 × 10⁻⁹ → $1.5 \\times 10^{-9}$
- 0.2 × 10²⁴ → $0.2 \\times 10^{24}$

### Nuclear Notation
- 238U → $^{238}\\ce{U}$
- 234U → $^{234}\\ce{U}$

### Math Expressions
- Use ^ for superscripts: x^2 → $x^{2}$
- Use _ for subscripts: x_1 → $x_{1}$
- Fractions: 1/2 → $\\frac{1}{2}$
- Square roots: √x → $\\sqrt{x}$
- Integrals: ∫ → $\\int$
- Greek letters: alpha → $\\alpha$, beta → $\\beta$, theta → $\\theta$
- Arrows: → $\\rightarrow$, ← $\\leftarrow$
- Multiplication: × → $\\times$

### Units
- g/mol → $\\ce{g/mol}$ or $g/mol$
- cm^3 → $cm^{3}$
- J/mol·K → $J\\,mol^{-1}\\,K^{-1}$
- kJ → $kJ$

### Critical Rules
1. NEVER leave chemical formulas bare (like Cl2 or H2O) — always wrap in $\\ce{...}$ or at minimum $...$
2. NEVER use Unicode superscripts/subscripts (², ³, ₁, ₂, etc.) inside math mode — use LaTeX ^{...} and _{...}
3. All subscripts in chemical formulas must use _{digit}: H_{2}O, not H2O inside \\ce
4. All superscripts for charges must use ^{charge}: Fe^{2+}, Fe^{3+}
5. Fractions must use \\frac{numerator}{denominator}, not slash notation
6. Scientific notation must use \\times 10^{exponent}
7. Every $...$ or $$...$$ block must be valid KaTeX that would render without errors`;

function buildSystemPrompt(): string {
  return `You are a JUPEB exam expert and a LaTeX/KaTeX formatting specialist. You always output valid JSON only, no markdown, no code fences, no extra text. Your JSON is always parseable.`;

}

function buildQuestionPrompt(
  questionText: string,
  options: { label: string; text: string }[] | null,
  currentAnswer: string | null,
  currentTopic: string | null,
  category: string,
): string {
  const isObjective = category === "objective";
  const questionType = category === "theory" ? "Theory" : category === "practical" ? "Practical" : "Objective";

  let prompt = `Analyze this JUPEB ${questionType} question. Return ONLY valid JSON with these exact fields.

QUESTION:
${questionText}`;

  if (isObjective && options && options.length > 0) {
    prompt += `\n\nOPTIONS:\n${options.map(o => `${o.label}: ${o.text}`).join("\n")}`;
  }

  if (currentAnswer) {
    prompt += `\n\nSTATED ANSWER: ${currentAnswer}`;
  }

  if (currentTopic) {
    prompt += `\n\nSTATED TOPIC: ${currentTopic}`;
  }

  prompt += `\n\nDo ALL of the following tasks:

1. KATEX REVIEW — Check the ENTIRE question text for any KaTeX formatting flaws. This includes the question text itself and all options. Fix missing delimiters, wrong subscripts, bare chemical formulas, Unicode math characters that should be LaTeX, improperly formatted scientific notation, etc. Apply ALL the KaTeX rules below. Return the FULL corrected question text in katexFixed. If the text already has zero flaws, return null. Be thorough — do not miss anything.

2. OPTIONS FIX${isObjective ? ` — Apply the same KaTeX corrections to each option text. Return the corrected [{label, text}] array in optionsFixed. If all options already have correct KaTeX, return null.` : ` — null (theory/practical questions have no options)`}

3. CORRECT ANSWER${isObjective ? ` — Determine the correct option letter (A, B, C, D, E). If the STATED ANSWER is correct, return null. If wrong or missing, return the correct letter only.` : ` — null`}

4. TOPIC — Detect the JUPEB topic. Use format: subject-key (e.g., chm-atomic-structure, chm-chemical-bonding, chm-periodic-table, chm-thermochemistry, chm-kinetics, chm-equilibrium, chm-redox, chm-organic, chm-nuclear, chm-electrochemistry, chm-gas-laws; phy-mechanics, phy-waves, phy-optics, phy-thermodynamics, phy-electricity, phy-magnetism, phy-modern-physics; bio-cell-biology, bio-genetics, bio-ecology, bio-evolution, bio-physiology, bio-biochemistry). Return null if unsure.

5. EXPLANATION — Write 1-2 concise sentences explaining the correct answer for a JUPEB student. Include key reasoning. Keep it short.

${KATEX_PROMPT_SECTION}

IMPORTANT: Your response MUST be complete JSON ending with }. Do NOT truncate or cut off.
Keep all fields concise. The katexFixed field must contain the FULL corrected question text.

JSON FORMAT (exactly this, no extra fields):
{
  "katexFixed": "full corrected question text or null",
  "optionsFixed": ${isObjective ? "[{\"label\":\"A\",\"text\":\"...\"},{\"label\":\"B\",\"text\":\"...\"}] or null" : "null"},
  "correctAnswer": "${isObjective ? "letter or null" : "null"}",
  "topic": "e.g. chm-atomic-structure or null",
  "explanation": "1-2 sentence explanation"
}`;

  return prompt;
}

function fallbackResult(message: string): AIAnalysisResult {
  return {
    correctAnswer: null,
    topic: null,
    explanation: message,
    katexFixed: null,
    optionsFixed: null,
  };
}

async function retryFixKaTeX(brokenLaTeX: string, error: string): Promise<string> {
  const systemPrompt = buildSystemPrompt();
  const fixPrompt = `The following LaTeX block has a KaTeX rendering error:

ERROR: ${error}

BROKEN LATEX:
${brokenLaTeX}

Fix this LaTeX so it renders correctly in KaTeX. Return ONLY the corrected LaTeX text, nothing else — no JSON, no markdown, no explanation. Make sure the math delimiters are correct and all KaTeX syntax is valid.`;

  const result = await chatCompletion(systemPrompt, [{ role: "user", content: fixPrompt }]);
  return result.trim();
}

export async function analyzeQuestionWithAI(
  questionText: string,
  options: { label: string; text: string }[] | null,
  currentAnswer: string | null,
  currentTopic: string | null,
  category: string,
): Promise<AIAnalysisResult> {
  const isObjective = category === "objective";
  const systemPrompt = buildSystemPrompt();
  const prompt = buildQuestionPrompt(questionText, options, currentAnswer, currentTopic, category);

  let parsed: AIAnalysisResult;
  try {
    parsed = await chatCompletionJSON(systemPrompt, [{ role: "user", content: prompt }]) as AIAnalysisResult;
  } catch (err) {
    console.error("AI analyzer: failed to get JSON:", err);
    return fallbackResult("AI analysis failed. The response was not valid.");
  }

  if (category !== "objective") {
    parsed.correctAnswer = null;
    parsed.optionsFixed = null;
  } else if (isObjective && options && options.length > 0 && parsed.correctAnswer) {
    const validLabels = options.map(o => o.label);
    if (!validLabels.includes(parsed.correctAnswer.toUpperCase())) {
      parsed.correctAnswer = null;
    } else {
      parsed.correctAnswer = parsed.correctAnswer.toUpperCase();
    }
  }

  if (typeof parsed.katexFixed === "string" && /^\s*[{[]/.test(parsed.katexFixed)) {
    parsed.katexFixed = null;
  }
  if (typeof parsed.explanation === "string" && /^\s*[{[]/.test(parsed.explanation)) {
    parsed.explanation = "Unable to generate explanation from AI response.";
  }

  if (parsed.katexFixed) {
    const result = await validateAndFixKaTeX(parsed.katexFixed, 2, retryFixKaTeX);
    parsed.katexFixed = result.fixed;
    if (result.errors.length > 0) {
      parsed.katexErrors = result.errors.map(e => `${e.block}: ${e.error}`);
    }
  }

  if (parsed.optionsFixed && parsed.optionsFixed.length > 0) {
    for (let i = 0; i < parsed.optionsFixed.length; i++) {
      const optResult = await validateAndFixKaTeX(parsed.optionsFixed[i].text, 1, retryFixKaTeX);
      parsed.optionsFixed[i].text = optResult.fixed;
      if (optResult.errors.length > 0) {
        parsed.katexErrors = [...(parsed.katexErrors || []), ...optResult.errors.map(e => `Option ${parsed.optionsFixed![i].label}: ${e.block}: ${e.error}`)];
      }
    }
  }

  return parsed;
}
