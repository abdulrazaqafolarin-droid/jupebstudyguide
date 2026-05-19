import type { StudyQuestion } from "@/types/study-questions";

const mathData: Record<number, { objective: StudyQuestion[]; theory: StudyQuestion[]; practical: StudyQuestion[] }> = {
  2015: {
    objective: [
      {
        id: "mat-2015-import-1", subject: "math", year: 2015, category: "objective",
        question: `, 0 4 1 0 1 4 3 3 2 ⎥ ⎥ ⎥ ⎦ ⎤ ⎢ ⎢ ⎢ ⎣ ⎡ = Z If find determinant of Z. 4. Find the centre and radius of the circle 8x 2 +8y 2 -24x-40y+18=0. 10. A polynomial 2𝑥 # + 𝑎𝑥 ' + 𝑏𝑥 − 1 has a factor (𝑥 − 1) and the remainder when it is divided by (𝑥 − 2) is −4 . Find 𝑎 + 𝑏 .`,
        options: [{"label":"A","text":"35"},{"label":"B","text":"45"},{"label":"C","text":"-35"},{"label":"D","text":"48 3. Compute   1 +   # $%& ' ."},{"label":"A","text":")* '  −  $- '  𝑖"},{"label":"B","text":"4 −  $- '  𝑖"},{"label":"C","text":"$0 '  −  $- '  𝑖"},{"label":"A","text":"(3/2, 5/2) and r = 3/2"},{"label":"B","text":"(-3/2, 5/2) and r = 5/2"},{"label":"C","text":"(3/2, -5/2) and r = 3/2"},{"label":"D","text":"(3/2, 5/2) and r = 5/2 5. Find the equation of the tangent to the circle   30 2 2   2 2   = +   y x   at the point   ) 6 , 3 ( −   ."},{"label":"A","text":"x + y – 15=0"},{"label":"B","text":"x – 2y + 5=0"},{"label":"C","text":"x + 2y – 5=0"},{"label":"D","text":"x – 2y+15=0 6. Given the equations of the ellipse x 2 /2+y 2 =1. Find the equation of the directrices."},{"label":"A","text":"𝑥 = (0, ±1)"},{"label":"B","text":"𝑥 = (0, ±2)"},{"label":"C","text":"𝑥 = (0, ±3)"},{"label":"D","text":"𝑥 = ( 0, ±4)  7. Find the gradient of the curve   𝑦 = 𝑥 #  − 6𝑥 '  + 11𝑥 − 6   at the point (1, 0)"},{"label":"A","text":"-1"},{"label":"B","text":"-2"},{"label":"C","text":"1"},{"label":"D","text":"2 8. Given sets   𝐴 =   𝑎, 𝑏, 1, 3   and   𝐵 =   𝑎, 2, 4   , find   𝐴 ∪ 𝐵."},{"label":"A","text":"∅"},{"label":"B","text":"𝑎, 𝑏, 1,2,3,4"},{"label":"C","text":"𝑎, 𝑏, 1,3"},{"label":"D","text":"𝑏, 1,2,3,4  9. Let P be the set of prime factors of 42 and Q be the set of prime factors of 45. Find   𝑃 ∩ 𝑄 ."},{"label":"A","text":"2"},{"label":"B","text":"3"},{"label":"C","text":"7"},{"label":"A","text":"−1"},{"label":"B","text":"1"},{"label":"C","text":"−2"},{"label":"D","text":"2  11. Solve the equation   log# 𝑥 + logJ 3 =  $K #"},{"label":"A","text":"3   , 9"},{"label":"B","text":"27 ,   3"},{"label":"C","text":"10 , 9"},{"label":"D","text":"27 ,   3 L  12. Solve the equation   2𝑥 + 3   –   𝑥 − 2   = 2"},{"label":"A","text":"3 , 6"},{"label":"B","text":"3 , 11"},{"label":"C","text":"27 , 3"},{"label":"D","text":"3 , 10. 13. If   𝑦 = 𝑥 (𝑥 M  − 1) , find the range for which   𝑦 = 0 ."},{"label":"A","text":"− ∞ , 0   ∪ (0,   ∞ )"},{"label":"B","text":"−1, − ∞   ∪   0,   ∞"},{"label":"C","text":"−1,0   ∪ [0,1]"},{"label":"D","text":"(− ∞ ,   ∞ )"}],
        correctAnswer: "D",
        explanation: "AI-generated answer based on domain knowledge",
        difficulty: "medium",
        topic: "",
      },
      {
        id: "mat-2015-import-2", subject: "math", year: 2015, category: "objective",
        question: `Evaluate lim J → )# #J S ) '0 J%#- 15. Evaluate T U VU W $`,
        options: [{"label":"A","text":"-18"},{"label":"B","text":"9"},{"label":"C","text":"0"},{"label":"A","text":"0"},{"label":"B","text":"2"},{"label":"C","text":"1"},{"label":"D","text":"2e 16. Evaluate   𝐶𝑜𝑠 𝑥 𝑑𝑥 \\ S K"},{"label":"A","text":"2"},{"label":"B","text":"7"},{"label":"C","text":"-1"},{"label":"D","text":"1"}],
        correctAnswer: "TBD",
        explanation: "Answer to be verified",
        difficulty: "medium",
        topic: "",
      },
      {
        id: "mat-2015-import-3", subject: "math", year: 2015, category: "objective",
        question: `Evaluate lim J→] 'J L % J S ) - J L % 'J%$`,
        options: [{"label":"A","text":"5"},{"label":"B","text":"0"},{"label":"C","text":"2"},{"label":"D","text":"∞"}],
        correctAnswer: "TBD",
        explanation: "Answer to be verified",
        difficulty: "medium",
        topic: "",
      },
      {
        id: "mat-2015-import-4", subject: "math", year: 2015, category: "objective",
        question: `The expression p 𝑥 ' + 𝑞𝑥 + 𝑟 𝑒𝑞𝑢𝑎𝑙𝑠 4 𝑎𝑡 𝑥 = 1 . If the derivative is 2x + 1, what are the values of p, q and r respectively`,
        options: [{"label":"A","text":"1, 1, 2"},{"label":"B","text":"1, 2, 1"},{"label":"C","text":"1, 0, 1"},{"label":"D","text":"1, -1, 2"}],
        correctAnswer: "C",
        explanation: "AI-generated answer based on domain knowledge",
        difficulty: "medium",
        topic: "",
      },
      {
        id: "mat-2015-import-5", subject: "math", year: 2015, category: "objective",
        question: `The gradient of a curve at any point (x, y) is given by 2x + 3. If the curve passes through the origin, find the equation of the curve`,
        options: [{"label":"A","text":"x (x + 2)"},{"label":"B","text":"x (2x + 3)"},{"label":"C","text":"𝑥 '  − 4"},{"label":"D","text":"2x + 3"}],
        correctAnswer: "D",
        explanation: "AI-generated answer based on domain knowledge",
        difficulty: "medium",
        topic: "",
      },
      {
        id: "mat-2015-import-6", subject: "math", year: 2015, category: "objective",
        question: `The position of an object in motion at any time (t) is given by s = 3 𝑡 # - 5t – 2. Obtain the velocity of the object after 2 seconds.`,
        options: [{"label":"A","text":"31m/s"},{"label":"B","text":"36m/s"},{"label":"C","text":"18m/s"},{"label":"D","text":"20m/s"}],
        correctAnswer: "TBD",
        explanation: "Answer to be verified",
        difficulty: "medium",
        topic: "",
      },
      {
        id: "mat-2015-import-7", subject: "math", year: 2015, category: "objective",
        question: `Find the derivative of 2x 3 – 5x 2 + 2`,
        options: [{"label":"A","text":"x 2  – 10x"},{"label":"B","text":"6x 2  – 10x"},{"label":"C","text":"–10x – 6x 2"},{"label":"D","text":"6x – 10. 22. Find the derivative of   y = (3 + 2x) (1 – x)"},{"label":"A","text":"-1 - 4x"},{"label":"B","text":"4x -1"},{"label":"C","text":"-4x + 1"},{"label":"D","text":"– 4x 23. Differentiate (x +y) 2  ="}],
        correctAnswer: "C",
        explanation: "AI-generated answer based on domain knowledge",
        difficulty: "medium",
        topic: "",
      },
      {
        id: "mat-2015-import-8", subject: "math", year: 2015, category: "objective",
        question: `25. If y = (x – 1) e -x , find de dJ`,
        options: [{"label":"A","text":"– 4"},{"label":"B","text":"– 2"},{"label":"C","text":"– 1"},{"label":"D","text":"10 24. Evaluate:   lim J→- J   25 2   −  J)-"},{"label":"A","text":"5"},{"label":"B","text":"15"},{"label":"C","text":"10"},{"label":"A","text":"(2 – x) e -x"},{"label":"B","text":"e x  2x"},{"label":"C","text":"– x e x"},{"label":"D","text":"2x 26. Find the modulus of 2i + 3j – 4k"},{"label":"A","text":"√ 12"},{"label":"B","text":"√ 29"},{"label":"C","text":"√ 3"},{"label":"D","text":"√   28 27. Find the scalar products of a = 2i + 3j and b = - i + 4j"},{"label":"A","text":"20"},{"label":"B","text":"10"},{"label":"C","text":"-10"},{"label":"D","text":"-20 28. Find the value of n for which the vector s i   +n j   -3 k   and n i   –   j   + 5 k   are perpendicular."},{"label":"A","text":"90"},{"label":"B","text":"0 0"},{"label":"C","text":"$- g)$"},{"label":"D","text":"g)$ $-  29. Obtain the projection of vector a = (3,-1.5) on the vector b = (2.1,-3)"},{"label":"A","text":")' $h ,"},{"label":"B","text":")' #-"},{"label":"C","text":"14"},{"label":"D","text":"35  30. Find the volume of the tetrahedron OABC with point A (2,1,1) ,B(0,-1,1) and C(-1,3,0)."},{"label":"A","text":"2  5"},{"label":"B","text":"3  4"},{"label":"C","text":"4  3"},{"label":"D","text":"- 4  3"}],
        correctAnswer: "TBD",
        explanation: "Answer to be verified",
        difficulty: "medium",
        topic: "",
      },
      {
        id: "mat-2015-import-9", subject: "math", year: 2015, category: "objective",
        question: `The distance 𝑆 in meters (m) moved by a particle in 𝑡 time in seconds (s) is given by 𝑆 = 1.5𝑡 ' − 𝑡. Find its speed after 𝑡 seconds. 36. A mass of 8kg hangs in equilibrium, suspended by two light inelastic strings making angles 30 ° and 45 ° with the horizontal, calculate the tensions in the two strings. 41. The following are continuous random variables except 47. Find the mean of the following scores Scores(x) 61 64 67 70 73 Freq. (f) 5 18 42 27 8 MATHEMATICS ESSAY QUESTIONS 1 (a). Given A = {-5, -3, -1, 0, 1, 2, 3} , B = {-4, -3, 0, 3, 5, 8}. MAT001 Find A Δ 3 (a) By using the reduction formula for ∫ xdx n sec , evaluate the definite integral MAT 002 ∫ 4 0 6 sec π xdx 10 Marks (b) Find the area enclosed by the curve 2 x y = and the x -axis between 0 1 = x and 2 2 = x . 5 Marks 4 (a) Evaluate 𝑙𝑖𝑚 J→K $ J – csc 𝑥 . MAT 002 3 Marks (b) By Taylor’s theorem, show that logW 1 + 𝑥 = x – J S ' + J L # – J o h + . . . J  u , and hence evaluate logW 1.1 to four decimal places. 8 Marks (c) Using the trapezoidal rule with ordinates x = 1.0, 1.4, 1.8, 2.2, 2.6, 3.0; evaluate $ J%$ 𝑑𝑥 # $ . 4 Marks`,
        options: [{"label":"A","text":"3t m/s"},{"label":"B","text":"(3t-1)m/s"},{"label":"C","text":"(3t+1)m/s"},{"label":"D","text":"(1-3t)m/s 32. A car starts from   𝐴   and travels 10km due West, 20km North-West and 30km due North. Find the displacement from   𝐴 ."},{"label":"A","text":"51.3km"},{"label":"B","text":"53.3km"},{"label":"C","text":"43km"},{"label":"D","text":"50.3km 33. The brakes of a train are able to produce a retardation of 1.2m/s. if the train is travelling at 90km/h, at what distance from a station should the brakes be applied."},{"label":"A","text":"200m"},{"label":"B","text":"250m"},{"label":"C","text":"260m"},{"label":"D","text":"240m 34. A particle is projected with a velocity of 20m/s up a smooth inclined plane of inclination 30 ° . Find the distance described up the plane."},{"label":"A","text":"40.8m"},{"label":"B","text":"48m"},{"label":"C","text":"40m"},{"label":"D","text":"38m 35. A block of mass 20kg rests on a horizontal plane whose coefficient of friction is 0.4. Find the least force required to move the block if it acts horizontally."},{"label":"A","text":"190N"},{"label":"B","text":"80N"},{"label":"C","text":"196N"},{"label":"A","text":"57.4N, 70.3W"},{"label":"B","text":"50N, 70W C   60.5N, 60.5W"},{"label":"D","text":"50N, 50W 37. If   𝑎   =   2𝑖 + 3𝑗 + 5𝑘, 𝑏 = 3𝑖 − 5𝑗 + 2𝑘, 𝑐 = 𝑖 − 𝑗.   calculate   𝜆   such that 2 𝑎 - 5 𝑏   +   𝜆𝑐   is perpendicular to the   𝑥 − 𝑎𝑥𝑖𝑠."},{"label":"A","text":"8"},{"label":"B","text":"9"},{"label":"C","text":"10"},{"label":"D","text":"7  38. The probabilities that John and Joanna will passed an examination are   S L   and   o p   respectively. Find   the probability that only one of them will pass."},{"label":"A","text":"S Tp"},{"label":"B","text":"o Tp"},{"label":"C","text":"T Tp"},{"label":"D","text":"q Tp  39. In how many ways can a committee of 2 men and 2 women be formed from 3 men and 5 women?"},{"label":"A","text":"12"},{"label":"B","text":"30"},{"label":"C","text":"20"},{"label":"D","text":"10 40. The formular for Spearman’s rank correlation is:"},{"label":"A","text":"1 +   M   d S r r S )$"},{"label":"B","text":"1 −   d S r(r S )$)"},{"label":"C","text":"1 −   M   d S r(r S )$)"},{"label":"A","text":"The temperature of an object"},{"label":"B","text":"The distance between two points"},{"label":"C","text":"The population of a school"},{"label":"D","text":"The marks obtained by a group students 42. The following are features of a standard normal curve except"},{"label":"A","text":"It is bell-shaped"},{"label":"B","text":"The area under the curve is 1"},{"label":"C","text":"It is symmetric about the mean"},{"label":"D","text":"The variance is zero 43. An experiment in which the outcomes are two possibilities: “Success” or “failure” is said to be"},{"label":"A","text":"Binomial"},{"label":"B","text":"Normal C   Geometric"},{"label":"D","text":"Bernoulli 44. The range of values of rank correlation ( 𝑟stuv)   is"},{"label":"A","text":"-1 <   𝑟stuv   < 1"},{"label":"B","text":"0 <   𝑟stuv   < 1"},{"label":"C","text":"-1 <   𝑟stuv   < 0"},{"label":"D","text":"𝑟stuv   > 1  45 . Find the geometric mean of the data: 5, 15, 10, 8, 12."},{"label":"A","text":"72000"},{"label":"B","text":"821.1"},{"label":"C","text":"9.36"},{"label":"D","text":"10 46. One can easily determine the ... of a distribution from histogram."},{"label":"A","text":"mean"},{"label":"B","text":"mode"},{"label":"C","text":"median"},{"label":"A","text":"65"},{"label":"B","text":"67.45"},{"label":"C","text":"67"},{"label":"D","text":"68 48. What is the mode of the following numbers 1,8,8,10,9,2,7,8,2,2,4,1,1,8,7,1"},{"label":"A","text":"8"},{"label":"B","text":"8 and 1"},{"label":"C","text":"1"},{"label":"D","text":"None of the above  49. The .................. level of a test is the maximum probability of committing Type I error when the null hypothesis holds."},{"label":"A","text":"acceptance"},{"label":"B","text":"rejection"},{"label":"C","text":"significance"},{"label":"D","text":"significant 50. The standard deviation of a statistic describes"},{"label":"A","text":"the shape of its distribution."},{"label":"B","text":"the centre of its distribution."},{"label":"C","text":"the amount of skewness associated with its distribution."},{"label":"B","text":"2 Marks (b)   If A, B, and C are any sets, show that   A   ∪   (B   ∪   C) = (A   ∪   B)   ∪   C   3 Marks (c ) In an election involving three parties for the chairmanship and gubernatorial election of Lagos State, voters cast their votes as follows: 190 voted for party A, 200 for party B and 250 for party"},{"label":"C","text":"80 voted for A and B, 60 voted for A and C, 100 voted for B and C and 40 voted for B alone. If 500 people voted during the election, find: i.   The number of voters who voted for all the three parties.   3 Marks ii.   The number of voters who voted for A and B but not"},{"label":"C","text":"3 Marks iii.   The number of voters who did not vote for any party.   4 Marks 2 (a) i.   Evaluate the determinant"}],
        correctAnswer: "B",
        explanation: "AI-generated answer based on domain knowledge",
        difficulty: "medium",
        topic: "",
      },
    ],
    theory: [
      {
        id: "mat-2015-import-theory-1", subject: "math", year: 2015, category: "theory",
        question: `1 (a). Given   A = {-5, -3, -1, 0, 1, 2, 3} , B = {-4, -3, 0, 3, 5, 8}.   MAT001  Find   A   Δ   B.   2 Marks (b)   If A, B, and C are any sets, show that   A   ∪   (B   ∪   C) = (A   ∪   B)   ∪   C   3 Marks (c ) In an election involving three parties for the chairmanship and gubernatorial election of Lagos State, voters cast their votes as follows: 190 voted for party A, 200 for party B and 250 for party C. 80 voted for A and B, 60 voted for A and C, 100 voted for B and C and 40 voted for B al`,
        answerGuide: "",
        markScheme: [],
        totalMarks: 10,
        topic: "",
      },
    ],
    practical: [],
  },
};

const currentMath = mathData;

export function getMathQuestions(year: number) {
  return currentMath[year] || { objective: [], theory: [], practical: [] };
}
