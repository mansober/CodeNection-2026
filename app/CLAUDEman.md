@AGENTS.md

# Santai — project context

A capacity-aware commitment planner for university students who take on a lot
(clubs, competitions, volunteering). It shows load across four dimensions, lets a
student simulate a new commitment before accepting it, and pushes them toward recovery.

Built for CodeNection 2026, "Stress & Workload Manager" track.

**The app was renamed from Margin to Santai.** Code still uses `Margin` throughout
(`MarginUI`, `MarginApp`, `models/margin.ts`, package name `margin-app`). Do not rename
files unless asked — but use "Santai" in any user-facing copy.

## Stack

Expo 57 + React Native 0.86 + TypeScript, expo-router. One source tree runs Android,
iOS and web. Backend is FastAPI + PostgreSQL in `backend/`, run via `compose.yaml`.

```
app/src/
  app/                 expo-router entry points
  components/          MarginUI.tsx (shared components), MarginIcon.tsx
  features/margin/     MarginApp.tsx — all navigation state lives here
  models/margin.ts     load model, weights, sample data, types
  screens/             Onboarding, Planning, Rebalance, Recovery + screenStyles.ts
  theme/tokens.ts      colors, fonts, type scale, layout
```

Check with `npm run check` (typecheck + lint) before finishing any change.

## The load model — do not break this

Four dimensions: **time, mental, physical, social**. Never collapse them into one
number that replaces the four. A composite ("Overall load") may be shown *next to*
them, never instead of them.

Onboarding collects load in three steps, and the split matters:

1. **Tick** what is in the student's normal week (11 items in `routineCatalog`)
2. **Hours** per ticked item — duration × times per week
3. **Feel** — how heavily that sits on them

Hours give the objective amount. Feel sets the personal limit. Two students with
identical timetables must get different limits — that is the whole point, and it is
grounded in cognitive-load research (objective task complexity vs subjective
difficulty are separate constructs).

```
baseline_load_d = Σ (weekly_hours × weight[item][d])     // weights in routineCatalog
limit_d         = baseline_load_d ÷ utilisation_d        // utilisation from the feel answer
load_d%         = (baseline_d + commitments_d) ÷ limit_d × 100
```

Utilisation by feel answer: 0.55 / 0.70 / 0.90 / 1.05. A student who says "completely
done" has a routine already above their ceiling and should see >100% on day one. That
is correct behaviour, not a bug.

A **feel question is only asked if a ticked item loads that dimension** (weight ≥ 0.4).
Never ask someone who ticked only classes and study how their body feels after a
physically heavy week. See `requiredFeelKinds` in `models/margin.ts`.

## Rules that must not be broken

- **Never call it a "burnout score."** Use "Overall load" or "Load Index". Every
  validated burnout instrument keeps its dimensions separate on purpose, and the WHO
  does not classify burnout as a medical condition. This is a planning tool.
- **The AI suggests, the student decides.** Every 5D bucket, every recovery suggestion,
  every parsed input is overridable. Recovery research is clear that autonomy is the
  active ingredient — chosen solitude helps, assigned solitude does not.
- **Never suggest a recovery that raises an already-full dimension.** Exercise recovers
  mental load but *adds* physical load. Seeing friends recovers mental but *costs*
  social. If Time is over, no recovery activity helps at all — that is a Drop/Delay
  problem.
- **Sleep and exercise are capacity inputs, not recovery suggestions.** Do not tell an
  overloaded student to sleep more tonight; by then the damage is done.
- **The pet and leaf score must never punish absence.** The leaf reflects load, not app
  usage. A student who disappears for a week at a competition must not return to a dying
  plant.

## Design system

Use `theme/tokens.ts` for every colour, font size, radius and spacing value. Use the
components in `MarginUI.tsx` rather than building new ones. Known violations to avoid
repeating: hardcoded hex (`#FFB4A8`, `#E9E6F8`), mixed white bases in one file,
`paddingHorizontal: 24` on the welcome screen where everything else uses 20, and three
different definitions of `pressed`.

Accessibility is a scored criterion and is currently strong — keep it that way:
48dp minimum touch targets, `accessibilityRole` and `accessibilityState` on every
interactive element, no text under 13px, and never signal danger with colour alone.

## Known defects (as of 12 Sep)

- `RebalanceScreens.tsx` — 5D overrides are write-only; `assignments` state is never
  read, and `onApply` takes no arguments. Every student override is discarded.
- `RebalanceScreens.tsx:57,63` and `SimulatorScreens:99-102` — before/after percentages
  are hardcoded string literals and do not respond to input.
- `RebalanceScreens.tsx:24` vs `:68` — screen says "Make room for Friday" then
  "Saturday opens up".
- `RebalanceScreens.tsx:33` — five 5D pills in a horizontal scroller with the indicator
  off; "Decompress" is last and effectively undiscoverable on a phone.
- `OnboardingScreens.tsx:87` — the hours total counts unconfirmed defaults.
- Onboarding is 9–11 screens and ~70 taps, while the welcome screen promises "about two
  minutes".

## Current spec vs what is built

The built app matches an earlier spec. The current one has: tabs
**Main · Plan · + · Recovery · Profile**, a leaf score driven by load, a pet that
carries the daily check-in notice, flashcards generated from uploaded learning
materials, and 5D inside each commitment on the Plan page rather than as its own
screen. Confirm which spec applies before building on top of either.
