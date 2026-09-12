# Santai planning-pressure policy

Research review: 13 September 2026. Active policy: `planning-v1`.

## What the score is

Santai estimates whether a student's dated commitments fit within a personally
calibrated planning envelope.

Research supports the structure, not the numerical cutoffs. NASA-TLX establishes
that perceived workload can be multidimensional rather than time alone. The
student Study Demands–Resources literature associates demands such as workload
and time pressure with exhaustion and other outcomes. Neither source validates
Santai's four dimensions, default effort table, response anchors, 60%/85% load
bands, or 100-point energy presentation.

## Inputs

- A baseline routine: type, minutes per typical active day, days per week, and
  whether it usually feels light, typical, or demanding.
- Current capacity answers: perceived mental room and an interval for free
  time, plus physical/social questions when selected routines make them
  relevant. Omitted conditional answers use the frontend's neutral default.
- Dated commitments: schedule, duration, mental/physical/social effort (0–5),
  assignment/module relationships, and optional deadline.
- Daily check-in: stress (0–4), assignment intentions, and whether sport is
  planned today.
- A weekly recovery-time target.

All planning is based on local calendar dates. There is no time-of-day,
timezone conversion of commitments, or hourly collision detection.

`planned_percent` records the relative amount of progress the student intends
for an assignment. It cannot by itself produce minutes because Santai does not
know the assignment's total work size. The usual study block is divided between
today's assignment intentions in proportion to their percentages and marked as
estimated. If there is no usable study block, the day is incomplete instead of
treating progress percentage as a duration.

## Demand calculation

For an occurrence lasting `d` minutes with effort rating `e[k]` in dimension `k`:

```text
demand_time = d
demand_k = d × e[k] / 5        k ∈ {mental, physical, social}
daily_demand_k = Σ occurrence_demand_k, excluding skipped occurrences
```

The output unit for non-time dimensions is `effort_minutes`, a transparent
planning unit. Duration × perceived intensity is inspired by session-RPE,
which is validated for exercise load. Its extension to mental and social
planning is a product hypothesis that needs Santai-specific validation.

For baseline routines, the routine type selects a default profile; `light`,
`typical`, and `demanding` multiply defaults by 0.75, 1.0, and 1.25, capped at 5.
Specific commitments use the 0–5 effort values entered in the commitment form.

## Personal calibration

For baseline routine `j`, expected average daily minutes are:

```text
baseline_minutes_j = duration_j × days_per_week_j / 7
B[k] = Σ demand_k(baseline_minutes_j, effort_j)
```

Time capacity adds representative free minutes to baseline time:

```text
C[time] = B[time] + {15, 45, 90, 150}
```

Those representatives correspond to `under_30`, `30_to_60`, `60_to_120`, and
`over_120`. The open intervals use conservative representatives rather than
pretending to know exact availability.

For mental, physical and social capacity, the answer says what fraction of the
personal envelope the current baseline appears to consume:

```text
anchor = plenty: 0.60 | some: 0.80 | needs_break: 1.00 | exhausted: 1.20
C[k] = B[k] / anchor
```

Thus an `exhausted` response treats the baseline itself as already above the
planning envelope. A zero baseline demand leaves that dimension without a
numeric limit; it contributes 0% while its daily demand remains zero and makes
the result incomplete if later plans introduce demand in that dimension.

## Daily result

```text
utilization[k] = 100 × daily_demand[k] / C[k]
bottleneck = max(utilization[time], utilization[mental],
                 utilization[physical], utilization[social])
energy = clamp(0, 100,
               100 - mean(min(100, utilization[k]))
               + (10 if today's recovery is completed else 0))
```

The bottleneck is the displayed load because spare room in one dimension should
not hide another dimension under pressure. Energy averages the four capped
utilizations so one over-limit dimension cannot make the score negative by
itself. `energy_score` is returned only when all four utilizations and assignment
durations are known.

Product status bands are:

- `within_limits`: bottleneck below 60%;
- `moderate`: 60% through 84.99%;
- `high`: 85% through 100%;
- `over_limit`: above 100%;
- `uncalibrated`: one or more personal limits are unknown;
- `incomplete`: a planned assignment has no usable duration estimate.

An observed over-limit dimension takes precedence over incomplete calibration so
known overload is not hidden. The 60% and 85% boundaries are the product's
visible display bands, not research-derived cutoffs.

## Recovery and self-report guardrails

Weekly recovery room is available positive time capacity across the full week
minus the baseline recovery target. Completing today's recovery adds 10 to the
displayed energy score once for that date; it does not subtract workload or
change a capacity limit. Stress can select a gentler suggestion but does not
silently modify capacity.

This separation reflects that recovery includes qualitatively different
experiences—psychological detachment, relaxation, mastery and control—and that
subjective vitality is a self-reported experience, not interchangeable with
scheduled minutes. The exact 5/10-minute prompts are small product defaults, not
research-prescribed doses.

## Evidence and limits

- [NASA Task Load Index](https://www.nasa.gov/human-systems-integration-division/nasa-task-load-index-tlx/)
  supports multidimensional subjective workload assessment, but Santai is not a
  NASA-TLX implementation.
- [Foster et al. (2001)](https://pubmed.ncbi.nlm.nih.gov/11708692/) supports a
  duration × perceived-exertion structure for exercise; generalization beyond
  physical training remains unvalidated.
- [Lesener et al. (2020)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7400357/)
  found study demands associated with student burnout and study resources with
  engagement/burnout in a large cross-sectional sample, while explicitly noting
  that causal assumptions require longitudinal work.
- [Pförtner et al. (2021)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8112546/)
  reported a longitudinal relationship between student time pressure,
  exhaustion, and health-related productivity loss. It does not define daily
  safe-capacity cutoffs.
- [Sonnentag and Fritz (2007)](https://pubmed.ncbi.nlm.nih.gov/17638488/)
  validated four distinguishable recovery experiences in occupational samples.
- [Ryan and Frederick (1997)](https://onlinelibrary.wiley.com/doi/10.1111/j.1467-6494.1997.tb00326.x)
  supports subjective vitality as a self-reported well-being construct.
Before claiming predictive validity, collect opt-in outcomes, preregister the
analysis, test calibration and error by subgroup, validate repeated measures,
and obtain ethics/privacy review. Until then, tune constants only as a versioned
product policy and retain the old version for reproducibility.
