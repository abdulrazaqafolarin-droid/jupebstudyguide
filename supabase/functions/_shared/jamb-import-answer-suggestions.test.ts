import { extractJambSourceAnswerSuggestions } from "./jamb-import-answer-suggestions.ts";

Deno.test("source answer suggestions are preserved without becoming verified answer keys", () => {
  const result = extractJambSourceAnswerSuggestions({
    correct_answer: " b ",
    explanation: "The passage supports option B because it restates the stated reason.",
    answer_key_verified: false,
  });
  if (result.source_answer_candidate !== "B") {
    throw new Error("Expected the source answer candidate to be normalized.");
  }
  if (result.source_explanation_candidate !== "The passage supports option B because it restates the stated reason.") {
    throw new Error("Expected the source explanation to be preserved.");
  }
  if ("correct_answer" in result || "answer_key_verified" in result) {
    throw new Error("Source suggestions must not become verified answer-key fields.");
  }
});

Deno.test("invalid source answers and empty explanations are not surfaced as suggestions", () => {
  const result = extractJambSourceAnswerSuggestions({
    correct_answer: "F",
    explanation: "   ",
  });
  if (result.source_answer_candidate !== null || result.source_explanation_candidate !== null) {
    throw new Error("Invalid or empty source suggestions must be discarded.");
  }
});

Deno.test("missing source answer material remains null", () => {
  const result = extractJambSourceAnswerSuggestions({});
  if (result.source_answer_candidate !== null || result.source_explanation_candidate !== null) {
    throw new Error("Missing source material must remain null.");
  }
});
