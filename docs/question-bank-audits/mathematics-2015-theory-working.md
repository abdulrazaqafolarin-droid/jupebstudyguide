# JUPEB Mathematics 2015 — essay answer-check working

**Status:** Draft working and independent calculation check; not yet examiner-approved.  
**Companion audit:** [mathematics-2015.md](./mathematics-2015.md)  
**Primary source:** [Official JUPEB 2015 Mathematics paper](https://jupeb.edu.ng/past_questions/2015%20Mathematics.pdf)

This file records original calculations by paper question number without reproducing the full exam prompts. The source paper has eight numbered essay questions with subparts and mark allocations. The live Rutex database currently has no 2015 Mathematics theory rows.

## Q1 — sets and inclusion–exclusion

**(a) Symmetric difference:** remove the three common elements from the union.  
Result: `{-5, -4, -1, 1, 2, 5, 8}`.

**(b) Associativity of union:** for any element (x),
(x\in A\cup(B\cup C)) iff (x\in A) or (x\in B) or (x\in C), which is also iff (x\in(A\cup B)\cup C). Hence the sets are equal.

**(c) Three-set election calculation:** interpreting each pair total as an inclusive intersection, let (t=|A\cap B\cap C|). Since the B-only count is 40,
(200=40+(80-t)+(100-t)+t), so (t=20).
Thus A-and-B-but-not-C is (80-20=60).
The union is (190+200+250-80-60-100+20=420), so no party is (500-420=80).

**Check:** the inclusive-intersection interpretation is required for the arithmetic; preserve the source's “B alone” wording.

## Q2 — determinants, partial fractions and trigonometry

**(a)(i)–(ii)** The 3×3 determinant in the source is zero (its rows are linearly dependent). Therefore the matrix is singular and has no inverse.

**(a)(iii)** The decomposition is
[
\frac{x^3-1}{(x+3)(x+1)^2}
=1-\frac7{x+3}+\frac2{x+1}-\frac1{(x+1)^2}.
]
Expanding about (x=0) through the (x^2) term:
[
-\frac13+\frac79x-\frac{34}{27}x^2+O(x^3).
]
The omitted terms are of order (x^3) and higher.

**(b)** Equating (cos(x+\alpha)) and (sin(x+\beta)) and expanding gives
[
\tan x=\frac{\cos\alpha-\sin\beta}{\sin\alpha+\cos\beta}
=\tan\left(\frac\pi4-\frac{\alpha+\beta}{2}\right),
]
where the ratio form applies when its denominator is nonzero.

**(c)** Since A is obtuse, (cos A=-3/5); since B is acute, (sin B=5/13). Therefore
[
\sin(A+B)=\frac{33}{65},\qquad
\tan(A-B)=-\frac{63}{16}.
]

## Q3 — integration

**(a)** Using the reduction formula
(I_n=\frac{\sec^{n-2}x\tan x}{n-1}+\frac{n-2}{n-1}I_{n-2}),
with (I_2=\tan x), evaluate at the given limits:
[
\int_0^{\pi/4}\sec^6x\,dx=\frac{28}{15}.
]

**(b)** Area between (y=x^2) and the x-axis from 0 to 2:
[
\int_0^2x^2\,dx=\left[\frac{x^3}{3}\right]_0^2=\frac83
]
square units.

## Q4 — limits, Taylor series and numerical integration

**(a)** Rewrite
(1/x-\csc x=(\sin x-x)/(x\sin x)). As (x\to0), (sin x=x-x^3/6+O(x^5)); the limit is 0.

**(b)** Taylor expansion:
[
\ln(1+x)=x-\frac{x^2}{2}+\frac{x^3}{3}-\frac{x^4}{4}+\cdots.
]
At (x=0.1), summing the alternating series gives (ln(1.1)=0.095310ldots), so to four decimal places the result is **0.0953**.

**(c)** Composite trapezoidal rule, (h=0.4), with ordinates (1/(x+1)):
[
T=\frac{0.4}{2}[0.5+0.25+2(0.4166667+0.3571429+0.3125+0.2777778)]
\approx0.6956349.
]
Report **0.6956** to four decimal places. The exact integral is (ln2\approx0.6931), a useful reasonableness check; it is not the requested trapezoidal approximation.

## Q5 — rigid-body definitions and a uniform rod

Moment of inertia about an axis is (I=\sum mr^2) (or the corresponding integral for a continuous body). Radius of gyration (k) is defined by (I=Mk^2), hence (k=\sqrt{I/M}).

For a uniform thin rod of length (2a), with linear mass density (ρ), about an axis through one end and perpendicular to the rod:
[
M=2a\rho,\quad I=\int_0^{2a}x^2\rho\,dx=\frac{8\rho a^3}{3},
\quad k=\sqrt{I/M}=\frac{2a}{\sqrt3}.
]
**Unit caution:** this assumes the source's (ρ) means mass per unit length.

## Q6 — Newton's law of cooling and vectors

**(a)** Newton's law of cooling states that, under the law's usual conditions, the rate of change of body temperature is proportional to the difference between the body's temperature and the ambient temperature:
[
\frac{dT}{dt}=-k(T-T_s),\quad k>0.
]

**(b)** With room temperature (T_s=15^\circ C), (T(0)=100^\circ C), and (T(2)=85^\circ C):
[
T(t)=15+85e^{-kt},\quad
k=\frac12\ln\frac{17}{14}\approx0.0970780\text{ min}^{-1}.
]
Therefore (T(4)=15+85(14/17)^2\approx72.6471^\circ C). The time from the start to reach (40^\circ C) is
[
t=\frac{2\ln(17/5)}{\ln(17/14)}\approx12.6061\text{ min}.
]

**(c)** For the given position vectors, (a+b=(8,9,-2)), so (|a+b|=\sqrt{149}). Collinearity requires (c-a) to be a scalar multiple of (b-a); comparing components gives (β=9).

## Q7 — grouped scores and descriptive statistics

Using the stated class width of five:

| Class interval | Frequency |
|---|---:|
| 45–49 | 1 |
| 50–54 | 2 |
| 55–59 | 4 |
| 60–64 | 4 |
| 65–69 | 12 |
| 70–74 | 14 |
| 75–79 | 8 |
| 80–84 | 3 |
| 85–89 | 0 |
| 90–94 | 1 |
| 95–99 | 0 |
| 100–104 | 1 |
| **Total** | **50** |

Using class midpoints:
[
\sum fm=3495,\quad \sum fm^2=248905,\quad \bar x=69.9.
]
Using the population divisor (N=50), grouped variance (=92.09), standard deviation (\approx9.5964), and coefficient of variation
[
CV=\frac{9.5964}{69.9}\times100\%\approx13.73\%.
]
If the 50 students are instead treated as a sample, the sample standard deviation is approximately 9.6938 and the corresponding CV is approximately 13.87%.

**Source ambiguity:** the prompt does not say whether these 50 students are the entire population of interest or a sample drawn from a larger group. The sample/population sub-question cannot be answered uniquely without that context. The guide should show the stated assumption and, preferably, both SD conventions rather than claim an unsupported single answer.

**Measures of location:** the mean is the arithmetic average; the median is the central ordered value (or average of the two central values); the mode is the most frequent value/class.

## Q8 — correlation, random variables and binomial probability

**(a)(i) Pearson correlation:** for the five paired values, (Σx=15), (Σy=20), (Σx^2=55), (Σy^2=114), and (Σxy=78). Hence
[
r=\frac{5(78)-15(20)}{\sqrt{[5(55)-15^2][5(114)-20^2]}}
=\frac{90}{\sqrt{8500}}\approx0.9762.
]

**(a)(ii) Spearman rank correlation:** the rank differences are (-1,2,2,-2,-1); (Σd^2=14). Thus
[
r_s=1-\frac{6(14)}{5(5^2-1)}=0.30.
]

**(b)** A discrete random variable takes distinct countable values; a continuous random variable can take any value in an interval (subject to its model).

**(c)** With independent chip defects and (X\sim\mathrm{Bin}(8,0.05)):
[
P(X=2)=\binom82(0.05)^2(0.95)^6\approx0.0514564,
]
[
P(X\ge2)=1-(0.95)^8-8(0.05)(0.95)^7\approx0.0572447.
]
For 2,000 chips, expected defects (np=100) and variance (np(1-p)=95).

## Checks still required before this becomes an approved answer guide

- [ ] Independent second review of all algebra and numerical arithmetic.
- [ ] Confirm mark allocations and accepted working/rounding with an authorised marking scheme if available.
- [ ] Confirm whether Q7 expects a population or sample standard deviation; retain the ambiguity until the context is known.
- [ ] Confirm the interpretation of the pairwise voter totals in Q1(c).
- [ ] Verify all 8 essay subparts, tables and any visual elements against the complete source PDF.
- [ ] Map each answer guide to the eventual theory-question record only after the database model can persist its answer guide, mark scheme and marks.
