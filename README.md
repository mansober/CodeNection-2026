# Santai — CodeNection 2026

Santai is a cross-platform capacity planner for university students. It helps students see how time, mental, physical, and social load interact, then rebalance a difficult week before overload becomes burnout.

The active frontend is one Expo + React Native + TypeScript project. The same source runs on Android, iOS, and web.

## Repository layout

```text
app/
  assets/                 # Santai fonts and platform artwork
  scripts/                # Repeatable brand-asset generator
  src/
    app/                  # Expo Router entry points
    components/           # Accessible shared UI and SVG icons
    features/margin/      # App-level state and navigation flow
    models/               # Capacity and commitment models
    screens/              # Onboarding, planning, recovery, and secondary flows
    theme/                # Typography, colour, and spacing tokens
backend/                  # FastAPI service and database layer
compose.yaml              # Local backend and PostgreSQL services
```

There is no second native Android frontend. Run every client platform from `app/`.

## Run the app

```powershell
cd app
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

The current functional prototype includes baseline setup, ICS module import and assignment dates, commitment calendars/sliders, a daily/weekly dashboard, energy and check-in streaks, daily assignment/training updates, per-item plan actions, a real what-if preview, load distribution, recovery feedback and a flashcard library.

See [the current app handoff](app/HANDOFF.md) for user flows, active pages, state ownership, and implementation boundaries. Planner data currently saves locally; the frontend has not yet been connected to the backend.

If Metro reports an `EINVAL ... readlink` error from a OneDrive-synced `node_modules` directory, clone the repository to a normal local folder outside OneDrive and run `npm install` there. This is a Windows/OneDrive filesystem issue rather than an app-code issue.

## Backend

Start the API and PostgreSQL from the repository root:

```powershell
docker compose up --build
```

The API is available at `http://localhost:8000`, with OpenAPI documentation at `http://localhost:8000/docs`.
