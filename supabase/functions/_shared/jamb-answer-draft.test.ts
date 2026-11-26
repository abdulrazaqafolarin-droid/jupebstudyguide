import { getJambAnswerDraftError } from "./jamb-answer-draft.ts";

const options = [
  { label: "A", text: "First option" },
  { label: "B", text: "Second option" },
  { label: "C", text: "Third option" },
  { label: "D", text: "Fourth option" },
];

const valid = {
  correctAnswer: "B",
  explanation: "The explanation is clear and sufficiently detailed.",
  confidenceLevel: "high",
  confidenceNote: "The calculation and options were checked.",
  evidenceReference: "Physics.txt, 2012:Q15; k = F/x",
  options,
};

Deno.test("JAMB answer draft accepts a supported answer with a confidence record", () => {
  if (getJambAnswerDraftError(valid) !== null) {
    throw new Error("A complete, option-matching answer draft should pass validation.");
  }
});

Deno.test("JAMB answer draft rejects an answer that is not one of the saved options", () => {
  const error = getJambAnswerDraftError({ ...valid, correctAnswer: "E" });
  if (!error || !error.includes("saved option")) {
    throw new Error("An answer label absent from the question options must be rejected.");
  }
});

Deno.test("JAMB answer draft requires a meaningful explanation and confidence note", () => {
  if (!getJambAnswerDraftError({ ...valid, explanation: "Too short" })) {
    throw new Error("A short explanation must be rejected.");
  }
  if (!getJambAnswerDraftError({ ...valid, confidenceNote: "uncertain" })) {
    throw new Error("A short confidence note must be rejected.");
  }
});

Deno.test("JAMB answer draft does not accept an unrated confidence record", () => {
  if (!getJambAnswerDraftError({ ...valid, confidenceLevel: "unrated" })) {
    throw new Error("A saved draft must have an explicit confidence rating.");
  }
});

Deno.test("JAMB answer draft requires a complete ordered option set", () => {
  if (!getJambAnswerDraftError({ ...valid, options: options.slice(1) })) {
    throw new Error("A missing option must be rejected.");
  }
});

Deno.test("JAMB answer draft limits evidence references", () => {
  if (!getJambAnswerDraftError({ ...valid, evidenceReference: "x".repeat(2001) })) {
    throw new Error("An oversized evidence reference must be rejected.");
  }
});
