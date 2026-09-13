# Santai backend implementation status

Updated 13 September 2026. Changes are saved locally and uncommitted. The
pre-existing untracked `.codex/` directory belongs to the user. No frontend
source has been changed or connected to the API.

## Implemented

- Python 3.14, FastAPI, Pydantic v2, SQLAlchemy 2, PostgreSQL 17 and Alembic.
- Guest bearer sessions with hashed tokens, rotation, logout and strict
  per-user ownership. Permanent sign-in/recovery remains a product decision.
- Versioned baseline routines and capacity answers; modules, assignments,
  date-only commitment schedules and optimistic concurrency revisions.
- Daily planner, dashboard, distribution and pure what-if calculation.
- Per-occurrence keep/move/skip/lighten/help actions with assignment bounds.
- Daily check-ins, proportional assignment-intention allocation, sport override,
  check-in streaks, weekly notes and recovery suggestions/results.
- ICS preview/confirm with bounded recurrence expansion, stable source identity,
  conflict handling and disjoint reviewed-window coverage.
- Private material storage and owner-checked download. TXT/MD/CSV/TSV local card
  extraction, including quoted multiline CSV. PDF/PPTX stay manual.
- Flashcard CRUD, safe account export, account deletion and a durable retry queue
  for private-file cleanup (`python -m app.maintenance`).
- Bounded request bodies, strict validation without submitted private values in
  errors, no-store user responses, readiness checks and exact CORS origins.
- Non-root container image, persistent Compose volumes and migration startup.

## Formula and research

The active `planning-v1` policy is implemented in `app/services/scoring.py`,
documented in `SCORING_POLICY.md`, and exposed at `GET /v1/planner/policy`.

Time demand is minutes. Mental, physical and social demand are
`minutes × effort / 5`; daily utilization compares their sums with a baseline-
calibrated personal envelope. The tightest dimension controls displayed load;
the energy score averages capped utilization and adds the frontend's one-per-day
recovery completion bonus. Stress does not silently change calculated capacity.

The research supports multidimensional workload, duration-sensitive effort,
student demands/resources, distinct recovery experiences and subjective energy.
It does not supply Santai's exact default effort profiles, response anchors or
status bands; those remain visible, versioned product assumptions.

## Verification

- Ruff: clean.
- SQLite: 51 passed, 1 PostgreSQL-only concurrency test skipped.
- Disposable PostgreSQL 17: 52 passed, including concurrent revision locking.
- Alembic: upgraded through `0005` (one assignment per module); autogenerate
  reports no model drift.
- Migration preservation test covers `0002` coverage data through `0003` and
  rollback/upgrade again.
- Docker image builds and runs as user `santai`.
- Container smoke flow: migrate, ready check, create guest, save baseline, build
  a plan, delete account; 33 OpenAPI paths generated.

## Decisions still needed

1. Permanent authentication: email/password, Google/OIDC, or both, including
   guest-account upgrade and recovery.
2. Whether any AI feature belongs in the first backend release, and its provider,
   data-retention boundary and asynchronous-job behavior.

The backend can be integrated and exercised with guest sessions without blocking
on those choices. Before an internet-facing release, configure a trusted TLS
proxy, distributed auth rate limiting, managed database backups, production file
storage/cleanup monitoring and one migration job per release. See `README.md`.
