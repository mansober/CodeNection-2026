# Santai app

This directory is the complete Santai frontend. It uses Expo SDK 57, React Native, Expo Router, and TypeScript to serve Android, iOS, and web from the same codebase.

## Start here

```powershell
cd "C:\Users\User\OneDrive\Documents\DEGREE\Projects\CodeNection-2026\app"
npm install
npx expo start
```

Press `a` for Android or `w` for web. On a physical Android or iPhone, open Expo Go and scan the QR code. The iOS Simulator requires macOS.

Expo Go is only the fast development workflow. Santai is also configured as its own Android application with package ID `com.codenection.margin`. A standalone release embeds the JavaScript bundle and assets, so it runs without Expo Go and without a Metro server.

## Standalone Android app

Keep the repository as an Expo managed project. Generate the native Android project only when a local standalone build is needed:

```powershell
cd "C:\Users\User\OneDrive\Documents\DEGREE\Projects\CodeNection-2026\app"
npm ci
npx expo prebuild --platform android
cd android
.\gradlew.bat assembleRelease -PreactNativeArchitectures=x86_64
```

The APK is generated at `android/app/build/outputs/apk/release/app-release.apk`. Install that APK on an Android emulator or device to run Santai as an independent app. Use an architecture appropriate for the target device; `x86_64` is for the current Android Studio emulator.

On Windows, use JDK 17 for the native build. If the repository is inside OneDrive or another deeply nested directory and CMake reports a path-length error, build from a short temporary copy such as `C:\m`; this does not change the source-of-truth project structure.

## Quality checks

```powershell
npm run check
npm run export:web
```

`npm run check` performs TypeScript and Expo lint checks. The source is organised by responsibility under `src/`; platform artwork and DM Sans and Space Grotesk are under `assets/`.

## Key implementation rules

- `src/app/` contains only Expo Router entry points.
- `src/features/margin/SantaiApp.tsx` owns the locally persisted prototype flow and state.
- shared controls and the vector system live in `src/components/`.
- no operating-system emoticon glyphs are used for Check-in states.
- visible UI text is 13px or larger and primary touch targets are at least 48dp.
- hypothetical commitments are not saved until the user explicitly confirms them.
- the four persistent sections are Dashboard, Plan, Load, and Recover; daily Check-in is a focused popup rather than a duplicate navigation destination.
- timetable selection uses Expo DocumentPicker so the same import entry point works on Android, iOS, and web.

## Current prototype

See [PROTOTYPE.md](PROTOTYPE.md) for the full feature checklist, theme source, estimation rules and deferred integrations. App version 1.1.1 simplifies module setup and adds fixed date ranges, multiple weekdays, daily routines and editable unscheduled commitments. It retains package `com.codenection.margin` for in-place updates.

Run `node scripts/test-planner.cjs` for planner model regression checks.
