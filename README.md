# CodeNection 2026

CodeNection is a full-stack workspace with an Expo/React Native client, a
FastAPI backend, and PostgreSQL for persistence.

## Repository layout

```text
app/
  src/
    app/             # Expo Router screens and routes
    components/      # Reusable UI components
    hooks/           # Shared React hooks
    lib/api.ts       # Typed API client
    types/           # Shared frontend types
  package.json       # Expo project manifest
android-app/
  app/               # Native Android Margin prototype
  docs/              # Product, screen-map, design, and verification notes
  gradle/             # Gradle wrapper support
backend/
  app/
    main.py          # FastAPI application entry point
    api/             # HTTP routers
    models/          # SQLAlchemy models
    schemas/         # Pydantic request/response schemas
    services/        # Application services
    db/              # Database engine, sessions, and base model
    core/            # Settings and cross-cutting configuration
  migrations/        # Alembic migrations
  pyproject.toml
  uv.lock
compose.yaml          # Local PostgreSQL + backend services
```

`app/package.json` stays at the Expo project root because Expo, Metro, and npm
resolve the app manifest from that directory. The requested source layout is
under `app/src`.

The complete Android judging prototype lives in [`android-app`](android-app/README.md).
It is intentionally isolated from the Expo client so Android Studio can open a
clean Gradle project without treating the full-stack repository as an Android module.

## Quick start

### Start the backend and database

From the repository root:

```bash
docker compose up --build
```

The API is available at <http://localhost:8000>. OpenAPI documentation is at
<http://localhost:8000/docs>, and the health endpoint is
<http://localhost:8000/health>.

### Start the mobile/web app

```bash
cd app
npm install
npm run start
```

Set `EXPO_PUBLIC_API_URL` when the API is not reachable at the default
`http://localhost:8000`:

```bash
# Android emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000 npm run android

# A physical device (replace with the computer's LAN IP)
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000 npm run start
```

On Windows PowerShell, use `$env:EXPO_PUBLIC_API_URL = "http://10.0.2.2:8000"`
before starting Expo.

## Backend development without Docker

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

Database migrations are managed with Alembic:

```bash
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "describe change"
```

Copy `.env.example` to `.env` if you need local configuration overrides. Do
not commit real credentials or generated build artifacts.
