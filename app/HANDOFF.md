# Santai app handoff

Updated 13 September 2026. This describes the active frontend flow on `codex/fullstack-integration`.

## Product summary

Santai is a personal workload planner that compares a user's normal weekly routine, personal limits, dated commitments, and daily check-ins. It produces daily/weekly load views, planning adjustments, and recovery suggestions.

The core setup model is:

1. **Normal week** — recurring activities, time per active day, days per week, and usual demand.
2. **Your limits** — behavioral answers for relevant capacity dimensions and preferred weekly recovery room.
3. **What's coming up** — optional timetable, deadlines, shifts, events, and other dated commitments.

## Primary user flows

### First-time setup

`Welcome → Select normal-week activities → Estimate weekly demand → Personal-limit questions → Recovery-room question → Baseline ready`

From **Baseline ready**, the user can independently:

- import a timetable and return;
- add one or more commitments and return; or
- select **Start with my baseline** to enter Dashboard.

Selecting **Start with my baseline** sets `registeredOn`. A returning user with this value opens directly on Dashboard.

### Daily use

`Dashboard → Check-in prompt → Daily Check-in → Save` or `Save & open Plan`

Check-in becomes available the day after initial registration. It records stress, planned assignment percentages, and today's sport override where relevant. It does not track elapsed study minutes.

### Planning

`Dashboard or bottom navigation → Plan → Choose day/week → Open item → Keep / Move / Ask for help / Skip / Make lighter`

Editing details updates the full commitment or repeating series. Planning actions affect the selected occurrence. Unscheduled commitments remain visible in weekly Plan but do not add dated load until scheduled.

The Dashboard's **Test a new commitment** flow previews before/after capacity and saves nothing until confirmation.

### Academic setup

`Add menu → Import schedule → Import timetable → Your timetable`

`Add menu → Add assignment → Modules & assignments`

**Your timetable** and **Modules & assignments** link to each other while preserving the original return destination. Modules can be added manually, renamed, removed, assigned dates, and linked to learning materials.

### Recovery

`Recovery tab → Select upcoming day → Review recommendation → Open that day in Plan`

Today's recommendation can be marked complete or undone, followed by an optional Better / About the same / Still drained reflection. Suggestions are filtered against the currently most constrained capacity.

## Active page inventory

| Page | Purpose and main actions |
|---|---|
| Welcome | Brand entry, setup roadmap, and first-time CTA. |
| Normal-week selection | Multi-select recurring activities grouped into Study & work, Activities, and Life. |
| Weekly estimate | Per-activity duration, weekly frequency, demand level, and live weekly total. |
| Personal limits | One behavioral question at a time with local progress. |
| Recovery room | Final setup question using concrete weekly hour choices. |
| Baseline ready / What's coming up | Confirms setup, summarizes the baseline, and offers optional next actions. |
| Dashboard | Daily/weekly capacity summary, energy leaf, weekly note, flashcards, planning actions, and check-in entry. |
| Plan | Daily or weekly commitments, assignment work, unscheduled items, date navigation, and occurrence actions. |
| Recovery | Seven-day recovery overview, selected-day recommendation, explanation, completion, and reflection. |
| Profile | Mascot/streak summary, plan counts, baseline details, personal-limit answers, and baseline editing. |
| Add Commitment | Category, schedule, duration, and overall-effort form used by onboarding and the main app. |
| Commitment preview | What-if comparison followed by confirm, decline, or open Plan. |
| Import timetable | ICS import plus manual module fallback. |
| Your timetable | Weekly class/fixed-session view with links to import and module management. |
| Modules & assignments | Module CRUD, one assignment per module, dates, and learning-material entry. |
| Flashcards | Material upload, module/topic grouping, card review, and material removal. |
| Daily Check-in | Full-screen overlay for today's stress, study intention, sport state, and optional note. |
| Weekly note | Edits the short context shown on Dashboard. |

The old `anything-else` and `preparing` states remain in the router but are bypassed by the current first-time flow. `rebalance` and `rebalanced` remain in the screen type but have no active page branch.

## Main navigation

The persistent bottom bar contains **Dashboard**, **Plan**, **Add**, **Recovery**, and **Profile**.

The center **Add** sheet provides:

- Add commitment
- Add assignment
- Import schedule
- Add learning material
- Update weekly note

Secondary pages store their entry page and return there on Back. Hardware Back closes the check-in first, steps backward through personal-limit questions, or returns from a secondary page to its recorded origin.

## State and calculations

- `MarginApp.tsx` owns the active route and canonical `PlannerState`.
- State contains routines, limit answers, recovery choice, commitments, modules, materials, check-ins, recovery results, occurrence overrides, registration date, and weekly note.
- Every state change is persisted under `margin-planner-v2`: browser `localStorage` on web and a JSON document file on native.
- `models/margin.ts` defines baseline categories, answer selection, and shared domain types.
- `models/planner.ts` expands routines/commitments into days, calculates capacity use, ranks recovery options, parses ICS data, and extracts text flashcards.
- Baseline editing from Profile reuses setup forms but returns directly to Profile instead of showing first-time completion again.

## Code map

- `src/features/margin/MarginApp.tsx` — state, derived plan data, navigation, and screen composition.
- `src/screens/OnboardingScreens.tsx` — onboarding, baseline completion, commitment form, and weekly note.
- `src/screens/CurrentPlanningScreens.tsx` — Dashboard, Plan, occurrence actions, and Recovery.
- `src/screens/SecondaryScreens.tsx` — timetable, modules/assignments, and Profile.
- `src/screens/CurrentCheckIn.tsx` — daily check-in overlay.
- `src/screens/TimetableScreen.tsx` — timetable import/review.
- `src/screens/FlashcardScreen.tsx` — materials and flashcards.
- `src/screens/WhatIfScreens.tsx` — commitment preview flow.
- `src/components/MarginUI.tsx` and `src/theme/tokens.ts` — shared controls and visual tokens.

## Current boundaries

- The FastAPI backend is present in `../backend`, but the frontend is not connected to it yet. The running app remains device-local with no accounts or cloud sync.
- Timetable import supports ICS locally. Image timetable OCR is not connected.
- Text-based materials can generate cards; automatic extraction from PDF/PowerPoint is not connected in the frontend.
- Assignment check-ins store intended progress percentage, not completion or elapsed study time.
- Unfinished onboarding values persist, but the exact in-progress screen does not; reopening before completion returns to Welcome with saved values still populated.

For installation and verification commands, use `README.md`. For the backend contract and startup instructions, use `../backend/README.md`.
