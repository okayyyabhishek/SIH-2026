"""
Sentinel NER — FastAPI Application Factory
Initializes application, exception handlers, middleware, and route trees.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.api.v1.health import router as health_router
from src.api.v1.router import api_v1_router
from src.core.config import settings
from src.core.errors import SentinelAPIException
from src.core.logging import correlation_id_ctx, logger, setup_logging
from src.core.middleware import CorrelationAndSecurityMiddleware
from src.db.mongodb import close_mongo_connection, connect_to_mongo
from src.db.repository import repository
from src.schemas.common import ErrorDetail, ErrorEnvelope


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for application startup and shutdown."""
    setup_logging(settings.LOG_LEVEL)
    logger.info(
        "Initializing Sentinel NER API",
        extra={
            "environment": settings.APP_ENV,
            "version": settings.APP_VERSION,
            "port": settings.API_PORT,
        },
    )
    try:
        await connect_to_mongo()
        await repository.sync_from_mongo()
        await repository.seed_dev_data_if_empty()
        if settings.APP_ENV in ("production", "staging"):
            repository.enforce_persistence_policy()
    except Exception as exc:
        from src.db.mongodb import mask_mongo_uri
        safe_exc = mask_mongo_uri(str(exc))
        if settings.APP_ENV in ("production", "staging"):
            logger.critical(
                "CRITICAL: Failed to connect to MongoDB Atlas during production startup. Halting process.",
                extra={"error": safe_exc},
            )
            raise
        else:
            logger.error(
                "WARNING: Failed to connect to MongoDB Atlas during startup. Starting service in DEGRADED mode.",
                extra={"error": safe_exc},
            )
            await repository.seed_dev_data_if_empty()

    yield
    await close_mongo_connection()
    logger.info("Shutting down Sentinel NER API")


def create_app() -> FastAPI:
    """Factory function for FastAPI application instance."""
    app = FastAPI(
        title="Sentinel NER API",
        description="Operational Landslide Intelligence & Intervention Platform for Northeast India",
        version=settings.APP_VERSION,
        docs_url="/docs" if settings.APP_ENV != "production" else None,
        redoc_url="/redoc" if settings.APP_ENV != "production" else None,
        lifespan=lifespan,
    )

    # 1. Register Core Security & Tracing Middleware
    app.add_middleware(CorrelationAndSecurityMiddleware)

    # 2. CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 3. Exception Handlers
    @app.exception_handler(SentinelAPIException)
    async def sentinel_exception_handler(request: Request, exc: SentinelAPIException):
        envelope = ErrorEnvelope(
            error=ErrorDetail(
                code=exc.code,
                message=exc.message,
                correlation_id=correlation_id_ctx.get(),
                details=exc.details,
            )
        )
        resp_headers = {}
        if exc.status_code == 429 and exc.details and "retry_after" in exc.details:
            resp_headers["Retry-After"] = str(exc.details["retry_after"])

        return JSONResponse(
            status_code=exc.status_code,
            content=envelope.model_dump(mode="json"),
            headers=resp_headers or None,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        clean_errors = []
        for err in exc.errors():
            clean_err = dict(err)
            if "ctx" in clean_err and isinstance(clean_err["ctx"], dict):
                clean_err["ctx"] = {k: str(v) for k, v in clean_err["ctx"].items()}
            clean_errors.append(clean_err)

        envelope = ErrorEnvelope(
            error=ErrorDetail(
                code="ERR_VALIDATION_FAILED",
                message="Request payload failed operational validation.",
                correlation_id=correlation_id_ctx.get(),
                details={"errors": clean_errors},
            )
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=envelope.model_dump(mode="json"),
        )

    from pymongo.errors import ConnectionFailure, PyMongoError, ServerSelectionTimeoutError

    @app.exception_handler(ServerSelectionTimeoutError)
    @app.exception_handler(ConnectionFailure)
    async def mongo_connection_exception_handler(request: Request, exc: PyMongoError):
        logger.error("Authoritative MongoDB connection failure during request", extra={"error": str(exc)})
        envelope = ErrorEnvelope(
            error=ErrorDetail(
                code="ERR_DATABASE_UNAVAILABLE",
                message="Authoritative MongoDB dependency is currently unavailable.",
                correlation_id=correlation_id_ctx.get(),
                details={"dependency": "mongodb"},
            )
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=envelope.model_dump(mode="json"),
        )

    @app.exception_handler(RuntimeError)
    async def runtime_error_handler(request: Request, exc: RuntimeError):
        exc_str = str(exc)
        if "MongoDB" in exc_str or "database" in exc_str.lower():
            logger.error("Authoritative database dependency error during request", extra={"error": exc_str})
            envelope = ErrorEnvelope(
                error=ErrorDetail(
                    code="ERR_DATABASE_UNAVAILABLE",
                    message="Authoritative MongoDB dependency is currently unavailable.",
                    correlation_id=correlation_id_ctx.get(),
                    details={"dependency": "mongodb"},
                )
            )
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content=envelope.model_dump(mode="json"),
            )
        logger.exception("Unhandled runtime error caught in root handler")
        envelope = ErrorEnvelope(
            error=ErrorDetail(
                code="ERR_INTERNAL_SERVER_ERROR",
                message="An unexpected system error occurred. Tracing details have been recorded.",
                correlation_id=correlation_id_ctx.get(),
            )
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=envelope.model_dump(mode="json"),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        envelope = ErrorEnvelope(
            error=ErrorDetail(
                code=f"ERR_HTTP_{exc.status_code}",
                message=str(exc.detail),
                correlation_id=correlation_id_ctx.get(),
            )
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=envelope.model_dump(mode="json"),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled server exception caught in root handler")
        envelope = ErrorEnvelope(
            error=ErrorDetail(
                code="ERR_INTERNAL_SERVER_ERROR",
                message="An unexpected system error occurred. Tracing details have been recorded.",
                correlation_id=correlation_id_ctx.get(),
            )
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=envelope.model_dump(mode="json"),
        )

    # 4. Mount Routers
    app.include_router(health_router)
    app.include_router(api_v1_router)

    # 5. Root Entry Point
    @app.get("/", tags=["Root"])
    async def root():
        return {
            "name": "Sentinel NER API",
            "version": settings.APP_VERSION,
            "status": "OPERATIONAL",
            "environment": settings.APP_ENV,
            "health_endpoint": "/api/v1/health",
            "docs": "/docs" if settings.APP_ENV != "production" else "disabled",
        }

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
    )
