# Margin Android prototype

Margin helps involved university students see the cost of a commitment before saying yes. This native Android prototype is built with Kotlin and Jetpack Compose.

For the complete implementation summary, screenshots, verification results, and judging flow, see [MARGIN_MVP_HANDOFF.md](MARGIN_MVP_HANDOFF.md).

## MVP screens

1. Get started
2. Setup method chooser
3. Import timetable
4. Add a commitment during onboarding
5. Describe a week in natural language
6. Check personal limits
7. Home
8. Add
9. See
10. 5D rebalance
11. Test a commitment
12. What-if simulator

Only Home, Add, See, and 5D use the persistent bottom navigation.

## Run

Open this `android-app` folder in Android Studio and run the `app` configuration on an Android emulator or device.

From PowerShell:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
.\gradlew.bat assembleDebug
```

The debug APK is generated at `app/build/outputs/apk/debug/app-debug.apk`.

## Suggested judging demo

1. Choose **Add one by one** and review the four personal limits.
2. On Home, point out the 81 Load Index and mental load at 112%.
3. Open **5D rebalance**, reassign one suggestion, and apply the plan.
4. Choose **Test another commitment** and test the Weekend Hackathon.
5. Compare Now vs If Yes, then choose **Add anyway**.
6. Confirm the hackathon now appears in **See**. It was absent while hypothetical.
7. Expand it, edit its load, save, then remove it to demonstrate that confirmed commitments use the same state as the rest of the week.

The visual and interaction rationale is documented in [DESIGN.md](DESIGN.md).
