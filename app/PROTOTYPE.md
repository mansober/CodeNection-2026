# Santai — prototype handoff

Updated 13 September 2026 (1.2.0). Expo SDK 57, React Native and TypeScript. Android, iOS and web share the same frontend in `app/`.

## Implemented flow

### Welcome and baseline

- Santai welcome screen; Classes and Assignments & study selected by default.
- Recurring activities use tickboxes, hours per active day, days per week, and Light / Typical / Demanding conditions.
- Personal-limit questions appear individually. Their wording refers to the normal-week baseline; free time is explicitly per day and social energy describes interaction.
- Question selection adapts to the chosen routines, followed by recovery-time preference.
- Import a timetable or add commitments manually, then save an optional weekly note.
- A short preparation screen assembles the local plan. No daily check-in is shown on the registration date.
- Prototype replay: every cold app launch or browser reload opens Welcome, including for returning users. Build my week revisits baseline with saved answers; the Continue saved plan button has been removed. Welcome uses a Rimbun-green background, the dashboard leaf and small animated leaves around a concise “Make room for what matters” message. Backgrounding alone does not reset an unfinished form. Saved commitments, modules, diary and streak are retained.

### Timetable and assignments

- ICS import reads module names and recurring weekdays; repeated module names are merged. Every detected or manually entered module can receive learning materials before the timetable is saved. Manual modules retain the baseline class estimate until a timetable supplies actual weekdays.
- Each module can have an assignment, with a start date and optional due date labelled “Set up later”.
- Save proceeds to Add Commitment, which includes a clear return action to the timetable. Schedule is also a dedicated page where users can view their week and import a replacement timetable.
- Selection cancellation, loading, invalid-file errors and manual fallback are handled.

### Add Commitment

- Categories: Competition, Club, Job, Sport, Social and Personal. Classes and assignments stay in module management, not duplicate categories in this form.
- Fixed: calendar start date, one day / 1 / 2 / 4 week range, and multiple weekdays. Set up later hides date questions and saves an unscheduled item.
- Flexible: no date questions; stays unscheduled until edited to Fixed in Plan or Schedule.
- Daily routine: repeats every day from creation, with no additional scheduling questions.
- Only assignments and optional competition submissions have deadlines. A deadline cannot precede the last planned session; other categories use attendance dates, not artificial due dates.
- One duration slider and one total-effort slider. Santai transparently estimates the capacity split from category and total effort instead of asking the user to rate every load dimension.
- All commitments, including Set up later items, expose Keep as planned / Move to another day / Ask someone to help / Skip this time / Make it lighter. Undated items stay excluded from dated load until a date is explicitly chosen.
- Unscheduled items are visible in Plan and Schedule, but do not inflate dated load estimates. Repeating sessions count once on each matching day. Rebalancing one occurrence does not change other days; Edit details changes the whole series and clears its old occurrence overrides.
- “Add & continue” and “Add & add another commitment” have distinct outcomes; editing has one Save action.

### Dashboard and menu

- Daily / Weekly switching is in the hamburger menu, together with Schedule and Assignments.
- Live capacity estimates for time, mental, physical and social appear as compact 2×2 signal cards with percentages and plain-language states, so colour is never the only indicator.
- A broad, curved single leaf with a curled tip matches the approved dashboard reference. Its gentle breeze animation respects reduced-motion settings. The single-stem energy visual sits directly on the  background above the cream dashboard sheet. Low energy makes the leaf smaller, dry amber and drooping; higher energy makes it larger, upright and green.
- The exact supplied cabbage-bunny mascot sheet is retained as the identity reference and cropped at runtime for the floating app pet. Tap the mascot for rotating motivational notes. When Check-in is due, a separate clickable note appears above it rather than consuming a dashboard card.
- The former daily reminder space now holds the user's weekly note.
- The flashcard entry is visually highlighted. Its add-material box uses a module dropdown and file upload; the redundant manual flashcard creation form is removed.
- The bottom navigation uses green grass over brown soil. Dashboard, Plan, Recover and Profile remain persistent; the central Add button reveals timetable, assignment, commitment, material and weekly-note actions in a bottom sheet.
- Direct actions to review/rebalance the real plan and preview a possible commitment.

### Daily check-in

