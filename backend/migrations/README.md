# Migrations

This directory is reserved for Alembic migrations. Create a revision from the
`backend` directory with:

```bash
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```
