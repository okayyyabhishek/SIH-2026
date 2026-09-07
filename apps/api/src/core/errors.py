"""
Sentinel NER — Standardized Application Exceptions
Hierarchical, typed error classes with stable error codes and HTTP mapping.
"""

from typing import Any, Dict, Optional

from fastapi import status


class SentinelAPIException(Exception):
    """Base exception for all Sentinel NER API errors."""

    def __init__(
        self,
        message: str,
        code: str = "ERR_INTERNAL",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}


class ResourceNotFoundException(SentinelAPIException):
    """Raised when an entity is not found."""

    def __init__(self, resource: str, resource_id: str = "", details: Optional[Dict[str, Any]] = None):
        msg = f"{resource} with identifier '{resource_id}' was not found." if resource_id else f"{resource} was not found."
        super().__init__(
            message=msg,
            code="ERR_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details or ({"resource": resource, "id": resource_id} if resource_id else {"resource": resource}),
        )


NotFoundException = ResourceNotFoundException


class ValidationException(SentinelAPIException):
    """Raised when client data fails operational validation."""

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        code: Optional[str] = None,
        error_code: Optional[str] = None,
    ):
        resolved_code = code or error_code or "ERR_VALIDATION_FAILED"
        status_code = status.HTTP_400_BAD_REQUEST if resolved_code.startswith("STG_") else status.HTTP_422_UNPROCESSABLE_ENTITY
        super().__init__(
            message=message,
            code=resolved_code,
            status_code=status_code,
            details=details,
        )


class UnauthorizedException(SentinelAPIException):
    """Raised when an operation lacks authentication or valid tokens."""

    def __init__(self, message: str = "Authentication credentials were not provided or are invalid."):
        super().__init__(
            message=message,
            code="ERR_UNAUTHORIZED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ForbiddenException(SentinelAPIException):
    """Raised when actor does not possess required role or organizational scope."""

    def __init__(
        self,
        message: str = "Operation forbidden for the current actor role.",
        error_code: Optional[str] = None,
        code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        resolved_code = code or error_code or "ERR_FORBIDDEN"
        super().__init__(
            message=message,
            code=resolved_code,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
        )


AuthorizationException = ForbiddenException


class UpstreamDependencyUnavailableException(SentinelAPIException):
    """Raised when an external system (GSI, IMD, S3, Atlas) is unreachable."""

    def __init__(self, dependency: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"External dependency '{dependency}' is currently unavailable. Operating in degraded mode.",
            code="ERR_DEPENDENCY_UNAVAILABLE",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details or {"dependency": dependency},
        )


class DatabaseUnavailableException(UpstreamDependencyUnavailableException):
    """Raised when the authoritative database (MongoDB Atlas) is unreachable (HTTP 503)."""

    def __init__(self, message: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            dependency="MongoDB",
            details=details,
        )
        if message:
            self.message = message
        else:
            self.message = "Authoritative MongoDB dependency is currently unavailable."
        self.code = "ERR_DATABASE_UNAVAILABLE"


class RateLimitExceededException(SentinelAPIException):
    """Raised when an actor exceeds request rate limits."""

    def __init__(self, retry_after: int = 60):
        super().__init__(
            message=f"Rate limit exceeded. Please retry after {retry_after} seconds.",
            code="ERR_RATE_LIMITED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details={"retry_after": retry_after},
        )


class AccountDisabledException(SentinelAPIException):
    """Raised when an account is disabled or pending approval."""

    def __init__(self, message: str = "Account is disabled or inactive. Contact administrator."):
        super().__init__(
            message=message,
            code="ERR_ACCOUNT_DISABLED",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class MembershipSuspendedException(SentinelAPIException):
    """Raised when user membership in the requested organization is suspended or revoked."""

    def __init__(self, message: str = "Organization membership is suspended or revoked."):
        super().__init__(
            message=message,
            code="ERR_MEMBERSHIP_SUSPENDED",
            status_code=status.HTTP_403_FORBIDDEN,
        )


class StageNotImplementedException(SentinelAPIException):
    """Raised for future stage routes to enforce strict stage-gate boundaries."""

    def __init__(self, feature_name: str, target_stage: int):
        super().__init__(
            message=f"Feature '{feature_name}' is scheduled for Stage {target_stage}. Architecture placeholder only.",
            code="STG_NOT_IMPLEMENTED",
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            details={"feature": feature_name, "stage": target_stage},
        )


class ConflictException(SentinelAPIException):
    """Raised when an entity violates uniqueness or conflict constraint (HTTP 409)."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="ERR_CONFLICT",
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