- Five custom vector faces; assignment yes/no, module selection and planned progress percentage.
- Gym/training question appears only when selected in the baseline. Its answer replaces that day's routine assumption, not future days.
- Optional daily diary, without automatically creating commitments. The previous pressure-source section is removed.
- Save or Save & open Plan. Check-ins and consecutive-day streaks persist locally.

### Plan and profile

- Daily mode shows the selected day; Weekly shows all seven days. Date navigation and the Add label adapt to the mode.
- Separate Routine and Commitments & deadlines sections. Schedule and Assignment filters are accessible from the menu.
- Every item has Keep as planned, Move to another day, Ask someone to help, Skip this time and Make it lighter.
- Moving checks the due date; making it lighter reduces estimated duration/load; skipping removes counted load and can be undone. Asking for help records a reminder, not an actual message or confirmed handoff.
- Plan cards use category-aware colour accents and a compact daily load summary to strengthen scanning without relying on colour alone.
- The what-if form calculates before/after capacity using the chosen day and entered effort. Nothing is added until explicit confirmation.
- Profile replaces the old Load page and gathers mascot, streak, plan, baseline, capacity answers, weekly note and privacy status in one calm personal view.

### Recovery and flashcards

- Recovery days are sorted highest load first and safe options are ranked by the capacity that is most constrained. Mental overload can receive outside time, mastery hobbies, absorbing games, awe walks, micro-breaks, a written next-task plan, supportive conversation, sleep, a short alarmed nap or low-effort rest.
- Recovery guardrails prevent exercise suggestions when physical capacity is high and prevent social suggestions when social capacity is high. Time overload is explicitly treated as Drop / Delay / Delegate; only the five-minute written next-task plan remains as decompression. Low-load days preserve the free pocket instead of inventing a task.
- Completion/undo and Better / About the same / Still drained reflections persist.
- Bulk material upload starts with a module dropdown. The library keeps grouped, flippable cards and material removal, while TXT/MD/tab-separated text containing “term: explanation” still produces cards locally.

## Theme and identity

- Only the visual language from the supplied `rimbun--final.zip` is adapted:  backdrop, cream panels, spring-water/fern palette, -floor navigation and vector pool illustration.
- DM Sans for interface text; Space Grotesk for prominent numbers. No Rimbun navigation, automatic water-refill rules or completion-spending model is imported.
- Santai's original logo is an S-shaped resting river with leaves. SVG source: `assets/images/santai-mark.svg`; raster launcher, adaptive, monochrome, splash and favicon assets are generated from it.
- The Android package remains `com.codenection.margin` intentionally, so Santai updates the existing installation rather than installing a second app. Existing storage keys and internal Margin component names are also retained for compatibility.

## Prototype boundaries — not production claims

- All new planner state is local to this device/browser; these flows are not connected to the repository's backend, cloud sync, accounts or external calendars.
- Capacity and energy are transparent planning heuristics, not medical measurements. Energy is derived from planned demand and check-in, with one reversible +10 reward for completing today's recovery; it is not spendable money.
- Without imported module weekdays, recurring activities are provisionally placed from Monday for the chosen number of days. ICS uses module weekdays but not exact session times or semester end dates.
- Assignment percentage describes intended work, not verified completion. Daily study time is divided between selected assignments.
- Image timetable OCR is not connected; images lead to honest manual review/entry. ICS import works locally.
- PDF/PowerPoint materials can be uploaded, but automatic card generation from them is not connected. Browser uploads retain metadata and extracted text cards, not a durable original-file backup.
- Weekly-note AI extraction, duplicate detection and contradiction checking remain KIV as requested. Diary text is not sent to an AI service.
- Recovery, energy and the mascot do not add Mini You, Circle or Album features.

## Verification

- `npm run check`: TypeScript and lint.
- `node scripts/test-planner.cjs`: date boundaries, ICS merging, routine placement, same-day sport override, load weighting, recovery guardrails and flashcard extraction.
- Mobile-width browser flow: baseline defaults, import, assignment setup, add-another, first-day suppression, menu filtering, skip/restore, hypothetical-before-confirmation, bulk cards, persistence, next-day check-in, streak and recovery reflection.
- Android standalone build/install is checked separately. iOS has shared-source support but has not been built or tested on this Windows machine.
