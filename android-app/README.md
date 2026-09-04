# Margin Android MVP

Margin is a native Android prototype for the Lifestyle Track: Beating the Burnout.
It helps university students see the cost of a commitment before saying yes, then
make room for recovery when the week is overloaded.

## Open the correct project

Open this directory—not the repository root—in Android Studio:

```text
C:\Users\User\OneDrive\Documents\DEGREE\Projects\CodeNection-2026\android-app
```

Select the `app` run configuration and an Android emulator, then click **Run**.

PowerShell equivalent:

```powershell
cd 'C:\Users\User\OneDrive\Documents\DEGREE\Projects\CodeNection-2026\android-app'
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
.\gradlew.bat testDebugUnitTest lintDebug assembleDebug
```

The debug APK is generated at `app/build/outputs/apk/debug/app-debug.apk`.

## MVP screen map

1. Welcome
2. Normal-week checklist
3. Hours per selected routine item
4. Conditional feel questions and recovery target
5. Specific-commitment chooser
6. Timetable import
7. Add one commitment during onboarding
8. Optional “anything else?” note
9. Today dashboard
10. Add commitment
11. Plan / commitment list
12. 5D rebalance
13. Test a commitment
14. What-if simulator
15. Daily check-in
16. Recovery
17. Rebalanced-week confirmation

The persistent navigation is **Today**, **Plan**, **Check-in**, and **Recover**.
Task screens such as Add, 5D, the simulator, and confirmation use focused back or
completion actions instead of duplicating the tab bar.

## Product rules implemented

- The recurring routine and named commitments are collected separately.
- Classes / lectures starts selected; only selected activities receive hour rows.
- Mental and Time feel questions always appear. Physical and Social appear only when
  a selected activity has a weight of at least 0.4 in that dimension.
- Errands & chores load Time and Physical in the four-bar model.
- Timetable contradictions update the baseline visibly, retain both values, and can
  be undone.
- The optional free-text parser can add or flag information but never overwrite the
  structured baseline.
- Hypothetical commitments stay separate until explicitly confirmed.
- Primary touch targets are at least 48dp and status meaning is never color-only.

## Project structure

```text
app/src/main/java/com/codenection/breathe/
  Capacity.kt                 # Capacity and commitment model
  OnboardingModel.kt          # Routine weights, limits, and reconciliation rules
  MainActivity.kt
  ui/
    components/               # Shared controls and navigation
    navigation/               # App state and screen routing
    screens/
      onboarding/
      planning/
      rebalance/
      recovery/
    theme/                    # IBM Plex Sans, color, and type tokens
docs/
  DESIGN.md
  MARGIN_MVP_HANDOFF.md
  ONBOARDING_MODEL.md
  SCREEN_MAP.md
  licenses/
  screenshots/
```

## Design and handoff

- [Design rationale](docs/DESIGN.md)
- [Complete screen map](docs/SCREEN_MAP.md)
- [Onboarding model](docs/ONBOARDING_MODEL.md)
- [MVP handoff](docs/MARGIN_MVP_HANDOFF.md)
- [Editable design board](docs/design/margin-mobile-mvp.svg)
- [Verified emulator captures](docs/screenshots/final/)
