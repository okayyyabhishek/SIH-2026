"""
Sentinel NER — Structured JSON Logging
Provides standardized structured JSON output with correlation ID injection.
"""

import logging
import sys
from contextvars import ContextVar

try:
    from pythonjsonlogger.json import JsonFormatter
except ImportError:
    from pythonjsonlogger.jsonlogger import JsonFormatter  # type: ignore

# Context variable for holding request correlation ID across async execution contexts
correlation_id_ctx: ContextVar[str] = ContextVar("correlation_id", default="system")


class SentinelJsonFormatter(JsonFormatter):
    """Custom JSON formatter ensuring standard fields and correlation ID."""

    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)
        log_record["timestamp"] = self.formatTime(record, self.datefmt)
        log_record["level"] = record.levelname
        log_record["logger"] = record.name
        log_record["correlation_id"] = correlation_id_ctx.get()


def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """Configures the root logger with the SentinelJsonFormatter."""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    # Remove existing handlers to avoid duplicate entries
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    log_handler = logging.StreamHandler(sys.stdout)
    formatter = SentinelJsonFormatter(
        "%(timestamp)s %(level)s %(name)s %(message)s %(correlation_id)s"
    )
    log_handler.setFormatter(formatter)
    root_logger.addHandler(log_handler)

    # Set external noisemakers to WARNING
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("motor").setLevel(logging.WARNING)

    return logging.getLogger("sentinel.api")


logger = logging.getLogger("sentinel.api")
