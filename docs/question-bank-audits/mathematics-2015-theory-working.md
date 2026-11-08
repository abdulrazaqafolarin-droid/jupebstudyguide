# JUPEB Mathematics 2015 — essay answer-check working

**Status:** Draft independent calculation check; not examiner-approved.  
**Companion audit:** [mathematics-2015.md](./mathematics-2015.md)  
**Primary source:** [Official JUPEB 2015 Mathematics paper](https://jupeb.edu.ng/past_questions/2015%20Mathematics.pdf)

This file records calculations by official paper question number without reproducing the full exam prompts. The official paper contains eight numbered essay questions. Each question carries 15 marks. Rutex currently has no 2015 Mathematics theory records.

## Q1 — sets and inclusion–exclusion

**(a) Symmetric difference**

Remove the three common elements from the union.

Result: `{-5, -4, -1, 1, 2, 5, 8}`.

**(b) Associativity of union**

For any element x, membership in A ∪ (B ∪ C) means x is in A, B or C. This is exactly the membership condition for (A ∪ B) ∪ C. Therefore the two sets are equal.

**(c) Three-set election calculation**

Interpret each pair total as an inclusive intersection and let t be the number who voted for all three parties. Since B-only is 40:

`200 = 40 + (80 − t) + (100 − t) + t`

So t = 20. A-and-B-but-not-C = 80 − 20 = **60**.

The total in the union is:

`190 + 200 + 250 − 80 − 60 − 100 + 20 = 420`

None = 500 − 420 = **80**.

**Check:** the arithmetic depends on interpreting the pairwise totals as inclusive intersections. Keep that assumption visible in the solution.

## Q2 — determinants, partial fractions and trigonometry

**(a)(i)–(ii)** The determinant of the source matrix is zero because its rows are linearly dependent. The matrix is singular and has no inverse.

**(a)(iii)** Partial fractions:

```text
(x³ − 1) / ((x + 3)(x + 1)²)
= 1 − 7/(x + 3) + 2/(x + 1) − 1/(x + 1)²
```

Expansion about x = 0, through x²:

```text
−1/3 + (7/9)x − (34/27)x² + O(x³)
```

**(b)** Rearranging the trigonometric identity gives:

```text
tan x = (cos α − sin β) / (sin α + cos β)
      = tan(π/4 − (α + β)/2)
```

The ratio is used when its denominator is nonzero. In the degenerate case where both numerator and denominator are zero, the original equality holds for every x, so no single value of tan x is determined.

**(c)** Since A is obtuse, cos A = −3/5. Since B is acute, sin B = 5/13.

```text
sin(A + B) = 33/65
tan(A − B) = −63/16
```

## Q3 — integration

**(a)** Use the reduction formula:

```text
I_n = sec^(n−2)(x) tan(x)/(n−1) + (n−2)I_(n−2)/(n−1)
I_2 = tan(x)
```

Applying it for n = 4 and n = 6, then evaluating at the source limits:

```text
integral from 0 to π/4 of sec⁶(x) dx = 28/15
```

**(b)** Area between y = x² and the x-axis from 0 to 2:

```text
integral from 0 to 2 of x² dx = [x³/3] from 0 to 2 = 8/3
```

Result: **8/3 square units**.

## Q4 — limits, Taylor series and numerical integration

**(a)** Rewrite:

```text
1/x − csc(x) = (sin(x) − x) / (x sin(x))
```

Since sin(x) = x − x³/6 + O(x⁵) as x approaches zero, the limit is **0**.

**(b)** Taylor expansion:

```text
ln(1 + x) = x − x²/2 + x³/3 − x⁴/4 + ...
```

At x = 0.1, the series gives ln(1.1) = 0.095310...; to four decimal places: **0.0953**.

**(c)** Composite trapezoidal rule with h = 0.4 and y = 1/(x + 1):

```text
T = h/2 × [y₀ + y₅ + 2(y₁ + y₂ + y₃ + y₄)]
  ≈ 0.6956349
```

Report **0.6956** to four decimal places. The exact integral is ln(2) ≈ 0.6931, a reasonableness check only; it is not the requested trapezoidal approximation.

## Q5 — rigid-body definitions and a uniform rod

Moment of inertia about an axis is the sum of each mass element multiplied by the square of its perpendicular distance from that axis: I = Σmr² (or the corresponding integral for a continuous body).

Radius of gyration k is defined by I = Mk², so k = sqrt(I/M).

For a uniform thin rod of length 2a, with **linear** mass density ρ, about an axis through one end and perpendicular to the rod:

```text
M = 2aρ
I = integral from 0 to 2a of ρx² dx = 8ρa³/3
k = sqrt(I/M) = 2a/sqrt(3)
```

**Unit/definition caution:** this assumes the source's ρ means mass per unit length.

## Q6 — Newton's law of cooling and vectors

**(a)** Newton's law of cooling states that the rate of change of a body's temperature is proportional to the difference between its temperature and ambient temperature, under the law's usual conditions:

```text
dT/dt = −k(T − T_s), where k > 0
```

**(b)** Ambient temperature is 15°C; the body starts at 100°C and is at 85°C after two minutes:

```text
T(t) = 15 + 85e^(−kt)
k = (1/2)ln(17/14) ≈ 0.0970780 per minute
T(4) = 15 + 85(14/17)² ≈ 72.6471°C
t at 40°C = 2ln(17/5) / ln(17/14) ≈ 12.6061 minutes
```

The final time is measured from the start of cooling.

**(c)** For the given vectors, a + b = (8, 9, −2), so |a + b| = **sqrt(149)**. For collinearity, c − a must be a scalar multiple of b − a. Comparing components gives **β = 9**.

## Q7 — grouped scores and descriptive statistics

Using class width five:

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

Using the class midpoints:

```text
Σfm = 3495
Σfm² = 248905
grouped mean = 69.9
population variance = 92.09
population standard deviation ≈ 9.5964
population CV = (9.5964 / 69.9) × 100% ≈ 13.73%
```

If the 50 students are treated as a sample, the sample standard deviation is approximately 9.6938 and the corresponding CV is approximately 13.87%.

**Source ambiguity:** the question does not say whether these 50 students are the whole population of interest or a sample from a larger population. The sample/population part cannot be answered uniquely without that context. The guide should show its assumption and, preferably, both standard-deviation conventions rather than claiming an unsupported single answer.

**Measures of location:** the mean is the arithmetic average; the median is the central ordered value (or the average of the two central values); the mode is the most frequent value or class.

## Q8 — correlation, random variables and binomial probability

**(a)(i) Pearson correlation**

For the five pairs: Σx = 15, Σy = 20, Σx² = 55, Σy² = 114, Σxy = 78.

```text
r = [5(78) − 15(20)] /
    sqrt([5(55) − 15²][5(114) − 20²])
  = 90/sqrt(8500)
  ≈ 0.9762
```

**(a)(ii) Spearman rank correlation**

The rank differences are −1, 2, 2, −2, −1, so Σd² = 14.

```text
r_s = 1 − 6(14) / [5(5² − 1)] = 0.30
```

**(b)** A discrete random variable takes distinct countable values. A continuous random variable can take any value within an interval in its model.

**(c)** For independent chip defects, X follows a binomial distribution with n = 8 and p = 0.05.

```text
P(X = 2) = C(8,2)(0.05)²(0.95)⁶ ≈ 0.0514564
P(X ≥ 2) = 1 − (0.95)⁸ − 8(0.05)(0.95)⁷
         ≈ 0.0572447
```

For 2,000 chips:

```text
expected number = np = 100
variance = np(1 − p) = 95
```

## Checks still required before this becomes an approved answer guide

- [ ] Independent second review of all algebra and numerical arithmetic.
- [ ] Confirm mark allocations and accepted working/rounding with an authorised marking scheme, if available.
- [ ] Confirm whether Q7 expects a population or sample standard deviation; retain the ambiguity until the context is known.
- [ ] Confirm the interpretation of pairwise voter totals in Q1(c).
- [ ] Verify all eight essay subparts, tables and any visual elements against the complete source PDF.
- [ ] Map each answer guide to its theory-question record only after the database model can persist answer guides, mark schemes and marks.
