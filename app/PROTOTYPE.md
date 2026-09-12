# Santai — prototype handoff

Updated 12 September 2026 (1.1.4). Expo SDK 57, React Native and TypeScript. Android, iOS and web share the same frontend in `app/`.

## Implemented flow

### Welcome and baseline

- Santai welcome screen; Classes and Assignments & study selected by default.
- Recurring activities use tickboxes, hours per active day, days per week, and Light / Typical / Demanding conditions.
- Personal-limit questions appear individually. Their wording refers to the normal-week baseline; free time is explicitly per day and social energy describes interaction.
- Question selection adapts to the chosen routines, followed by recovery-time preference.
- Import a timetable or add commitments manually, then save an optional weekly note.
- A short preparation screen assembles the local plan. No daily check-in is shown on the registration date.
- Prototype replay: every cold app launch or browser reload opens Welcome, including for returning users. Build my week revisits baseline with saved answers; the Continue saved plan button has been removed. Welcome uses a plain Rimbun-green background with a centred leaf, Santai name and message, retaining the Build my week button below. Backgrounding alone does not reset an unfinished form. Saved commitments, modules, diary and streak are retained.

### Timetable and assignments

- ICS import reads module names and recurring weekdays; repeated module names are merged. Module setup only asks for names and assignments, not class days. Manual modules retain the baseline class estimate until a timetable supplies actual weekdays.
- Each module can have an assignment, with a start date and optional due date labelled “Set up later”.
- Save proceeds to Add Commitment. Additional modules can be entered manually.
- Selection cancellation, loading, invalid-file errors and manual fallback are handled.

### Add Commitment

- Categories: Competition, Club, Job, Sport, Social and Personal. Classes and assignments stay in module management, not duplicate categories in this form.
- Fixed: calendar start date, one day / 1 / 2 / 4 week range, and multiple weekdays. Set up later hides date questions and saves an unscheduled item.
- Flexible: no date questions; stays unscheduled until edited to Fixed in Plan or Schedule.
- Daily routine: repeats every day from creation, with no additional scheduling questions.
- Only assignments and optional competition submissions have deadlines. A deadline cannot precede the last planned session; other categories use attendance dates, not artificial due dates.
- Duration and effort sliders with an understandable social-load explanation.
- All commitments, including Set up later items, expose Keep as planned / Move to another day / Ask someone to help / Skip this time / Make it lighter. Undated items stay excluded from dated load until a date is explicitly chosen.
- Unscheduled items are visible in Plan and Schedule, but do not inflate dated load estimates. Repeating sessions count once on each matching day. Rebalancing one occurrence does not change other days; Edit details changes the whole series and clears its old occurrence overrides.
- “Add & continue” and “Add & add another commitment” have distinct outcomes; editing has one Save action.

### Dashboard and menu

- Daily / Weekly switching is in the hamburger menu, together with Schedule and Assignments.
- Live capacity estimates for time, mental, physical and social; energy out of 100; check-in streak avatar.
- A broad, curved single leaf with a curled tip matches the approved dashboard reference. Its gentle breeze animation respects reduced-motion settings. Compact icon / label / bar / percentage rows display the four capacities. The single-stem energy visual sits directly on the forest background above the cream dashboard sheet. Low energy makes the leaf smaller, dry amber and drooping; higher energy makes it larger, upright and green. The numeric estimate and plain-language label remain visible; colour is not the only indicator. Rimbun greens and the forest-floor navigation are retained.
- An original leaf-shaped streak pet floats at the bottom-right above navigation on the four main pages. Drag to reposition within the screen above navigation; tap for a short streak message. With no active streak, the pet has angled eyebrows and a frown; an active streak restores its smile. Screen readers can move it left/right using accessibility actions. Gentle bobbing respects system reduced-motion settings; scroll padding keeps final actions reachable.
- A compact missing-check-in banner appears from the day after registration; a saved check-in can be updated.
- The flashcard banner displays today's module names from the timetable, with an upload entry point when the library is empty.
- Direct actions to review/rebalance the real plan and preview a possible commitment.

