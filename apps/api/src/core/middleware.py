"""
Sentinel NER — Core Middleware
Provides correlation ID propagation, execution timing, security headers, and access logging.
"""

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from src.core.logging import correlation_id_ctx, logger


class CorrelationAndSecurityMiddleware(BaseHTTPMiddleware):
    """
    Ensures every request has a correlation ID, logs request/response telemetry,
    measures processing time, and sets defensive HTTP security headers.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Extract or generate correlation ID
        incoming_cid = request.headers.get("X-Correlation-ID")
        correlation_id = incoming_cid if incoming_cid else str(uuid.uuid4())

        # Store in async context
        token = correlation_id_ctx.set(correlation_id)
        start_time = time.perf_counter()

        logger.info(
            "Incoming request",
            extra={
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host if request.client else "unknown",
            },
        )

        try:
            response = await call_next(request)
        except Exception:
            process_time = (time.perf_counter() - start_time) * 1000
            logger.exception(
                "Unhandled exception processing request",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "process_time_ms": round(process_time, 2),
                },
            )
            raise
        finally:
            correlation_id_ctx.reset(token)

        process_time = (time.perf_counter() - start_time) * 1000

        # Inject tracing headers
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Process-Time"] = f"{process_time:.2f}ms"

        # Inject defensive security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        logger.info(
            "Request completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "process_time_ms": round(process_time, 2),
            },
        )

        return response
