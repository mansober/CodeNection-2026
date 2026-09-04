# Margin — CodeNection 2026

Margin is a cross-platform capacity planner for university students. It helps students see how time, mental, physical, and social load interact, then rebalance a difficult week before overload becomes burnout.

The active frontend is one Expo + React Native + TypeScript project. The same source runs on Android, iOS, and web.

## Repository layout

```text
app/
  assets/                 # Margin fonts and platform artwork
  scripts/                # Repeatable brand-asset generator
  src/
    app/                  # Expo Router entry points
    components/           # Accessible shared UI and SVG icons
    features/margin/      # App-level state and navigation flow
    models/               # Capacity and commitment models
    screens/              # Onboarding, planning, rebalance, recovery
    theme/                # Typography, colour, and spacing tokens
backend/                  # FastAPI service and database layer
compose.yaml              # Local backend and PostgreSQL services
```

There is no second native Android frontend. Run every client platform from `app/`.

## Run the app

```powershell
cd "C:\Users\User\OneDrive\Documents\DEGREE\Projects\CodeNection-2026\app"
npm install
npx expo start
```

From the Expo terminal:

- press `a` for an Android emulator or connected Android phone;
- press `w` for the web app;
- scan the QR code with Expo Go for a physical Android or iPhone;
- press `i` for the iOS simulator on macOS.

Useful direct commands:

```powershell
npm run android
npm run web
npm run ios      # macOS only for the iOS Simulator
npm run check
```

For Android, start a virtual device in Android Studio’s Device Manager first. Android Studio does not need a separate Gradle project for the Expo Go workflow.

## Product flow

- one-question-per-page baseline limits derived from normal commitments;
- timetable import with idle, loading, error, success, and undo states;
- Today dashboard across four capacity dimensions;
- commitment plan with one clear Add action and explicit edit/remove controls;
- editable rebalance recommendations and a separated what-if simulator;
- check-in and recovery flows with accessible custom vectors;
- 48dp+ touch targets, IBM Plex Sans, and 13px-or-larger visible UI text.

## Backend

Start the API and PostgreSQL from the repository root:

```powershell
docker compose up --build
```

The API is available at `http://localhost:8000`, with OpenAPI documentation at `http://localhost:8000/docs`.
