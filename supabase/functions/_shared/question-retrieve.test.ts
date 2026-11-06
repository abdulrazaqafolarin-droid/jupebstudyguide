import {
  buildQuestionRAGContext,
  buildQuestionRetrievalQuery,
  getRequestedQuestionCount,
  formatQuestionForEmbedding,
  mergeQuestionMatches,
  type RetrievedQuestion,
} from "./question-retrieve.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function question(id: string, similarity: number, overrides: Partial<RetrievedQuestion> = {}): RetrievedQuestion {
  return {
    question_id: id,
    subject: "physics",
    year: 2021,
    category: "objective",
    question: `Question ${id}`,
    options: [{ label: "A", text: "First option" }, { label: "B", text: "Second option" }],
    correct_answer: "A",
    explanation: "A short explanation.",
    similarity,
    ...overrides,
  };
}

Deno.test("explicit current-question retrieval context takes precedence", () => {
  const result = buildQuestionRetrievalQuery(
    "Physics 2020 Hooke's law; calculate the energy stored in the spring.",
    [{ role: "user", content: "Explain it." }],
  );
  assert(result.includes("Hooke's law"), "The full current question context must be retained.");
  assert(!result.includes("Previous study question"), "Explicit context must not be rewritten as a follow-up.");
});

Deno.test("short follow-ups retain the previous question or topic", () => {
  const result = buildQuestionRetrievalQuery(undefined, [
    { role: "user", content: "A 2 kg body accelerates at 4 m/s squared. Find the resultant force." },
    { role: "assistant", content: "Use Newton's second law." },
    { role: "user", content: "Why?" },
  ]);
  assert(result.includes("resultant force"), "The previous user question must anchor a short follow-up.");
  assert(result.includes("Student follow-up: Why?"), "The latest follow-up must be preserved.");
});

Deno.test("question document text indexes the metadata and useful answer context", () => {
  const text = formatQuestionForEmbedding({
    id: "chem-2024-theory-009",
    subject: "chemistry",
    year: 2024,
    category: "theory",
    question: "Explain periodic trends.",
    options: [{ label: "A", text: "Atomic radius" }],
    correct_answer: "A",
    explanation: "Nuclear charge changes across a period.",
    course: "Periodic table",
    difficulty: "medium",
    image_url: "https://example.com/diagram.png",
  });
  assert(text.includes("chem-2024-theory-009"), "Question IDs must be searchable.");
  assert(text.includes("chemistry"), "Subject metadata must be searchable.");
  assert(text.includes("2024"), "Exam year must be searchable.");
  assert(text.includes("Periodic table"), "Topic must be searchable.");
  assert(text.includes("Atomic radius"), "Options must be searchable.");
  assert(text.includes("Nuclear charge"), "Explanation must be searchable.");
  assert(text.includes("accompanying question image"), "Image-backed question metadata must be indexed.");
});

Deno.test("hybrid RRF merges duplicate question IDs and keeps distinct candidates", () => {
  const vector = [
    question("q1", 0.91),
    question("q2", 0.87),
    question("q3", 0.79),
  ];
  const lexical = [
    question("q2", 0.66, { question: "Exact wording hit for q2" }),
    question("q4", 0.55),
    question("q1", 0.52),
  ];
  const merged = mergeQuestionMatches(vector, lexical, 4);
  assert(merged.length === 4, "The merged result should contain four unique questions.");
  assert(new Set(merged.map((row) => row.question_id)).size === 4, "Question IDs must be de-duplicated.");
  assert(merged[0].question_id === "q1" || merged[0].question_id === "q2", "A high-ranked result from either source should rank first.");
  assert(merged.some((row) => row.question_id === "q4"), "A lexical-only question should not be discarded.");
});

Deno.test("question RAG context carries precise year, subject, category and citation IDs", () => {
  const q = question("chem-2022-004", 0.89, {
    subject: "chemistry",
    year: 2022,
    category: "theory",
    question: "Explain the effect of temperature on reaction rate.",
  });
  const context = buildQuestionRAGContext([q]);
  assert(context.references[0].question_id === q.question_id, "Citation must point to the exact database row.");
  assert(context.promptBlock.includes("2022 chemistry (theory)"), "Citation context must preserve metadata.");
  assert(context.promptBlock.includes("[Q1]"), "The prompt must include the stable reference label.");
  assert(context.promptBlock.includes("without fabricating a source"), "The model must be told not to invent retrieved questions.");
});

Deno.test("requested question sets expand retrieval within the safe context cap", () => {
  assert(getRequestedQuestionCount("Give me 10 Physics past questions from 2021") === 10, "Explicit question counts should be respected.");
  assert(getRequestedQuestionCount("Show me all the objective questions in the 2020 Chemistry bank") === 12, "Broad all-question requests should retrieve the maximum supported context batch.");
  assert(getRequestedQuestionCount("Explain Newton's second law") === 6, "Normal tutoring turns should retain the smaller default retrieval.");
  assert(getRequestedQuestionCount("Give me 99 questions") === 12, "Question context must remain capped.");
});
