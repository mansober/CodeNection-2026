# Santai app

This directory is the complete Santai frontend. It uses Expo SDK 57, React Native, Expo Router, and TypeScript to serve Android, iOS, and web from the same codebase.

## Start here

```powershell
cd app
npm install
npx expo start
```

Press `a` for Android or `w` for web. On a physical Android or iPhone, open Expo Go and scan the QR code. The iOS Simulator requires macOS.

## Backend connection

Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_API_URL` for the target device. Use `http://127.0.0.1:8000` for web on this computer, normally `http://10.0.2.2:8000` for an Android emulator, or the development computer's LAN IP for a physical phone. A physical phone also requires the Compose backend to be bound to the trusted LAN; see the repository README.

The app begins with a normal email/password sign-up or sign-in page. Native session tokens use Expo SecureStore; web tokens use browser storage. Each account gets its own device-storage key and user-owned database records. Changes—including partially completed onboarding—save locally first, then a coalescing sync writes the normalized baseline, module, assignment, commitment, check-in, note, and recovery endpoints. If the API becomes unavailable after sign-in, local persistence continues, the app shows a non-blocking sync notice, and retries transient failures with bounded exponential backoff.

Startup uses the normalized backend as the source of truth. The former `/v1/planner-state` snapshot is read only to migrate accounts created by earlier builds. Compact local fingerprints protect unsynced offline edits during startup. Resources carry optimistic versions so a stale client cannot silently replace or delete a newer edit; on conflict, the app reloads the newer backend state. A five-second plan-revision poll refreshes changes made by another signed-in device.

Check-in notes, check-in causes, and device-local material URIs stay on the device. Timetable and learning-material file upload/AI parsing are not part of this connection yet.

For a recovery check on web, finish onboarding and wait for the sync notice to clear, then remove only the signed-in user's `margin-planner-v3-<user-id>` browser-storage entry while leaving `santai-api-session-v2` intact. Reloading should reconstruct the plan from the normalized API resources.

Expo Go is only the fast development workflow. Santai is also configured as its own Android application with package ID `com.codenection.margin`. A standalone release embeds the JavaScript bundle and assets, so it runs without Expo Go and without a Metro server.

## Standalone Android app

Keep the repository as an Expo managed project. Generate the native Android project only when a local standalone build is needed:

```powershell
cd app
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
- `src/features/margin/MarginApp.tsx` owns authentication gating and the local-first flow; `src/services/api.ts` handles account sessions and authenticated transport, while `src/services/planningApi.ts` maps UI state to normalized planning resources and backend-computed views.
- shared controls and the vector system live in `src/components/`.
- no operating-system emoticon glyphs are used for Check-in states.
- visible UI text is 13px or larger and primary touch targets are at least 48dp.
- hypothetical commitments are not saved until the user explicitly confirms them.
- the four persistent sections are Dashboard, Plan, Recover, and Profile; the centre Add button opens a compact sheet for every create/import action.
- the mascot itself provides the daily Check-in prompt and cycles through encouraging notes when tapped.
- Schedule and Assignments have dedicated pages, while Recovery replaces the old Load destination and ranks only options that do not worsen the user's most constrained capacity.
- timetable selection uses Expo DocumentPicker so the same import entry point works on Android, iOS, and web.

## Current implementation

See [HANDOFF.md](HANDOFF.md) for the current user flows, active page inventory, state ownership, code map, and known boundaries.

Run `npm run check` for type, lint, planner-model, legacy-migration, and normalized API adapter checks.
