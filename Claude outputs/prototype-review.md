# Prototype review — Santai frontend

**Date:** 12 Sep 2026 · **Reviewed:** `app/src/` — 4 screen files, component library, tokens, models, app flow
**Nothing was changed.** This is comment and suggestion only.

---

## Overall

This is a real app, not a mockup. The component library is disciplined, the token
system is clean, accessibility is genuinely handled (48dp targets everywhere, roles and
states on every interactive element, no text under 13px), and the load model in
`models/margin.ts` implements the weight table and feel-question skip logic exactly as
specified. That is better than most hackathon prototypes at this stage.

The problems are concentrated in three places: **hardcoded demo numbers that break
under questioning**, **an onboarding flow that is longer than it promises**, and
**drift from the current Santai spec**.

---

## 1. Demo-killers — fix these before anyone judges it

### 1.1 The rebalance override is discarded
`RebalanceScreens.tsx:21,34,44` — `assignments` state updates when a student taps a
different 5D bucket, but nothing reads it. `onApply` takes no arguments, and
`MarginApp.tsx:142` just navigates. **Every override the student makes is thrown away
on Apply.** The screen's own header says "Change any recommendation before applying."

### 1.2 Before/after numbers are string literals
`RebalanceScreens.tsx:57,63` — `112%` and `94%` are hardcoded. Flip every item from Do
to Drop and the projection does not move. Same problem in `SimulatorScreen:99-102`
(64/88, 112/138, 41/67, 58/72) — the test commitment's title, category and duration at
`TestCommitmentScreen:81-83` have zero effect on the result.

**This is the single most exposed defect in the codebase.** The what-if simulator is
your headline feature. A judge will change an input and watch the number stay still.

### 1.3 The rebalance screen contradicts itself
`RebalanceScreens.tsx:24` — title says *"Make room for Friday."*
`RebalanceScreens.tsx:68` — outcome says *"Projected outcome: Saturday opens up."*
One screen, two different days.

### 1.4 The 5th 5D option is probably unreachable
`RebalanceScreens.tsx:33` — the five buckets sit in a horizontal `ScrollView` with
`showsHorizontalScrollIndicator={false}`, no fade and no peek. On a 375pt phone roughly
3.5 pills fit. **"Decompress" is last and widest** — the recovery bucket, the one the
problem statement specifically asks for, is the one a student will never find. It is
also a horizontal scroller nested in a vertical one, which fights the gesture.

### 1.5 The 5D buckets are never explained
Nothing on the screen says what Delegate means versus Decompress. `item.reason`
explains why *this item* got *this* suggestion, but not what the bucket does. Your
signature framework ships unlabelled.

---

## 2. Onboarding — too long, and it says so itself

**9 to 11 full screens**, and `WelcomeScreen:66` promises *"Takes about two minutes."*

The worst offender is `RoutineHoursScreen`. `CompactStepper` is single-increment over
8 duration values and 7 frequency values, both defaulting to the lowest. A student with
15 hours of classes taps `+` nine times on that card alone. Select six routines and it
is **roughly 70 taps on one scrolling screen**. Select all eleven and it is ~130.

Fixes, cheapest first:

- **Replace the steppers with the pills you already have.** `ChoicePill` in a `wrapRow`
  turns 11 taps into 2. The component exists, it is used elsewhere, and the option
  lists are already defined as `durationOptions` and `frequencyOptions`.
- **Fix the progress numbering.** `OnboardingScreens.tsx:75,99` say "1 of 3" and
  "2 of 3", then `:148` restarts at "Personal limit 1 of 5". A student who thought they
  had one step left now sees five. That is a textbook drop-off trigger. Use one counter
  across the whole flow, and put `ProgressBar` on every step — right now it appears on
  exactly one screen.
- **Auto-advance the feel questions.** `:156` selects, `:168` advances. Five questions =
  ten taps for five decisions.
- **Disable the stepper at its boundary.** `stepperButton` has no `disabled` prop, so
  at "Under 30 min" the `−` still looks live and does nothing. That reads as broken.
- **Either shorten the flow or change the promise.** Two minutes is not achievable.

### One real bug
`RoutineHoursScreen:87` — the running total sums `entries[id] ?? {durationHours: 1,
timesPerWeek: 1}`, so it counts defaults the student never confirmed. The notice can
announce "6 h already committed" for hours nobody entered.

---

## 3. Drift from the current Santai spec

The built app matches the older Margin spec, not the checklist agreed on 12 Sep:

| Current spec | What is built |
|---|---|
| Tabs: Main · Plan · **+** · Recovery · Profile | Dashboard · Plan · Load · Recover — no "+", no Profile |
| Leaf score driven by load | Not present |
| Pet carrying the check-in notice | Not present; check-in is a modal with its own card |
| Flashcards | Not present |
| Weekly note editable each week | Captured once in onboarding, displayed read-only |
| 5D inside each commitment on Plan | 5D is its own separate screen |
| Name: Santai | Everything is still `Margin` — `MarginUI`, `MarginApp`, `margin.ts`, `margin-app` |

