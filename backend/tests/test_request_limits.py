import asyncio

from app.core.config import settings
from app.core.request_limits import RequestSizeLimit


def test_declared_oversized_body_returns_413_with_cors(client, monkeypatch):
    monkeypatch.setattr(settings, "max_json_bytes", 32)
    result = client.post("/v1/auth/signup", content=b"x" * 33, headers={"Origin": "http://localhost:8081"})
    assert result.status_code == 413
    assert result.headers["Access-Control-Allow-Origin"] == "http://localhost:8081"
    assert result.headers["Cache-Control"] == "no-store"


def test_chunked_body_is_bounded_before_application_runs(monkeypatch):
    monkeypatch.setattr(settings, "max_json_bytes", 5)
    calls, sent = [], []
    events = iter(
        [
            {"type": "http.request", "body": b"123", "more_body": True},
            {"type": "http.request", "body": b"456", "more_body": False},
        ]
    )

    async def downstream(scope, receive, send):
        calls.append(True)

    async def receive():
        return next(events)

    async def send(event):
        sent.append(event)

    asyncio.run(
        RequestSizeLimit(downstream)({"type": "http", "path": "/v1/auth/signup", "headers": []}, receive, send)
    )
    assert calls == [] and sent[0]["status"] == 413