### Daily check-in

- Five custom vector faces; assignment yes/no, module selection and planned progress percentage.
- Gym/training question appears only when selected in the baseline. Its answer replaces that day's routine assumption, not future days.
- Optional daily diary, without automatically creating commitments. The previous pressure-source section is removed.
- Save or Save & open Plan. Check-ins and consecutive-day streaks persist locally.

### Plan and load

- Daily mode shows the selected day; Weekly shows all seven days. Date navigation and the Add label adapt to the mode.
- Separate Routine and Commitments & deadlines sections. Schedule and Assignment filters are accessible from the menu.
- Every item has Keep as planned, Move to another day, Ask someone to help, Skip this time and Make it lighter.
- Moving checks the due date; making it lighter reduces estimated duration/load; skipping removes counted load and can be undone. Asking for help records a reminder, not an actual message or confirmed handoff.
- The four-category pie/donut chart uses counted commitments, not repeated deadline reminders.
- The what-if form calculates before/after capacity using the chosen day and entered effort. Nothing is added until explicit confirmation.

### Recovery and flashcards

- Recovery days are sorted highest load first; suggestion type/intensity responds to estimated load. Only today's recovery can be completed; future days remain previews.
- Completion/undo and Better / About the same / Still drained reflections persist.
- Bulk material upload per module for a week or semester. Library grouping by module, day, topic or week; flip cards and remove materials.
- TXT/MD/tab-separated text containing “term: explanation” produces cards locally. Manual question/answer creation is available.

## Theme and identity

- Only the visual language from the supplied `rimbun-forest-final.zip` is adapted: forest backdrop, cream panels, spring-water/fern palette, forest-floor navigation and vector pool illustration.
- DM Sans for interface text; Space Grotesk for prominent numbers. No Rimbun navigation, automatic water-refill rules or completion-spending model is imported.
- Santai's original logo is an S-shaped resting river with leaves. SVG source: `assets/images/santai-mark.svg`; raster launcher, adaptive, monochrome, splash and favicon assets are generated from it.
- The Android package remains `com.codenection.margin` intentionally, so Santai updates the existing installation rather than installing a second app. Existing storage keys and internal Margin component names are also retained for compatibility.

## Prototype boundaries — not production claims

- All new planner state is local to this device/browser; these flows are not connected to the repository's backend, cloud sync, accounts or external calendars.
- Capacity and energy are transparent planning heuristics, not medical measurements. Energy is derived from planned demand and check-in, with one reversible +10 reward for completing today's recovery; it is not spendable money.
- Without imported module weekdays, recurring activities are provisionally placed from Monday for the chosen number of days. ICS uses module weekdays but not exact session times or semester end dates.
- Assignment percentage describes intended work, not verified completion. Daily study time is divided between selected assignments.
- Image timetable OCR is not connected; images lead to honest manual review/entry. ICS import works locally.
- PDF/PowerPoint materials can be uploaded, but automatic card generation from them is not connected; use manual cards. Browser uploads retain metadata and extracted cards, not a durable original-file backup.
- Weekly-note AI extraction, duplicate detection and contradiction checking remain KIV as requested. Diary text is not sent to an AI service.
- Recovery, energy and the avatar do not add Mini You, Circle or Album features.

## Verification

- `npm run check`: TypeScript and lint.
- `node scripts/test-planner.cjs`: date boundaries, ICS merging, routine placement, same-day sport override, load weighting and flashcard extraction.
- Mobile-width browser flow: baseline defaults, import, assignment setup, add-another, first-day suppression, menu filtering, skip/restore, hypothetical-before-confirmation, bulk cards, persistence, next-day check-in, streak and recovery reflection.
- Android standalone build/install is checked separately. iOS has shared-source support but has not been built or tested on this Windows machine.
