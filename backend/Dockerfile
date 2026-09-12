FROM python:3.14-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

COPY pyproject.toml uv.lock ./
RUN pip install --no-cache-dir uv \
    && uv sync --frozen --no-dev

COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./alembic.ini

RUN groupadd --gid 10001 santai \
    && useradd --uid 10001 --gid santai --no-create-home santai \
    && mkdir -p /app/data/materials \
    && chown -R santai:santai /app/data

USER santai

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
