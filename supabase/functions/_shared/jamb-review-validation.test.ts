import { getJambReviewDecisionError } from "./jamb-review-validation.ts";

Deno.test("JAMB rejects ungraded approval", () => {
  const error = getJambReviewDecisionError("approved_ungraded", "");
  if (!error || !error.includes("cannot be approved")) {
    throw new Error("JAMB import items must not enter an ungraded approval state.");
  }
});

Deno.test("JAMB approval requires at least twelve meaningful explanation characters", () => {
  if (!getJambReviewDecisionError("approved", "Too short")) {
    throw new Error("A short explanation must not pass JAMB approval.");
  }
  if (!getJambReviewDecisionError("approved", "            ")) {
    throw new Error("Whitespace must not count as a JAMB explanation.");
  }
  if (getJambReviewDecisionError("approved", "This explanation is sufficiently detailed.")) {
    throw new Error("A meaningful explanation should pass the JAMB explanation-length guard.");
  }
});

Deno.test("JAMB rejection does not require an answer explanation", () => {
  if (getJambReviewDecisionError("rejected", "")) {
    throw new Error("Rejecting an item must not require an answer explanation.");
  }
});
