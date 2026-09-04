# Margin screen map

This is the parity checklist for the product handoffs, Figma board, and Android implementation.

| # | Screen | Primary outcome | Native route |
| --- | --- | --- | --- |
| 01 | Welcome | Explain the promise and start | `Welcome` |
| 02 | Normal-week checklist | Produce `ticked_items[]` | `RoutineChecklist` |
| 03 | Hours per item | Produce weekly hours and total | `RoutineHours` |
| 04 | Feel questions | Set personal limits and recovery target | `FeelQuestions` |
| 05 | Commitment chooser | Import, add one at a time, or skip | `SetupChoice` |
| 06 | Import timetable | Reconcile fixed class hours visibly | `ImportTimetable` |
| 07 | Add during setup | Add one named commitment | `AddOnboarding` |
| 08 | Anything else? | Add/flag only; never overwrite baseline | `AnythingElse` |
| 09 | Today | See total and four-dimensional load | `Home` |
| 10 | Add commitment | Add or edit a confirmed commitment | `Add` |
| 11 | Plan | Review, expand, edit, and remove commitments | `See` |
| 12 | 5D rebalance | Edit and apply recommendations | `FiveD` |
| 13 | Test commitment | Define a hypothetical commitment | `TestCommitment` |
| 14 | What-if result | Compare Now vs If Yes | `Simulator` |
| 15 | Check-in | Log stress, causes, and an optional note | `CheckIn` |
| 16 | Recovery | Choose a concrete recovery action | `Recovery` |
| 17 | Rebalanced week | Confirm capacity and applied changes | `RebalancedWeek` |

## Persistent navigation

- **Today** → `Home`
- **Plan** → `See`
- **Check-in** → `CheckIn`
- **Recover** → `Recovery`

Add, 5D, simulator, onboarding, and confirmation screens are focused tasks and do not repeat the navigation bar.
