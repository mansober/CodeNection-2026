# Margin app

This directory is the complete Margin frontend. It uses Expo SDK 57, React Native, Expo Router, and TypeScript to serve Android, iOS, and web from the same codebase.

## Start here

```powershell
cd "C:\Users\User\OneDrive\Documents\DEGREE\Projects\CodeNection-2026\app"
npm install
npx expo start
```

Press `a` for Android or `w` for web. On a physical Android or iPhone, open Expo Go and scan the QR code. The iOS Simulator requires macOS.

## Quality checks

```powershell
npm run check
npm run export:web
```

`npm run check` performs TypeScript and Expo lint checks. The source is organised by responsibility under `src/`; platform artwork and IBM Plex Sans are under `assets/`.

## Key implementation rules

- `src/app/` contains only Expo Router entry points.
- `src/features/margin/MarginApp.tsx` owns the prototype flow and state.
- shared controls and the vector system live in `src/components/`.
- no operating-system emoticon glyphs are used for Check-in states.
- visible UI text is 13px or larger and primary touch targets are at least 48dp.
- hypothetical commitments are not saved until the user explicitly confirms them.
- the four persistent sections are Dashboard, Plan, Load, and Recover; daily Check-in is a focused popup rather than a duplicate navigation destination.
- timetable selection uses Expo DocumentPicker so the same import entry point works on Android, iOS, and web.
