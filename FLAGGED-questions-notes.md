# FLAGGED questions — noted for manual review

These 28 questions are **hidden** from students (`hidden = true`, content preserved
in the database). Each needs something only a human with the JUPEB source
papers/answer key can supply. To restore one: fix the stated problem, then set
`hidden = false` for its id in the `study_questions` table.

## Missing question stems (source text lost — need the original paper)
- `chemistry-2021-objective-019` — graph/activation-energy question, no options existed.
- `chemistry-2021-objective-023` — coordination number; compound name/formula missing (options 3/4/6/8, key B).
- `chemistry-2021-objective-034` — particle-size ordering; species missing entirely.
- `chemistry-2021-objective-038` — IUPAC name; chemical structure missing (options are pentynoic acids, key A).
- `chemistry-2021-objective-042` — isomer count; molecular formula missing (options 2/3/4/5, key C).
- `chemistry-2021-objective-045` — Co complex shape + oxidation number; complex ion missing (key C).
- `chemistry-2021-objective-047` — counter ions; compound formula missing (key B).
- `chemistry-2021-objective-050` — isomer count; molecular formula missing (key A).
- `bio-2021-objective-024` — glycolysis I/II/III statements missing (options reference them, key C).
- `chemistry-2024-objective-025` — only "2,3-dibromobutanoic acid" + 3 number options (one option label missing); stem unknown.
- `physics-2024-objective-049` — no question text at all ("question partially visible").
- `phy-2024-mq-a7adpz9d` — image link only, joke options; unusable.

## Mismatched stem/options (need the original paper to reconcile)
- `physics-2019-objective-036` — stem asks magnetic-field magnitude, options are named laws.
- `physics-2022-objective-003` — relation `V = m1m2s-2` garbled; P and Q undefined.

## Missing figures/diagrams
- `bio-2017-objective-002` — butterfly-pupa diagram (part II) missing; has full options + rich explanation.

## Duplicate of an answered twin (safe to leave hidden)
- `chemistry-2020-objective-050` — exact duplicate of answered `chemistry-2020-objective-049` (key D).

## Likely wrong exam keys (verify against official JUPEB key before restoring)
- `bio-2021-objective-010` — taxonomy "most individuals"; key D (species) is scientifically dubious (a class holds more individuals).
- `bio-2021-objective-037` — options B and D identical ("ATP and NADPH2").
- `bio-2022-objective-002` — options B and D identical ("pathogens").
- `bio-2022-objective-025` — both B (hydra) and D (Lumbricus) have hydrostatic skeletons.
- `bio-2023-objective-029` — key C (AGU) but rigorous complement of 5'-TCA-3' is 5'-UGA-3' (option D).
- `bio-2023-objective-044` — A, B and C all correctly describe a medusa (key C).
- `che-2018-obj-0010` — OF2 gives O = +2 (option A) but key says D (+1).
- `che-2018-obj-0046` — ethanol→ethanoic acid at 70% gives ≈2.19 g (option C), but key says D (3.29 g).
- `che-2018-obj-0048` — C6 vs C8 iodoalkanes are not strict homologues (differ by C2H4); key D dubious.
- `chemistry-2023-objective-026` — "2-nitro-4-dibromo-5-hydroxyhexanoic acid" is malformed IUPAC; chiral count unverifiable (key C = 2).
- `chemistry-2024-objective-030` — options are placeholders ("(structure A)", "boiling points", "acidity").
- `physics-2020-objective-021` — correct physics gives ≈4.74 N (option C) but key says A (7.84 N).
- `physics-2021-objective-030` — 200Ω→120Ω needs 300Ω parallel, which is not among the options (key C = 240Ω→109Ω is wrong).
- `physics-2024-objective-045` — vehicle mass missing, so key B unverifiable.

## Fixed in this pass (visible again, no action needed)

- `chemistry-2021-objective-048` — stem rebuilt ("product of secondary-alcohol oxidation?", key D kept).
- `bio-2016-objective-006`, `bio-2021-objective-009`, `bio-2023-objective-040`,
  `che-2018-obj-0006/0014/0015/0016/0018/0022/0023/0029/0043`,
  `physics-2020-objective-016` (also fixed stem unit S→A) — explanations rewritten,
  "FLAGGED:" notes removed.

## Round 2 — wrong keys corrected (verified by hand computation)

- `mat-2017-mq-0032` → B (was C), `mat-2019-mq-0006` → B (was A),
  `mat-2019-mq-0015` → C (was A), `mat-2020-mq-0007` → B (was A),
  `mat-2020-mq-0012` → C (was A), `mat-2020-mq-0016` → D (was A),
  `mat-2020-mq-0021` → C (was A), `mat-2020-mq-0042` → D (was A),
  `mat-2022-obj-0014` → A (was C), `mat-2023-mq-0004` → D (was A),
  `mat-2023-mq-0010` → A (was C), `mat-2023-mq-0021` → C (was B),
  `physics-2014-objective-008` → A (was B), `physics-2014-objective-010` → D (was C),
  `physics-2015-objective-007/029/033/040` → A (were B), `physics-2015-objective-047` → D (was A),
  `physics-2015-objective-048` → C (was B), `physics-2018-objective-015` → B (was D),
  `physics-2023-objective-006` → C (was D).
  (Explanations rewritten to show the correct working.)

## Round 2 — hidden, unresolvable (stems/options/keys inconsistent)

- `mat-2016-mq-0003`, `mat-2017-mq-0002`, `mat-2019-mq-0029`, `mat-2019-mq-0039`,
  `mat-2021-mq-0005`, `mat-2021-mq-0032`, `mat-2023-mq-0020`,
  `physics-2016-objective-003/019/037`, `physics-2022-objective-045`,
  `chemistry-2022-objective-040`, `physics-2014-objective-040`, `che-2017-q0040`.
- 31 rows where the keyed answer text appears twice verbatim (unfair grading):
  bio 2017-012, 2021-043; che 2018-0017, 2019-0006; mat 2018-0037, 2019-0009/0014/0018/0030/0032/0034/0038/0042,
  2020-0004/0006, 2021-0017/0019, 2022-0017/0029, 2023-0027/0029/0039;
  physics 2014-037, 2015-045, 2016-005/017/026/041, 2020-007, 2023-033, 2024-006.
- Coverage for every hidden row above was replaced with a newly authored,
  hand-verified question (ids ending `-r01…`); the hidden originals are preserved.

## Round 3 — full-bank meaning/key/explanation audit

- `che-2017-q0036` — explanation rewritten (was about sand filtration).
- Newly hidden: `chemistry-2014-objective-050` (no option lists the true
  increasing order), `chemistry-2021-objective-036` (A and C both propagate),
  `che-2017-q0050` (invalid formula + mismatched explanation).
- 22 more wrong keys corrected by hand computation (see git-less DB log).
- 31 rows hidden where the keyed text appeared twice verbatim; each gap
  refilled with an authored, verified replacement (`-r10…` ids).

- `che-2017-q0036` — stem/options/key were fine; explanation was about sand
  filtration (wrong question). Rewrote it for diammineplatinum(II).
- `mat-2018-mq-0012` — polished a `(missing)` placeholder option into a real
  distractor; key D verified by computation.
- Newly hidden (wrong key or no valid option): `chemistry-2014-objective-050`
  (no option lists the true increasing order), `chemistry-2022-objective-040`
  (corrupted twin of answered -046), `physics-2014-objective-040`
  (declination options on a field-intensity stem; twin -041 is good),
  `che-2017-q0040` (iron-ore stem with hydrogenation options).
- Random 10-question hand sample: all keys and explanations correct.
