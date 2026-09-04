# Onboarding baseline model

The onboarding flow intentionally stores two kinds of information separately:

1. A recurring routine, collected through activity selection, hours, and felt difficulty.
2. Specific named commitments, collected through timetable import or manual entry.

## Routine inputs

Classes / lectures starts selected. The catalogue contains eleven fixed items, including Errands & chores. A selected item receives a duration and weekly frequency; unselected items never produce hidden hours.

Each weekly hour is multiplied by the activity's Time, Mental, Physical, and Social weights in `OnboardingModel.kt`. Time is 1.0 for every item. Errands & chores uses `1.0 / 0.3 / 0.5 / 0.1`, which accounts for errands in the four-bar model without inventing a fifth dashboard dimension.

## Conditional feel questions

Mental and Time are always asked. Physical and Social are asked only when at least one selected activity has a weight of 0.4 or more in that dimension. A skipped dimension receives a neutral default in the downstream engine.

The four subjective options map to utilisation values `0.55 / 0.70 / 0.90 / 1.05`. Time uses spare-hour choices `2 / 5 / 11 / 18`. Weekly unplanned recovery uses `3 / 5 / 9 / 14` hours.

These values are calibrated team defaults. They should be tuned against real student weeks and must not be described as validated clinical thresholds.

## Reconciliation rules

- When timetable data contradicts class hours, imported hours win visibly.
- Both original and imported values remain in state so the change can be explained and undone.
- The two hour values are never added together.
- Optional free text may suggest additions or flag conflicts; it cannot overwrite checklist, hours, feel, or recovery answers.
- Every onboarding answer must remain editable after setup.
