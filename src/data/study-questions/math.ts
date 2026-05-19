import type { StudyQuestion } from "@/types/study-questions";

const questions: StudyQuestion[] = [
  // ============================================================
  // 2014
  // ============================================================
  {
    id: "math-2014-obj-1",
    subject: "math",
    year: 2014,
    category: "objective",
    topic: "Algebra",
    question: "If log10 2 = 0.3010 and log10 3 = 0.4771, find log10 72.",
    options: [
      { label: "A", text: "1.8573" },
      { label: "B", text: "1.6532" },
      { label: "C", text: "1.5563" },
      { label: "D", text: "1.2780" },
    ],
    correctAnswer: "A",
    explanation:
      "72 = 2^3 * 3^2. So log10 72 = 3(log10 2) + 2(log10 3) = 3(0.3010) + 2(0.4771) = 0.9030 + 0.9542 = 1.8572 \u2248 1.8573.",
    difficulty: "medium",
  },
  {
    id: "math-2014-obj-2",
    subject: "math",
    year: 2014,
    category: "objective",
    topic: "Calculus",
    question:
      "Find the derivative of f(x) = 3x^4 - 5x^3 + 2x - 7 with respect to x.",
    options: [
      { label: "A", text: "12x^3 - 15x^2 + 2" },
      { label: "B", text: "12x^3 - 15x^2 - 2" },
      { label: "C", text: "12x^3 + 15x^2 + 2" },
      { label: "D", text: "7x^3 - 8x^2 + 2" },
    ],
    correctAnswer: "A",
    explanation:
      "Using power rule: d/dx(3x^4) = 12x^3, d/dx(-5x^3) = -15x^2, d/dx(2x) = 2, d/dx(-7) = 0. Hence f'(x) = 12x^3 - 15x^2 + 2.",
    difficulty: "easy",
  },
  {
    id: "math-2014-obj-3",
    subject: "math",
    year: 2014,
    category: "objective",
    topic: "Trigonometry",
    question:
      "If sin \u03b8 = 3/5 and \u03b8 is acute, find tan \u03b8.",
    options: [
      { label: "A", text: "3/4" },
      { label: "B", text: "4/3" },
      { label: "C", text: "4/5" },
      { label: "D", text: "5/3" },
    ],
    correctAnswer: "A",
    explanation:
      "Using sin^2 \u03b8 + cos^2 \u03b8 = 1: cos \u03b8 = \u221a(1 - 9/25) = \u221a(16/25) = 4/5. Then tan \u03b8 = sin \u03b8 / cos \u03b8 = (3/5) / (4/5) = 3/4.",
    difficulty: "easy",
  },
  {
    id: "math-2014-theory-1",
    subject: "math",
    year: 2014,
    category: "theory",
    topic: "Vectors",
    question:
      "Given vectors a = 2i - 3j + k, b = i + 2j - 2k, and c = 3i - j + 4k. Find (a \u00d7 b) \u00b7 c.",
    answerGuide:
      "Compute cross product a \u00d7 b = |i j k; 2 -3 1; 1 2 -2| = i((-3)(-2) - (1)(2)) - j((2)(-2) - (1)(1)) + k((2)(2) - (-3)(1)) = i(6 - 2) - j(-4 - 1) + k(4 + 3) = 4i + 5j + 7k. Then dot with c: (4)(3) + (5)(-1) + (7)(4) = 12 - 5 + 28 = 35.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct determinant setup for cross product", marks: 3 },
      { point: "Correct computation of a \u00d7 b", marks: 3 },
      { point: "Correct dot product with c", marks: 2 },
      { point: "Final answer (35)", marks: 2 },
    ],
    difficulty: "medium",
  },
  {
    id: "math-2014-theory-2",
    subject: "math",
    year: 2014,
    category: "theory",
    topic: "Statistics & Probability",
    question:
      "The marks of 10 students in a test are: 12, 15, 20, 10, 18, 14, 16, 22, 9, 24. Calculate the mean, median, and standard deviation of the marks.",
    answerGuide:
      "Mean = (12+15+20+10+18+14+16+22+9+24)/10 = 160/10 = 16. Sorted: 9,10,12,14,15,16,18,20,22,24. Median = (15+16)/2 = 15.5. Variance: \u03a3(x-\u03bc)^2 = (9-16)^2+(10-16)^2+(12-16)^2+(14-16)^2+(15-16)^2+(16-16)^2+(18-16)^2+(20-16)^2+(22-16)^2+(24-16)^2 = 49+36+16+4+1+0+4+16+36+64 = 226. s^2 = 226/10 = 22.6. s \u2248 4.75.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct sum and mean", marks: 2 },
      { point: "Correct median (ordered list + value)", marks: 2 },
      { point: "Correct squared deviations", marks: 3 },
      { point: "Correct variance", marks: 2 },
      { point: "Correct standard deviation", marks: 1 },
    ],
    difficulty: "medium",
  },

  // ============================================================
  // 2015
  // ============================================================
  {
    id: "math-2015-obj-1",
    subject: "math",
    year: 2015,
    category: "objective",
    topic: "Sets",
    question:
      "If A = {1, 2, 3, 4, 5}, B = {3, 4, 5, 6, 7}, and C = {5, 6, 7, 8, 9}, find n(A \u2229 B \u2229 C).",
    options: [
      { label: "A", text: "1" },
      { label: "B", text: "2" },
      { label: "C", text: "3" },
      { label: "D", text: "5" },
    ],
    correctAnswer: "A",
    explanation:
      "A \u2229 B \u2229 C = {5}, since 5 is the only element common to all three sets. Hence n = 1.",
    difficulty: "easy",
  },
  {
    id: "math-2015-obj-2",
    subject: "math",
    year: 2015,
    category: "objective",
    topic: "Coordinate Geometry",
    question:
      "Find the distance between the points P(3, -2) and Q(-1, 4).",
    options: [
      { label: "A", text: "2\u221a13" },
      { label: "B", text: "\u221a13" },
      { label: "C", text: "2\u221a10" },
      { label: "D", text: "\u221a52" },
    ],
    correctAnswer: "A",
    explanation:
      "Distance = \u221a((-1-3)^2 + (4-(-2))^2) = \u221a((-4)^2 + 6^2) = \u221a(16 + 36) = \u221a52 = 2\u221a13.",
    difficulty: "easy",
  },
  {
    id: "math-2015-obj-3",
    subject: "math",
    year: 2015,
    category: "objective",
    topic: "Matrices",
    question:
      "If A = [[2, 1], [3, -1]], find |A|, the determinant of A.",
    options: [
      { label: "A", text: "-5" },
      { label: "B", text: "5" },
      { label: "C", text: "1" },
      { label: "D", text: "-1" },
    ],
    correctAnswer: "A",
    explanation:
      "det(A) = (2)(-1) - (1)(3) = -2 - 3 = -5.",
    difficulty: "easy",
  },
  {
    id: "math-2015-theory-1",
    subject: "math",
    year: 2015,
    category: "theory",
    topic: "Algebra",
    question:
      "Solve the equation 2^(2x+1) - 5(2^x) + 2 = 0.",
    answerGuide:
      "Let y = 2^x. Then 2^(2x+1) = 2 * 2^(2x) = 2y^2. Equation becomes 2y^2 - 5y + 2 = 0. Factor: (2y - 1)(y - 2) = 0. Hence y = 1/2 or y = 2. So 2^x = 1/2 = 2^(-1) gives x = -1. And 2^x = 2 = 2^1 gives x = 1. Solutions: x = -1 or x = 1.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct substitution y = 2^x", marks: 2 },
      { point: "Correct equation in y", marks: 2 },
      { point: "Correct factorization", marks: 2 },
      { point: "Solving for y", marks: 2 },
      { point: "Correct x values", marks: 2 },
    ],
    difficulty: "medium",
  },
  {
    id: "math-2015-theory-2",
    subject: "math",
    year: 2015,
    category: "theory",
    topic: "Calculus",
    question:
      "Evaluate \u222b_0^1 (3x^2 + 2x - 1) dx.",
    answerGuide:
      "Antiderivative: \u222b(3x^2 + 2x - 1)dx = x^3 + x^2 - x + C. Evaluate from 0 to 1: [1^3 + 1^2 - 1] - [0^3 + 0^2 - 0] = 1 + 1 - 1 = 1.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct antiderivative of each term", marks: 4 },
      { point: "Evaluates upper limit correctly", marks: 2 },
      { point: "Evaluates lower limit correctly", marks: 2 },
      { point: "Final answer = 1", marks: 2 },
    ],
    difficulty: "easy",
  },

  // ============================================================
  // 2016
  // ============================================================
  {
    id: "math-2016-obj-1",
    subject: "math",
    year: 2016,
    category: "objective",
    topic: "Sequences & Series",
    question:
      "The 5th term of an arithmetic progression is 17 and the 9th term is 29. Find the common difference.",
    options: [
      { label: "A", text: "3" },
      { label: "B", text: "4" },
      { label: "C", text: "2" },
      { label: "D", text: "5" },
    ],
    correctAnswer: "A",
    explanation:
      "T_n = a + (n-1)d. T_5 = a + 4d = 17. T_9 = a + 8d = 29. Subtract: 4d = 12, so d = 3.",
    difficulty: "easy",
  },
  {
    id: "math-2016-obj-2",
    subject: "math",
    year: 2016,
    category: "objective",
    topic: "Vectors",
    question:
      "Given that p = 2i + 3j and q = 4i - j, find the scalar product p \u00b7 q.",
    options: [
      { label: "A", text: "5" },
      { label: "B", text: "8" },
      { label: "C", text: "3" },
      { label: "D", text: "11" },
    ],
    correctAnswer: "A",
    explanation:
      "p \u00b7 q = (2)(4) + (3)(-1) = 8 - 3 = 5.",
    difficulty: "easy",
  },
  {
    id: "math-2016-obj-3",
    subject: "math",
    year: 2016,
    category: "objective",
    topic: "Trigonometry",
    question:
      "Simplify cos^2 \u03b8 - sin^2 \u03b8.",
    options: [
      { label: "A", text: "cos 2\u03b8" },
      { label: "B", text: "sin 2\u03b8" },
      { label: "C", text: "1" },
      { label: "D", text: "cos \u03b8" },
    ],
    correctAnswer: "A",
    explanation:
      "cos^2 \u03b8 - sin^2 \u03b8 = cos(2\u03b8) by the double-angle formula.",
    difficulty: "easy",
  },
  {
    id: "math-2016-theory-1",
    subject: "math",
    year: 2016,
    category: "theory",
    topic: "Matrices",
    question:
      "Given the matrix A = [[1, 2], [3, 4]], find A^(-1) and verify that AA^(-1) = I.",
    answerGuide:
      "det(A) = 1(4) - 2(3) = 4 - 6 = -2. A^(-1) = (1/det) [[4, -2], [-3, 1]] = [[-2, 1], [1.5, -0.5]]. Verification: AA^(-1) = [[1,2],[3,4]][[-2,1],[1.5,-0.5]] = [[1(-2)+2(1.5), 1(1)+2(-0.5)], [3(-2)+4(1.5), 3(1)+4(-0.5)]] = [[-2+3, 1-1], [-6+6, 3-2]] = [[1,0],[0,1]] = I.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct determinant", marks: 2 },
      { point: "Correct adjugate matrix", marks: 2 },
      { point: "Correct inverse matrix", marks: 2 },
      { point: "Correct matrix multiplication setup", marks: 2 },
      { point: "Verification yields identity", marks: 2 },
    ],
    difficulty: "medium",
  },
  {
    id: "math-2016-theory-2",
    subject: "math",
    year: 2016,
    category: "theory",
    topic: "Statistics & Probability",
    question:
      "A bag contains 4 red, 5 blue, and 3 green marbles. Two marbles are drawn at random without replacement. Find the probability that both are of the same colour.",
    answerGuide:
      "Total marbles = 12. P(both red) = (4/12)(3/11) = 12/132. P(both blue) = (5/12)(4/11) = 20/132. P(both green) = (3/12)(2/11) = 6/132. P(same colour) = (12+20+6)/132 = 38/132 = 19/66.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct total marbles", marks: 1 },
      { point: "P(both red) correctly computed", marks: 3 },
      { point: "P(both blue) correctly computed", marks: 2 },
      { point: "P(both green) correctly computed", marks: 2 },
      { point: "Sum and simplification = 19/66", marks: 2 },
    ],
    difficulty: "medium",
  },

  // ============================================================
  // 2017
  // ============================================================
  {
    id: "math-2017-obj-1",
    subject: "math",
    year: 2017,
    category: "objective",
    topic: "Complex Numbers",
    question:
      "Simplify (3 + 2i) - (1 - 4i).",
    options: [
      { label: "A", text: "2 + 6i" },
      { label: "B", text: "4 - 2i" },
      { label: "C", text: "4 + 6i" },
      { label: "D", text: "2 - 2i" },
    ],
    correctAnswer: "A",
    explanation:
      "(3 + 2i) - (1 - 4i) = 3 + 2i - 1 + 4i = (3-1) + (2+4)i = 2 + 6i.",
    difficulty: "easy",
  },
  {
    id: "math-2017-obj-2",
    subject: "math",
    year: 2017,
    category: "objective",
    topic: "Calculus",
    question:
      "Evaluate lim_(x\u21922) (x^2 - 4)/(x - 2).",
    options: [
      { label: "A", text: "4" },
      { label: "B", text: "0" },
      { label: "C", text: "2" },
      { label: "D", text: "\u221e" },
    ],
    correctAnswer: "A",
    explanation:
      "Factor numerator: x^2 - 4 = (x-2)(x+2). Cancel (x-2): limit = lim_(x\u21922) (x+2) = 2 + 2 = 4.",
    difficulty: "medium",
  },
  {
    id: "math-2017-obj-3",
    subject: "math",
    year: 2017,
    category: "objective",
    topic: "Coordinate Geometry",
    question:
      "Find the gradient of the line passing through (2, -1) and (5, 3).",
    options: [
      { label: "A", text: "4/3" },
      { label: "B", text: "3/4" },
      { label: "C", text: "-4/3" },
      { label: "D", text: "2/3" },
    ],
    correctAnswer: "A",
    explanation:
      "Gradient m = (y2 - y1)/(x2 - x1) = (3 - (-1))/(5 - 2) = 4/3.",
    difficulty: "easy",
  },
  {
    id: "math-2017-theory-1",
    subject: "math",
    year: 2017,
    category: "theory",
    topic: "Calculus",
    question:
      "Find the equation of the tangent to the curve y = x^3 - 2x^2 + 1 at the point where x = 1.",
    answerGuide:
      "At x = 1: y = 1^3 - 2(1)^2 + 1 = 0. Point is (1,0). Differentiate: dy/dx = 3x^2 - 4x. At x = 1: slope = 3(1)^2 - 4(1) = -1. Tangent equation: y - 0 = -1(x - 1) => y = -x + 1.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct y-coordinate at x=1", marks: 2 },
      { point: "Correct derivative", marks: 3 },
      { point: "Correct slope at x=1", marks: 2 },
      { point: "Correct tangent equation", marks: 3 },
    ],
    difficulty: "medium",
  },
  {
    id: "math-2017-theory-2",
    subject: "math",
    year: 2017,
    category: "theory",
    topic: "Trigonometry",
    question:
      "Prove that (1 - cos 2\u03b8)/sin 2\u03b8 = tan \u03b8.",
    answerGuide:
      "LHS = (1 - cos 2\u03b8)/sin 2\u03b8. Use identities: cos 2\u03b8 = 1 - 2 sin^2 \u03b8 and sin 2\u03b8 = 2 sin \u03b8 cos \u03b8. Then 1 - cos 2\u03b8 = 1 - (1 - 2 sin^2 \u03b8) = 2 sin^2 \u03b8. So LHS = (2 sin^2 \u03b8)/(2 sin \u03b8 cos \u03b8) = sin \u03b8/cos \u03b8 = tan \u03b8 = RHS.",
    totalMarks: 10,
    markScheme: [
      { point: "Uses correct double-angle identities", marks: 3 },
      { point: "Simplifies numerator correctly", marks: 3 },
      { point: "Cancels common factors", marks: 2 },
      { point: "Arrives at tan \u03b8", marks: 2 },
    ],
    difficulty: "medium",
  },

  // ============================================================
  // 2018
  // ============================================================
  {
    id: "math-2018-obj-1",
    subject: "math",
    year: 2018,
    category: "objective",
    topic: "Algebra",
    question:
      "Solve for x: 3^(2x) = 81.",
    options: [
      { label: "A", text: "2" },
      { label: "B", text: "3" },
      { label: "C", text: "4" },
      { label: "D", text: "1" },
    ],
    correctAnswer: "A",
    explanation:
      "81 = 3^4. So 3^(2x) = 3^4 implies 2x = 4, hence x = 2.",
    difficulty: "easy",
  },
  {
    id: "math-2018-obj-2",
    subject: "math",
    year: 2018,
    category: "objective",
    topic: "Statistics & Probability",
    question:
      "What is the probability of getting a sum of 7 when two fair dice are rolled?",
    options: [
      { label: "A", text: "1/6" },
      { label: "B", text: "1/12" },
      { label: "C", text: "1/36" },
      { label: "D", text: "5/36" },
    ],
    correctAnswer: "A",
    explanation:
      "Favourable outcomes: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) = 6 outcomes. Total outcomes = 36. P = 6/36 = 1/6.",
    difficulty: "easy",
  },
  {
    id: "math-2018-obj-3",
    subject: "math",
    year: 2018,
    category: "objective",
    topic: "Matrices",
    question:
      "If A = [[3, 1], [0, 2]] and B = [[1, 0], [-1, 4]], find A + B.",
    options: [
      { label: "A", text: "[[4, 1], [-1, 6]]" },
      { label: "B", text: "[[4, 1], [1, 6]]" },
      { label: "C", text: "[[2, 1], [-1, -2]]" },
      { label: "D", text: "[[3, 0], [0, 8]]" },
    ],
    correctAnswer: "A",
    explanation:
      "A + B = [[3+1, 1+0], [0+(-1), 2+4]] = [[4, 1], [-1, 6]].",
    difficulty: "easy",
  },
  {
    id: "math-2018-theory-1",
    subject: "math",
    year: 2018,
    category: "theory",
    topic: "Vectors",
    question:
      "Find the angle between the vectors u = i - 2j + 2k and v = 2i + j - k.",
    answerGuide:
      "u \u00b7 v = (1)(2) + (-2)(1) + (2)(-1) = 2 - 2 - 2 = -2. |u| = \u221a(1^2 + (-2)^2 + 2^2) = \u221a(1+4+4) = \u221a9 = 3. |v| = \u221a(2^2+1^2+(-1)^2) = \u221a(4+1+1) = \u221a6. cos \u03b8 = (u\u00b7v)/(|u||v|) = -2/(3\u221a6) = -\u221a6/9. \u03b8 = cos^(-1)(-\u221a6/9) \u2248 106.1\u00b0.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct dot product", marks: 2 },
      { point: "Correct magnitude of u", marks: 2 },
      { point: "Correct magnitude of v", marks: 2 },
      { point: "Correct cosine formula", marks: 2 },
      { point: "Correct angle value", marks: 2 },
    ],
    difficulty: "medium",
  },
  {
    id: "math-2018-theory-2",
    subject: "math",
    year: 2018,
    category: "theory",
    topic: "Calculus",
    question:
      "Find \u222b x sin(x) dx.",
    answerGuide:
      "Use integration by parts: \u222b u dv = uv - \u222b v du. Let u = x, dv = sin x dx. Then du = dx, v = -cos x. \u222b x sin x dx = -x cos x - \u222b (-cos x) dx = -x cos x + \u222b cos x dx = -x cos x + sin x + C.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct choice of u and dv", marks: 2 },
      { point: "Correct du and v", marks: 2 },
      { point: "Applies integration by parts formula correctly", marks: 3 },
      { point: "Final answer: -x cos x + sin x + C", marks: 3 },
    ],
    difficulty: "hard",
  },

  // ============================================================
  // 2019
  // ============================================================
  {
    id: "math-2019-obj-1",
    subject: "math",
    year: 2019,
    category: "objective",
    topic: "Sets",
    question:
      "In a class of 40 students, 25 study Physics, 18 study Chemistry, and 10 study both. How many study neither?",
    options: [
      { label: "A", text: "7" },
      { label: "B", text: "3" },
      { label: "C", text: "5" },
      { label: "D", text: "10" },
    ],
    correctAnswer: "A",
    explanation:
      "n(P \u222a C) = n(P) + n(C) - n(P \u2229 C) = 25 + 18 - 10 = 33. Neither = 40 - 33 = 7.",
    difficulty: "medium",
  },
  {
    id: "math-2019-obj-2",
    subject: "math",
    year: 2019,
    category: "objective",
    topic: "Sequences & Series",
    question:
      "Find the sum of the first 10 terms of the geometric series 2 + 6 + 18 + 54 + ...",
    options: [
      { label: "A", text: "59048" },
      { label: "B", text: "19682" },
      { label: "C", text: "29524" },
      { label: "D", text: "88572" },
    ],
    correctAnswer: "A",
    explanation:
      "a = 2, r = 3, n = 10. S_n = a(r^n - 1)/(r - 1) = 2(3^10 - 1)/(3 - 1) = 2(59049 - 1)/2 = 59048.",
    difficulty: "medium",
  },
  {
    id: "math-2019-obj-3",
    subject: "math",
    year: 2019,
    category: "objective",
    topic: "Complex Numbers",
    question:
      "Find the modulus of z = 3 - 4i.",
    options: [
      { label: "A", text: "5" },
      { label: "B", text: "7" },
      { label: "C", text: "25" },
      { label: "D", text: "1" },
    ],
    correctAnswer: "A",
    explanation:
      "|z| = \u221a(3^2 + (-4)^2) = \u221a(9 + 16) = \u221a25 = 5.",
    difficulty: "easy",
  },
  {
    id: "math-2019-theory-1",
    subject: "math",
    year: 2019,
    category: "theory",
    topic: "Algebra",
    question:
      "Express (2x + 3)/((x - 1)(x + 2)) in partial fractions.",
    answerGuide:
      "Let (2x+3)/((x-1)(x+2)) = A/(x-1) + B/(x+2). Multiply: 2x+3 = A(x+2) + B(x-1). Compare coefficients: A + B = 2 and 2A - B = 3. Solving: from 1st, B = 2 - A. Substitute: 2A - (2-A) = 3 => 2A - 2 + A = 3 => 3A = 5 => A = 5/3. Then B = 2 - 5/3 = 1/3. Hence (2x+3)/((x-1)(x+2)) = 5/(3(x-1)) + 1/(3(x+2)).",
    totalMarks: 10,
    markScheme: [
      { point: "Correct partial fraction form", marks: 2 },
      { point: "Clears denominators correctly", marks: 2 },
      { point: "Forms correct simultaneous equations", marks: 2 },
      { point: "Solves for A and B", marks: 2 },
      { point: "Final partial fractions", marks: 2 },
    ],
    difficulty: "medium",
  },
  {
    id: "math-2019-theory-2",
    subject: "math",
    year: 2019,
    category: "theory",
    topic: "Coordinate Geometry",
    question:
      "Find the equation of the circle with centre (2, -3) and radius 5.",
    answerGuide:
      "General form: (x - h)^2 + (y - k)^2 = r^2. Here h = 2, k = -3, r = 5. Equation: (x - 2)^2 + (y + 3)^2 = 25. Expanding: x^2 - 4x + 4 + y^2 + 6y + 9 = 25 => x^2 + y^2 - 4x + 6y - 12 = 0.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct centre-radius form", marks: 2 },
      { point: "Correct substitution", marks: 2 },
      { point: "Correct equation in centre-radius form", marks: 2 },
      { point: "Correct expansion", marks: 2 },
      { point: "Correct general form", marks: 2 },
    ],
    difficulty: "easy",
  },

  // ============================================================
  // 2020
  // ============================================================
  {
    id: "math-2020-obj-1",
    subject: "math",
    year: 2020,
    category: "objective",
    topic: "Trigonometry",
    question:
      "If tan \u03b8 = \u221a3 and 0\u00b0 \u2264 \u03b8 \u2264 180\u00b0, find \u03b8.",
    options: [
      { label: "A", text: "60\u00b0 and 120\u00b0" },
      { label: "B", text: "60\u00b0 and 240\u00b0" },
      { label: "C", text: "60\u00b0 only" },
      { label: "D", text: "30\u00b0 and 210\u00b0" },
    ],
    correctAnswer: "C",
    explanation:
      "tan 60\u00b0 = \u221a3. Within 0\u00b0 to 180\u00b0, the tangent function is positive only in Q1 (0-90\u00b0). Therefore \u03b8 = 60\u00b0 is the only solution.",
    difficulty: "medium",
  },
  {
    id: "math-2020-obj-2",
    subject: "math",
    year: 2020,
    category: "objective",
    topic: "Calculus",
    question:
      "Find \u222b (6x^5 - 4x^3 + 2x) dx.",
    options: [
      { label: "A", text: "x^6 - x^4 + x^2 + C" },
      { label: "B", text: "x^6 - x^4 + x + C" },
      { label: "C", text: "6x^6 - 4x^4 + 2x^2 + C" },
      { label: "D", text: "6x^6 - 4x^4 + x^2 + C" },
    ],
    correctAnswer: "A",
    explanation:
      "Using power rule: \u222b 6x^5 dx = x^6, \u222b -4x^3 dx = -x^4, \u222b 2x dx = x^2. So \u222b (6x^5 - 4x^3 + 2x) dx = x^6 - x^4 + x^2 + C.",
    difficulty: "easy",
  },
  {
    id: "math-2020-obj-3",
    subject: "math",
    year: 2020,
    category: "objective",
    topic: "Vectors",
    question:
      "Find the unit vector in the direction of v = 3i - 4j.",
    options: [
      { label: "A", text: "(3/5)i - (4/5)j" },
      { label: "B", text: "(3/5)i + (4/5)j" },
      { label: "C", text: "(3/7)i - (4/7)j" },
      { label: "D", text: "3i - 4j" },
    ],
    correctAnswer: "A",
    explanation:
      "|v| = \u221a(3^2 + (-4)^2) = 5. Unit vector = v/|v| = (3/5)i - (4/5)j.",
    difficulty: "easy",
  },
  {
    id: "math-2020-theory-1",
    subject: "math",
    year: 2020,
    category: "theory",
    topic: "Calculus",
    question:
      "A curve is defined by y = x^3 - 6x^2 + 9x + 1. Find the coordinates of the stationary points and determine their nature.",
    answerGuide:
      "dy/dx = 3x^2 - 12x + 9 = 3(x^2 - 4x + 3) = 3(x-1)(x-3). Stationary when dy/dx = 0 => x = 1 or x = 3. At x = 1: y = 1 - 6 + 9 + 1 = 5 => (1,5). At x = 3: y = 27 - 54 + 27 + 1 = 1 => (3,1). Nature: d^2y/dx^2 = 6x - 12. At x = 1: d^2y/dx^2 = -6 < 0 => maximum. At x = 3: d^2y/dx^2 = 6 > 0 => minimum.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct first derivative", marks: 2 },
      { point: "Correct factorisation and x-values", marks: 2 },
      { point: "Correct y-coordinates", marks: 2 },
      { point: "Correct second derivative", marks: 2 },
      { point: "Correct classification of both points", marks: 2 },
    ],
    difficulty: "medium",
  },
  {
    id: "math-2020-theory-2",
    subject: "math",
    year: 2020,
    category: "theory",
    topic: "Statistics & Probability",
    question:
      "The table below shows the frequency distribution of ages of 30 people:\n\nAge: 10-14 | 15-19 | 20-24 | 25-29 | 30-34\nFreq:   4   |   8   |  10   |   6   |   2\n\nCalculate the mean age.",
    answerGuide:
      "Midpoints: 12, 17, 22, 27, 32. fx: 12(4)=48, 17(8)=136, 22(10)=220, 27(6)=162, 32(2)=64. Sum fx = 48+136+220+162+64 = 630. Sum f = 30. Mean = 630/30 = 21 years.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct midpoints", marks: 2 },
      { point: "Correct fx products", marks: 3 },
      { point: "Correct sum of fx", marks: 2 },
      { point: "Correct total frequency", marks: 1 },
      { point: "Correct mean = 21", marks: 2 },
    ],
    difficulty: "medium",
  },

  // ============================================================
  // 2021
  // ============================================================
  {
    id: "math-2021-obj-1",
    subject: "math",
    year: 2021,
    category: "objective",
    topic: "Logic",
    question:
      "Which of the following is the contrapositive of 'If it rains, then the ground is wet'?",
    options: [
      { label: "A", text: "If the ground is not wet, then it did not rain" },
      { label: "B", text: "If the ground is wet, then it rains" },
      { label: "C", text: "If it does not rain, then the ground is not wet" },
      { label: "D", text: "It rains and the ground is wet" },
    ],
    correctAnswer: "A",
    explanation:
      "For p => q, the contrapositive is ~q => ~p. Here p = 'it rains', q = 'ground is wet'. Contrapositive: 'If the ground is not wet, then it did not rain'.",
    difficulty: "easy",
  },
  {
    id: "math-2021-obj-2",
    subject: "math",
    year: 2021,
    category: "objective",
    topic: "Algebra",
    question:
      "Solve for x: log2(x) + log2(x - 2) = 3.",
    options: [
      { label: "A", text: "4" },
      { label: "B", text: "2" },
      { label: "C", text: "8" },
      { label: "D", text: "-2" },
    ],
    correctAnswer: "A",
    explanation:
      "log2[x(x-2)] = 3 => x(x-2) = 2^3 = 8 => x^2 - 2x - 8 = 0 => (x-4)(x+2) = 0 => x = 4 or x = -2. Since log of negative is undefined, x = 4.",
    difficulty: "medium",
  },
  {
    id: "math-2021-obj-3",
    subject: "math",
    year: 2021,
    category: "objective",
    topic: "Matrices",
    question:
      "Given that matrix A = [[2, -1], [3, 2]], find A^2.",
    options: [
      { label: "A", text: "[[1, -4], [12, 1]]" },
      { label: "B", text: "[[4, 1], [9, 4]]" },
      { label: "C", text: "[[1, -4], [12, 7]]" },
      { label: "D", text: "[[4, -2], [6, 4]]" },
    ],
    correctAnswer: "A",
    explanation:
      "A^2 = [[2,-1],[3,2]] * [[2,-1],[3,2]] = [[2(2)+(-1)(3), 2(-1)+(-1)(2)], [3(2)+2(3), 3(-1)+2(2)]] = [[4-3, -2-2], [6+6, -3+4]] = [[1, -4], [12, 1]].",
    difficulty: "medium",
  },
  {
    id: "math-2021-theory-1",
    subject: "math",
    year: 2021,
    category: "theory",
    topic: "Complex Numbers",
    question:
      "Express in the form a + bi: (3 + 2i)/(1 - i).",
    answerGuide:
      "Multiply numerator and denominator by conjugate (1+i): (3+2i)(1+i)/((1-i)(1+i)) = (3+3i+2i+2i^2)/(1-i^2) = (3+5i-2)/(1+1) = (1+5i)/2 = 1/2 + (5/2)i.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct conjugate identification", marks: 2 },
      { point: "Correct multiplication of numerator", marks: 3 },
      { point: "Correct multiplication of denominator", marks: 2 },
      { point: "Simplifies using i^2 = -1", marks: 2 },
      { point: "Final answer in a+bi form", marks: 1 },
    ],
    difficulty: "medium",
  },
  {
    id: "math-2021-theory-2",
    subject: "math",
    year: 2021,
    category: "theory",
    topic: "Calculus",
    question:
      "Find the area bounded by the curve y = x^2 - 4x + 3 and the x-axis.",
    answerGuide:
      "Find x-intercepts: x^2 - 4x + 3 = 0 => (x-1)(x-3) = 0 => x = 1, 3. Area = \u222b_1^3 (x^2 - 4x + 3) dx = [x^3/3 - 2x^2 + 3x]_1^3 = [(27/3 - 18 + 9) - (1/3 - 2 + 3)] = [(9 - 18 + 9) - (1/3 + 1)] = [0 - (4/3)] = -4/3. Area = | -4/3 | = 4/3 square units.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct x-intercepts", marks: 2 },
      { point: "Sets up correct definite integral", marks: 2 },
      { point: "Correct antiderivative", marks: 2 },
      { point: "Evaluates correctly", marks: 2 },
      { point: "Final area = 4/3", marks: 2 },
    ],
    difficulty: "medium",
  },

  // ============================================================
  // 2022
  // ============================================================
  {
    id: "math-2022-obj-1",
    subject: "math",
    year: 2022,
    category: "objective",
    topic: "Sequences & Series",
    question:
      "Find the sum to infinity of the geometric series 8 + 4 + 2 + 1 + ...",
    options: [
      { label: "A", text: "16" },
      { label: "B", text: "15" },
      { label: "C", text: "8" },
      { label: "D", text: "32" },
    ],
    correctAnswer: "A",
    explanation:
      "a = 8, r = 1/2. Sum to infinity = a/(1-r) = 8/(1-1/2) = 8/(1/2) = 16.",
    difficulty: "easy",
  },
  {
    id: "math-2022-obj-2",
    subject: "math",
    year: 2022,
    category: "objective",
    topic: "Statistics & Probability",
    question:
      "Find the variance of the numbers: 2, 4, 6, 8, 10.",
    options: [
      { label: "A", text: "8" },
      { label: "B", text: "10" },
      { label: "C", text: "40" },
      { label: "D", text: "6" },
    ],
    correctAnswer: "A",
    explanation:
      "Mean = (2+4+6+8+10)/5 = 6. Deviations: -4, -2, 0, 2, 4. Squared: 16, 4, 0, 4, 16. Sum = 40. Variance = 40/5 = 8.",
    difficulty: "easy",
  },
  {
    id: "math-2022-obj-3",
    subject: "math",
    year: 2022,
    category: "objective",
    topic: "Trigonometry",
    question:
      "If sin x = 0.5 and x is acute, find the value of cos 2x.",
    options: [
      { label: "A", text: "0.5" },
      { label: "B", text: "0.75" },
      { label: "C", text: "0.25" },
      { label: "D", text: "-0.5" },
    ],
    correctAnswer: "A",
    explanation:
      "sin x = 0.5 => x = 30\u00b0. cos 2x = cos 60\u00b0 = 0.5. Alternatively, cos 2x = 1 - 2 sin^2 x = 1 - 2(0.25) = 1 - 0.5 = 0.5.",
    difficulty: "easy",
  },
  {
    id: "math-2022-theory-1",
    subject: "math",
    year: 2022,
    category: "theory",
    topic: "Vectors",
    question:
      "Three forces F1 = 2i + 3j, F2 = -i + 2j, and F3 = 3i - 5j act on a particle. Find the magnitude and direction of the resultant force.",
    answerGuide:
      "Resultant R = F1 + F2 + F3 = (2-1+3)i + (3+2-5)j = 4i + 0j = 4i. Magnitude |R| = 4 N. Direction: along the positive x-axis (0\u00b0 to the x-axis).",
    totalMarks: 10,
    markScheme: [
      { point: "Correctly sums i-components", marks: 3 },
      { point: "Correctly sums j-components", marks: 3 },
      { point: "Correct magnitude", marks: 2 },
      { point: "Correct direction", marks: 2 },
    ],
    difficulty: "easy",
  },
  {
    id: "math-2022-theory-2",
    subject: "math",
    year: 2022,
    category: "theory",
    topic: "Algebra",
    question:
      "Solve the simultaneous equations: 3x + 2y = 8 and 2x - y = 3.",
    answerGuide:
      "From second eq: y = 2x - 3. Substitute into first: 3x + 2(2x-3) = 8 => 3x + 4x - 6 = 8 => 7x = 14 => x = 2. Then y = 2(2) - 3 = 1. Solution: x = 2, y = 1.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct substitution expression", marks: 2 },
      { point: "Correct substitution into first equation", marks: 2 },
      { point: "Correct value of x", marks: 2 },
      { point: "Correct value of y", marks: 2 },
      { point: "Verification (optional)", marks: 2 },
    ],
    difficulty: "easy",
  },

  // ============================================================
  // 2023
  // ============================================================
  {
    id: "math-2023-obj-1",
    subject: "math",
    year: 2023,
    category: "objective",
    topic: "Calculus",
    question:
      "If y = ln(2x + 1), find dy/dx.",
    options: [
      { label: "A", text: "2/(2x + 1)" },
      { label: "B", text: "1/(2x + 1)" },
      { label: "C", text: "2/(2x + 1)^2" },
      { label: "D", text: "1/x" },
    ],
    correctAnswer: "A",
    explanation:
      "Using chain rule: dy/dx = (1/(2x+1)) * d/dx(2x+1) = 2/(2x+1).",
    difficulty: "easy",
  },
  {
    id: "math-2023-obj-2",
    subject: "math",
    year: 2023,
    category: "objective",
    topic: "Coordinate Geometry",
    question:
      "Find the midpoint of the line segment joining A(3, -4) and B(-5, 6).",
    options: [
      { label: "A", text: "(-1, 1)" },
      { label: "B", text: "(1, -1)" },
      { label: "C", text: "(-2, 2)" },
      { label: "D", text: "(4, -5)" },
    ],
    correctAnswer: "A",
    explanation:
      "Midpoint = ((3+(-5))/2, (-4+6)/2) = (-2/2, 2/2) = (-1, 1).",
    difficulty: "easy",
  },
  {
    id: "math-2023-obj-3",
    subject: "math",
    year: 2023,
    category: "objective",
    topic: "Sets",
    question:
      "If U = {1, 2, 3, ..., 10}, A = {2, 4, 6, 8, 10}, and B = {1, 3, 5, 7, 9}, find A' \u2229 B'.",
    options: [
      { label: "A", text: "\u2205" },
      { label: "B", text: "U" },
      { label: "C", text: "A" },
      { label: "D", text: "B" },
    ],
    correctAnswer: "A",
    explanation:
      "A' = set of elements in U not in A = {1,3,5,7,9} = B. B' = {2,4,6,8,10} = A. A' \u2229 B' = B \u2229 A = \u2205 (they are disjoint).",
    difficulty: "medium",
  },
  {
    id: "math-2023-theory-1",
    subject: "math",
    year: 2023,
    category: "theory",
    topic: "Calculus",
    question:
      "Given y = (x^2 + 1)^4, find dy/dx using the chain rule.",
    answerGuide:
      "Let u = x^2 + 1. Then y = u^4. dy/du = 4u^3. du/dx = 2x. By chain rule: dy/dx = dy/du * du/dx = 4u^3 * 2x = 8x(x^2 + 1)^3.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct substitution u = x^2 + 1", marks: 2 },
      { point: "Correct dy/du", marks: 2 },
      { point: "Correct du/dx", marks: 2 },
      { point: "Applies chain rule correctly", marks: 2 },
      { point: "Final simplified expression", marks: 2 },
    ],
    difficulty: "easy",
  },
  {
    id: "math-2023-theory-2",
    subject: "math",
    year: 2023,
    category: "theory",
    topic: "Statistics & Probability",
    question:
      "The probability that X passes an exam is 0.7 and the probability that Y passes the same exam is 0.4. Find the probability that at least one of them passes.",
    answerGuide:
      "P(at least one passes) = 1 - P(both fail). P(X fails) = 0.3, P(Y fails) = 0.6. P(both fail) = 0.3 * 0.6 = 0.18. P(at least one passes) = 1 - 0.18 = 0.82.",
    totalMarks: 10,
    markScheme: [
      { point: "Identifies complement approach", marks: 2 },
      { point: "Correct failure probabilities", marks: 2 },
      { point: "Correct P(both fail)", marks: 3 },
      { point: "Final answer = 0.82", marks: 3 },
    ],
    difficulty: "easy",
  },

  // ============================================================
  // 2024
  // ============================================================
  {
    id: "math-2024-obj-1",
    subject: "math",
    year: 2024,
    category: "objective",
    topic: "Matrices",
    question:
      "Given that A = [[1, 0, 1], [2, 1, 0], [1, -1, 1]], find the cofactor of element a_22.",
    options: [
      { label: "A", text: "0" },
      { label: "B", text: "1" },
      { label: "C", text: "-1" },
      { label: "D", text: "2" },
    ],
    correctAnswer: "A",
    explanation:
      "Cofactor of a_22 = (-1)^(2+2) * det(M_22). M_22 = [[1, 1], [1, 1]] (remove row 2, col 2). det(M_22) = 1(1) - 1(1) = 0. Cofactor = 1 * 0 = 0.",
    difficulty: "hard",
  },
  {
    id: "math-2024-obj-2",
    subject: "math",
    year: 2024,
    category: "objective",
    topic: "Complex Numbers",
    question:
      "If z = 2(cos \u03c0/3 + i sin \u03c0/3), find z^2 in polar form.",
    options: [
      { label: "A", text: "4(cos 2\u03c0/3 + i sin 2\u03c0/3)" },
      { label: "B", text: "2(cos 2\u03c0/3 + i sin 2\u03c0/3)" },
      { label: "C", text: "4(cos \u03c0/6 + i sin \u03c0/6)" },
      { label: "D", text: "2(cos \u03c0/6 + i sin \u03c0/6)" },
    ],
    correctAnswer: "A",
    explanation:
      "By De Moivre's theorem: z^2 = 2^2(cos(2 * \u03c0/3) + i sin(2 * \u03c0/3)) = 4(cos 2\u03c0/3 + i sin 2\u03c0/3).",
    difficulty: "medium",
  },
  {
    id: "math-2024-obj-3",
    subject: "math",
    year: 2024,
    category: "objective",
    topic: "Algebra",
    question:
      "If (x + 2) is a factor of f(x) = x^3 + ax^2 - 3x + 10, find a.",
    options: [
      { label: "A", text: "-4" },
      { label: "B", text: "4" },
      { label: "C", text: "-2" },
      { label: "D", text: "6" },
    ],
    correctAnswer: "C",
    explanation:
      "By factor theorem, f(-2) = 0. (-2)^3 + a(4) + 6 + 10 = 0 => -8 + 4a + 16 = 0 => 4a + 8 = 0 => a = -2.",
    difficulty: "medium",
  },
  {
    id: "math-2024-theory-1",
    subject: "math",
    year: 2024,
    category: "theory",
    topic: "Calculus",
    question:
      "Evaluate \u222b_0^(\u03c0/2) sin x cos x dx.",
    answerGuide:
      "Let u = sin x, du = cos x dx. When x = 0, u = 0. When x = \u03c0/2, u = 1. \u222b_0^(\u03c0/2) sin x cos x dx = \u222b_0^1 u du = [u^2/2]_0^1 = 1/2.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct substitution u = sin x", marks: 2 },
      { point: "Correct du = cos x dx", marks: 2 },
      { point: "Correct limits in u", marks: 2 },
      { point: "Correct integral in u", marks: 2 },
      { point: "Final answer = 1/2", marks: 2 },
    ],
    difficulty: "medium",
  },
  {
    id: "math-2024-theory-2",
    subject: "math",
    year: 2024,
    category: "theory",
    topic: "Coordinate Geometry",
    question:
      "Find the equation of the line through the point (2, 3) that is perpendicular to the line 3x - 2y + 5 = 0.",
    answerGuide:
      "Line 3x - 2y + 5 = 0 => y = (3/2)x + 5/2, slope m1 = 3/2. Perpendicular slope m2 = -1/m1 = -2/3. Equation: y - 3 = (-2/3)(x - 2) => 3(y - 3) = -2(x - 2) => 3y - 9 = -2x + 4 => 2x + 3y - 13 = 0.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct slope of given line", marks: 2 },
      { point: "Correct perpendicular slope", marks: 2 },
      { point: "Correct point-slope form", marks: 2 },
      { point: "Correct simplification", marks: 2 },
      { point: "Final equation", marks: 2 },
    ],
    difficulty: "medium",
  },

  // ============================================================
  // 2025
  // ============================================================
  {
    id: "math-2025-obj-1",
    subject: "math",
    year: 2025,
    category: "objective",
    topic: "Sequences & Series",
    question:
      "The 3rd term of a geometric progression is 12 and the 6th term is 96. Find the common ratio.",
    options: [
      { label: "A", text: "2" },
      { label: "B", text: "3" },
      { label: "C", text: "4" },
      { label: "D", text: "1/2" },
    ],
    correctAnswer: "A",
    explanation:
      "T_n = ar^(n-1). T_3 = ar^2 = 12. T_6 = ar^5 = 96. Dividing: (ar^5)/(ar^2) = 96/12 => r^3 = 8 => r = 2.",
    difficulty: "medium",
  },
  {
    id: "math-2025-obj-2",
    subject: "math",
    year: 2025,
    category: "objective",
    topic: "Trigonometry",
    question:
      "Express 2 cos^2 x - 1 in its simplest form.",
    options: [
      { label: "A", text: "cos 2x" },
      { label: "B", text: "sin 2x" },
      { label: "C", text: "2 sin x cos x" },
      { label: "D", text: "cos^2 x" },
    ],
    correctAnswer: "A",
    explanation:
      "cos 2x = 2 cos^2 x - 1. This is the double-angle identity for cosine.",
    difficulty: "easy",
  },
  {
    id: "math-2025-obj-3",
    subject: "math",
    year: 2025,
    category: "objective",
    topic: "Statistics & Probability",
    question:
      "The mean of 5 numbers is 12. If one number 18 is removed, find the new mean.",
    options: [
      { label: "A", text: "10.5" },
      { label: "B", text: "9.5" },
      { label: "C", text: "11" },
      { label: "D", text: "12" },
    ],
    correctAnswer: "A",
    explanation:
      "Sum of 5 numbers = 5 * 12 = 60. Remove 18: new sum = 60 - 18 = 42. New mean = 42/4 = 10.5.",
    difficulty: "easy",
  },
  {
    id: "math-2025-theory-1",
    subject: "math",
    year: 2025,
    category: "theory",
    topic: "Matrices",
    question:
      "Solve the system of equations using matrix method:\n2x + y - z = 3\nx - 2y + 3z = -1\n3x - y + 2z = 5",
    answerGuide:
      "Matrix form: [[2,1,-1],[1,-2,3],[3,-1,2]][x,y,z]^T = [3,-1,5]^T. Augmented matrix and row reduce: R2 -> 2R2 - R1: [0,-5,7;-5]. R3 -> 2R3 - 3R1: [0,-5,7;1]. Then R3 - R2: [0,0,0;6] - no, need to redo. Let me solve properly:\n\nFrom eq1: z = 2x + y - 3. Sub into eq2: x - 2y + 3(2x+y-3) = -1 => x - 2y + 6x + 3y - 9 = -1 => 7x + y = 8 => (i) y = 8 - 7x.\nSub into eq3: 3x - (8-7x) + 2(2x + (8-7x) - 3) = 5 => 3x - 8 + 7x + 2(2x + 8 - 7x - 3) = 5 => 10x - 8 + 2(-5x + 5) = 5 => 10x - 8 - 10x + 10 = 5 => 2 = 5 => inconsistent.\n\nThe system is inconsistent. No solution.\n\nDet(A) = 2((-2)(2)-(-1)(3)) - 1((1)(2)-(3)(3)) + (-1)((1)(-1)-(-2)(3)) = 2(-4+3) - 1(2-9) -1(-1+6) = 2(-1) - 1(-7) -1(5) = -2+7-5 = 0. Since det = 0, no unique solution. Checking consistency reveals no solution.\n\nAnswer: The system is inconsistent (no solution).",
    totalMarks: 10,
    markScheme: [
      { point: "Writes matrix form correctly", marks: 2 },
      { point: "Computes determinant = 0", marks: 3 },
      { point: "Recognizes dependent/inconsistent system", marks: 2 },
      { point: "Checks consistency correctly", marks: 2 },
      { point: "Correct conclusion (inconsistent/no solution)", marks: 1 },
    ],
    difficulty: "hard",
  },
  {
    id: "math-2025-theory-2",
    subject: "math",
    year: 2025,
    category: "theory",
    topic: "Calculus",
    question:
      "Find the volume of the solid generated when the region bounded by y = x^2, y = 0, x = 0, and x = 2 is rotated about the x-axis.",
    answerGuide:
      "Volume by disc method: V = \u03c0 \u222b_0^2 y^2 dx = \u03c0 \u222b_0^2 (x^2)^2 dx = \u03c0 \u222b_0^2 x^4 dx = \u03c0 [x^5/5]_0^2 = \u03c0(32/5 - 0) = 32\u03c0/5 cubic units.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct formula using disc method", marks: 2 },
      { point: "Correct integrand (x^4)", marks: 2 },
      { point: "Correct antiderivative", marks: 2 },
      { point: "Correct evaluation", marks: 2 },
      { point: "Final answer = 32\u03c0/5", marks: 2 },
    ],
    difficulty: "medium",
  },
];

export function getMathQuestions(year: number): {
  objective: StudyQuestion[];
  theory: StudyQuestion[];
  practical: StudyQuestion[];
} {
  const objective = questions.filter(
    (q) => q.year === year && q.category === "objective"
  );
  const theory = questions.filter(
    (q) => q.year === year && q.category === "theory"
  );
  return {
    objective,
    theory,
    practical: [],
  };
}