None of this is wrong work — it is the previous spec, built well. But someone needs to
decide which one is real before more gets built on top of it.

---

## 4. Consistency — small, cheap, and worth 4% of the rubric

Visual consistency is a scored line. These all bypass the token system:

- `RebalanceScreens.tsx:57,121` — `"#FFB4A8"` hardcoded twice. Your danger-on-dark
  colour has no token.
- `OnboardingScreens.tsx:56` — `"#E9E6F8"` raw hex for the Social bar.
- `RebalanceScreens.tsx:141,143,146,151,154` — **two different white bases mixed in one
  file**: `rgba(255,255,255,0.2)` alongside `rgba(248,247,242,0.72)` and `0.7`.
- `OnboardingScreens.tsx:330` — welcome screen uses `paddingHorizontal: 24`. Every other
  screen uses 20. The first screen is inset differently from the whole app.
- `pressed` is defined three times — `MarginUI:320` as `{opacity, transform}`, and
  `OnboardingScreens:345` / `RebalanceScreens:164` as opacity only. **Press feedback
  changes depending on which component you touch.**
- Off-scale type with no token: fontSize 18, 46, 34, 26, 15 — the scale has 14 and 16,
  not 15.
- `OnboardingScreens.tsx:346` — `importPanel` uses `height: 178`, not `minHeight`. The
  two-line error state will clip at large accessibility text sizes.

### Name the core concept once
"Personal limit" (`:148`), "your personal limits" (`:115`), "boundary" (`:169`),
"capacity" (`capacityMeta`) — four names for the one mechanic the whole product rests
on. Pick one and use it in code, copy and pitch.

---

## 5. Accessibility — strong, with four specific gaps

Credit first: 48dp targets throughout, correct roles and states on shared components,
nothing under 13px, and the error state uses text rather than colour alone.

The gaps:

1. **No `radiogroup` wrappers.** `OnboardingScreens:155-157,163-165` and
   `RebalanceScreens:33-35` put radio pills in a plain `View`. A screen reader loses
   group membership and the "2 of 4" position. This is the most-used interaction in the
   whole app.
2. **`RebalanceScreens:33-35` — pills have no context.** Each announces only
   *"Delay, radio, selected"* with no link to the commitment name. Five identical pill
   sets, no way to tell them apart. Needs
   `accessibilityLabel={`${item.name}: ${choice}`}`.
3. **Colour-only danger signalling, three places.** `RebalanceScreens:57,121` — the
   over-limit 138% row is distinguished from safe rows *only* by colour, and its
   accessibility label says "Mental changes from 112 percent to 138 percent" without
   ever saying it exceeds the limit.
4. **`OnboardingScreens:52-61`** — the T/M/P/S sculpture has a good parent label, but
   the four child letters stay individually focusable, so the reader announces the group
   and then four meaningless letters. Add `accessible={true}` to the parent.

---

## 6. Copy — keep these, rewrite those

**Keep, verbatim:**
- `"Know the cost before you say yes."` (`Onboarding:49`)
- `"Choose what usually takes your time—not only what is busy right now."` (`:75`) — pre-empts the exact wrong answer.
- `"Nothing is added without review."` (`:193`)
- `"Testing · not added"` (`Rebalance:95`) — the best piece of state communication in the app. Impossible to misread the simulator as having committed something.

**Rewrite:**
- `Onboarding:148` — *"…gave you 5 short questions. One question appears per page."* The app narrating its own internals, repeated identically on every page, and announcing up front that five screens are coming. That is an invitation to quit.
- `Onboarding:317` — *"never changes your structured answers."* "Structured answers" is developer vocabulary.
- `Onboarding:123-125` — three inconsistent scales: *"Fine—manageable"*, *"Fine"*, *"Fine either way"*. And the mental scale mixes recovery time (*"Drained, but okay tomorrow"*) with intensity (*"Completely done"*). Students cannot rank those against each other.
- `Onboarding:192` — *"Show my baseline for now"* implies a temporary peek. It permanently advances the flow.

---

## 7. Two dead affordances

- **`AnythingElseScreen:320`** says *"One addition to review — Sunday family duty · 2 hours suggested"* with no accept or reject control. It says "review" and gives nothing to review with. The text is also hardcoded regardless of what was typed.
- **`RebalanceScreens:39-43`** — the "DECOMPRESS IDEAS" card lists two suggestions with no action attached. Cannot be scheduled, accepted or dismissed. It reads as a screenshot, not a feature.

---

## Priority order

1. Make the rebalance override actually apply, and derive the before/after numbers from state *(1.1, 1.2)*
2. Fix the Friday/Saturday contradiction *(1.3)*
3. Make Decompress reachable — wrap the pills instead of scrolling them *(1.4)*
4. Replace the hour steppers with pills *(§2)*
5. One continuous progress counter *(§2)*
6. Decide Margin vs Santai and settle the tab bar *(§3)*
7. Tokens, `pressed`, and the padding inconsistency *(§4)*
8. Radiogroup wrappers and the pill labels *(§5)*
