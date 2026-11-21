import { parseJambSourceReference } from "./jamb-source-reference.ts";

Deno.test("JAMB source reference accepts one exact citation and canonicalizes it", () => {
  for (const [input, expected] of [
    ["2018:Q33", "2018:Q33"],
    ["(2018:Q33)", "2018:Q33"],
    ["[2018:Q33]", "2018:Q33"],
    [" 2018 : q 33 ", "2018:Q33"],
  ] as const) {
    const parsed = parseJambSourceReference(input);
    if (!parsed || parsed.canonical !== expected || parsed.year !== 2018 || parsed.questionNumber !== "33") {
      throw new Error("Expected a valid canonical source reference.");
    }
  }
});

Deno.test("JAMB source reference rejects absent, ambiguous or malformed question identifiers", () => {
  for (const input of [null, "", "2018:Q", "2018:Q?33", "2018:Q0", "2018:Q33; 2019:Q4", "(2018:Q33]", "source reference 2018:Q33"]) {
    if (parseJambSourceReference(input) !== null) {
      throw new Error("Invalid or ambiguous source reference was accepted.");
    }
  }
});