# Margin Android MVP handoff

**Platform:** Native Android · Kotlin · Jetpack Compose

**Branch:** `hadi`
**Track:** Lifestyle Track: Beating the Burnout

## What is implemented

- Seventeen-screen flow covering structured onboarding, dashboard, planning,
  check-in, recovery, rebalancing, commitment testing, and confirmation.
- Four capacity dimensions: Time, Mental, Physical, and Social.
- Routine-baseline model with the eleven activity weights supplied in the product handoff.
- One personal-limit question per page, with conditional Physical and Social pages based on a 0.4 weight threshold.
- Student-set utilisation, spare-time, and recovery calibration inputs.
- Two named-commitment paths after baseline: timetable import or one-at-a-time entry.
- Optional free text is additive-only and fully skippable.
- Import error/loading/success states plus visible, undoable timetable reconciliation.
- Editable 5D recommendations: Do, Delay, Delegate, Drop, and Decompress.
- Functional what-if simulator; hypothetical commitments remain separate until confirmed.
- Today / Plan / Check-in / Recover navigation and a rebalanced-week success state.
- Locally bundled IBM Plex Sans, accessible contrast, semantic labels, and 48dp+ primary controls.
- One canonical confirmed-commitment Add action in Plan, bounded vector tiles, and an equal-column Check-in scale with 11sp labels.

## Important files

- `app/src/main/java/com/codenection/breathe/OnboardingModel.kt` — weight table and calibration rules.
- `app/src/main/java/com/codenection/breathe/ui/navigation/MarginApp.kt` — complete route and state map.
- `app/src/main/java/com/codenection/breathe/ui/screens/` — screens grouped by journey.
- `app/src/main/java/com/codenection/breathe/ui/components/` — reusable controls and bottom navigation.
- `app/src/main/java/com/codenection/breathe/ui/theme/MarginTheme.kt` — visual tokens and bundled type.
- `docs/SCREEN_MAP.md` — product-to-design-to-code screen inventory.
- `docs/ONBOARDING_MODEL.md` — baseline inputs, calculations, and non-overwrite rules.

## Judging walkthrough

1. Build a baseline from the normal-week checklist.
2. Show that only selected activities receive hour controls.
3. Add Gym or sport and Club or society to demonstrate conditional Physical and Social questions.
4. Set personal feel and recovery answers, then choose **Skip for now — show my baseline**.
5. On Today, read the 90% capacity sanity check and four pressure bars.
6. Open **Rebalance this week**, change a recommendation, and apply it.
7. Return to Today and open Check-in, then Recover.
8. Test the Weekend Hackathon in the what-if simulator.
9. Confirm it is absent from Plan until **Add anyway** is selected.
10. Re-run onboarding's timetable path to show error, loading, visible correction, and undo.

## Build and run

Open this exact directory in Android Studio:

```text
C:\Users\User\OneDrive\Documents\DEGREE\Projects\CodeNection-2026\android-app
```

Or run:

```powershell
cd 'C:\Users\User\OneDrive\Documents\DEGREE\Projects\CodeNection-2026\android-app'
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
.\gradlew.bat testDebugUnitTest lintDebug assembleDebug
```

APK: `app/build/outputs/apk/debug/app-debug.apk`

## Verification evidence

- `docs/screenshots/final/` contains all seventeen route milestones, the adaptive Physical/Social/Time/Recovery subpages, and distinct import error, loading, and success captures.
- The emulator walkthrough covers both optional conditional questions and the Classes-only path where Physical and Social are absent.
- The what-if walkthrough confirms Weekend Hackathon is added to Plan only after **Add anyway**.
- Timetable reconciliation was checked at 10 → 18 class hours, including undo and restore.

## Product language

- Use **capacity**, **overall load**, or **load index**—never a diagnostic “burnout score.”
- Say the numeric defaults are calibrated starting points to tune with students, not clinically validated values.
- Describe recommendations as editable starting points.
- Keep baseline routine data separate from named commitments.
