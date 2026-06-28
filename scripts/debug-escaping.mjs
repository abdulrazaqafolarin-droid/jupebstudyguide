import { readFileSync } from 'fs';

// Test various escaping patterns
const s1 = String.raw`$\ce{H3C}$`;
console.log("s1:", JSON.stringify(s1), "backslashes:", (s1.match(/\\/g)||[]).length);
console.log("s1 chars:", [...s1].map(c => c + '(' + c.charCodeAt(0) + ')').join(' '));

const s2 = String.raw`$\ce{$\ce{H3C}$}$`;
console.log("s2:", JSON.stringify(s2), "backslashes:", (s2.match(/\\/g)||[]).length);

// The regex we need
const regex = /\\ce\{\$\\ce\{([^}]*)\}\$\}/;
console.log("Regex:", regex);

// Test on various strings
const tests = [
  String.raw`$\ce{H3C}$`,
  String.raw`$\ce{$\ce{H3C}$}$`,
  "abc\\def",
  "abc\\ce{test}def",
  "abc$\\ce{test}$def",
];

for (const t of tests) {
  const m = t.match(regex);
  console.log("Test:", JSON.stringify(t), "→", m ? JSON.stringify(m[0]) : "no match");
}

// Now test text from actual DB
const apiResponse = {
  "id": "che-2016-obj-0009",
  "question": "The IUPAC name of the compound C$\\ce{$\\ce{H3C}$}$$\\ce{$\\ce{H2C}$}$$\\ce{$\\ce{H2N}$}$(CH\u00e2\u201a\u0192)\u00e2\u201a\u201a is:"
};

const text = apiResponse.question;
console.log("\nAPI question:", JSON.stringify(text));
console.log("Backslashes in API question:", (text.match(/\\/g)||[]).length);

const m2 = text.match(regex);
console.log("Regex match:", m2 ? JSON.stringify(m2[0]) : "no match");
