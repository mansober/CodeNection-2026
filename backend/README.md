# Santai backend

FastAPI service for date-based student workload planning. The current backend
supports guest identities, baselines, modules, assignments, commitments,
occurrence adjustments, check-ins, recovery, timetable import, learning
materials, flashcards, and account export/deletion.

## Run locally

Requirements: Python 3.14+, `uv`, and PostgreSQL 17.

From the repository root:

```powershell
Copy-Item .env.example backend/.env
docker compose up --build
```

API documentation is then available at `http://127.0.0.1:8000/docs`; readiness
is at `/ready`. Compose applies Alembic migrations before starting the API.

For backend-only development from `backend/`:

```powershell
uv sync --frozen
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

Do not use the default development credentials in an internet-facing deployment.
Set `DATABASE_URL`, exact `CORS_ORIGINS`, storage, and proxy request/time limits.

## Authentication

Create a temporary account with `POST /v1/auth/guest`, retain its bearer token,
and send `Authorization: Bearer <token>`. Refresh rotates the token; logout
invalidates it. Guest identity is intentionally an MVP boundary: losing the token
loses access. A permanent account method and recovery flow must be chosen before
public launch.

## Typical client flow

1. Create a guest session and save its token securely.
2. `PUT /v1/baseline` using the current `plan_revision` from `/v1/me`.
3. Create modules and assignments, then commitments; or preview and confirm an
   ICS timetable import.
4. Read `/v1/planner`, `/v1/dashboard`, or `/v1/planner/distribution`.
5. Use `/v1/planner/what-if` before saving optional work.
6. Move, skip, lighten, restore, or request help for a single occurrence through
   `/v1/planner/actions`.

Mutating planning calls use the user's `plan_revision`; resource edits also use
`X-Resource-Version`. A `409` means the client must refresh before retrying.
Dates are ISO `YYYY-MM-DD` calendar dates in the account timezone.

## Client contract

The client/API boundary uses these mechanical mappings:

- Hours selected in forms become integer `duration_minutes`; commitment effort
  sliders remain 0–5 ratings.
- Capacity-answer indexes map in display order to `plenty`, `some`,
  `needs_break`, and `exhausted`; time maps to `under_30`, `30_to_60`,
  `60_to_120`, and `over_120`.
- Display categories map to lowercase API categories. Fixed one-day, fixed
  multi-day, flexible/set-up-later, and daily-routine choices map to `once`,
  `weekly`, `unscheduled`, and `daily` schedules.
- Weekdays use the selector's numbering: Sunday `0` through Saturday `6`.
- `peak_usage_percent` is the displayed load and `energy_score` is the displayed
  energy value. Capacity entries provide each bar's used amount, limit, and
  utilization percentage.

Assignment check-ins store planned percentage intentions. They do not record
completion, elapsed study time, or a user-entered study-duration estimate. The
planner apportions the existing baseline study block between selected
assignments and labels those occurrences as estimated.

The exact calculation and evidence boundary are in
[SCORING_POLICY.md](SCORING_POLICY.md). The live machine-readable policy is
`GET /v1/planner/policy` and requires no account.

## Files and privacy

Uploaded originals use generated private storage keys and owner-checked download
routes. TXT/MD/CSV/TSV can create cards locally; PDF/PPTX are stored for manual
card creation. No OCR or AI provider is connected. Diary text is not accepted by
the API and remains client-local.

File removal uses a durable database queue. API deletion attempts cleanup
immediately; schedule this retry worker in deployment:

```powershell
uv run python -m app.maintenance --limit 100
```

`GET /v1/me/export` excludes session hashes and storage keys. `DELETE /v1/me`
removes the account's database data and queues every private file for deletion.

## Verification

```powershell
uv run ruff check app migrations tests
uv run pytest -q
uv run alembic check
```

Tests use isolated SQLite by default. Set `TEST_DATABASE_URL` only to an already
migrated, disposable PostgreSQL database to exercise row-lock concurrency. Never
point the test suite at development or production data.

## Public deployment checklist

- Choose permanent authentication and account recovery; rate-limit auth routes.
- Terminate TLS at a trusted proxy and configure explicit trusted hosts/origins.
- Use managed PostgreSQL backups and object storage if running multiple replicas.
- Run one migration job per release rather than every replica racing at startup.
- Enforce proxy body-size, concurrency and read-timeout limits in addition to the
  application body cap.
- Run file-cleanup maintenance and monitor its failed count.
- Add structured logs, error monitoring, database metrics and a privacy policy.
- Validate `planning-v1` with users before describing it as predictive.
