from starlette.responses import JSONResponse

from app.core.config import settings


class RequestSizeLimit:
    """Bound the body BEFORE multipart parsing, including chunked requests.

    The bounded body is buffered once per request. Deploy with a proxy concurrency
    limit and read timeout too; this is not a rate limiter or a slow-client guard.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        path = scope["path"].rstrip("/")
        maximum = (
            settings.max_upload_bytes + 64 * 1024
            if path == "/v1/materials"
            else 1024 * 1024 + 64 * 1024
            if path == "/v1/imports/timetable/preview"
            else settings.max_json_bytes
        )

        async def reject(
            status=413, code="request_too_large", message="The request body exceeds the size limit"
        ):
            response = JSONResponse(
                status_code=status, content={"detail": {"code": code, "message": message}}
            )
            await response(scope, receive, send)

        for key, value in scope.get("headers", []):
            if key.lower() == b"content-length":
                try:
                    size = int(value)
                    if size < 0:
                        raise ValueError
                except ValueError:
                    return await reject(400, "invalid_content_length", "Invalid Content-Length")
                if size > maximum:
                    return await reject()
        chunks, size = [], 0
        while True:
            event = await receive()
            if event["type"] == "http.disconnect":
                return
            chunk = event.get("body", b"")
            size += len(chunk)
            if size > maximum:
                return await reject()
            chunks.append(chunk)
            if not event.get("more_body", False):
                break
        body = b"".join(chunks)
        del chunks
        delivered = False

        async def replay():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": body, "more_body": False}
            return await receive()

        await self.app(scope, replay, send)
