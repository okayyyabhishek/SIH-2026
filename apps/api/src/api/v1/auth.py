"""
Sentinel NER — Authentication Endpoints
Login, token refresh, logout, and current user context.
"""

import time
import uuid

from fastapi import APIRouter, Depends, Request, status
from fastapi.security import HTTPAuthorizationCredentials

from src.core.config import settings
from src.core.errors import AccountDisabledException, UnauthorizedException
from src.core.logging import correlation_id_ctx
from src.core.security.crypto import hash_password, needs_rehash, verify_password
from src.core.security.dependencies import bearer_scheme, get_current_user
from src.core.security.jwt import (
    create_access_token,
    create_refresh_token,
    decode_and_validate_token,
    revoke_token,
)
from src.core.security.rate_limiter import check_auth_rate_limits, reset_rate_limit
from src.core.security.rbac import get_role_permissions
from src.db.repository import repository
from src.schemas.auth import LoginRequest, RefreshTokenRequest, TokenResponse, UserContextResponse
from src.schemas.identity import UserStatus

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate user and obtain JWT tokens",
    description="Validates credentials against authoritative repository, rate-limits brute force, and issues access & refresh tokens.",
)
async def login(req: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    cid = correlation_id_ctx.get()

    # 1. Multi-Dimensional Rate Limiting (Account: 5/min, IP: 20/min)
    check_auth_rate_limits(client_ip=client_ip, identifier=req.email)

    user = await repository.get_user_by_email(req.email)
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        await repository.record_security_event(
            event_type="LOGIN_FAILURE",
            actor_user_id=user.get("id") if user else None,
            actor_role=user.get("role") if user else None,
            organization_id=user.get("organization_id") if user else None,
            resource="/api/v1/auth/login",
            action="POST",
            result="DENIED",
            correlation_id=cid,
            client_ip=client_ip,
            details={"email": req.email, "reason": "invalid_credentials"},
        )
        raise UnauthorizedException("Invalid email or password.")

    # 2. Production Hardening: Reject Development Fixture Credentials
    if settings.APP_ENV == "production" or not getattr(settings, "ENABLE_DEV_FIXTURES", True):
        if user.get("is_demo_fixture"):
            await repository.record_security_event(
                event_type="LOGIN_FAILURE",
                actor_user_id=user["id"],
                actor_role=user["role"],
                organization_id=user.get("organization_id"),
                resource="/api/v1/auth/login",
                action="POST",
                result="DENIED",
                correlation_id=cid,
                client_ip=client_ip,
                details={"reason": "dev_fixtures_prohibited_in_production", "demo_fixture_disabled": True, "email": req.email},
            )
            raise UnauthorizedException("Development fixture credentials are not permitted in production.")

    # 3. Account State Verification
    if user.get("status") != UserStatus.ACTIVE.value:
        await repository.record_security_event(
            event_type="LOGIN_FAILURE",
            actor_user_id=user["id"],
            actor_role=user["role"],
            organization_id=user.get("organization_id"),
            resource="/api/v1/auth/login",
            action="POST",
            result="DENIED",
            correlation_id=cid,
            client_ip=client_ip,
            details={"reason": "account_inactive", "status": user.get("status")},
        )
        raise AccountDisabledException("Account is disabled or pending approval. Contact your administrator.")

    # 4. Successful Authentication: Reset Rate Limit Counters
    reset_rate_limit(f"account:{req.email.lower()}")
    reset_rate_limit(f"ip:{client_ip}")

    # 5. Automatic Password Hash Upgrading
    if needs_rehash(user.get("password_hash", "")):
        new_hash = hash_password(req.password)
        await repository.update_user(user["id"], {"password_hash": new_hash})

    # 6. Issue Access Token & Refresh Token Family
    family_id = f"fam-{uuid.uuid4()}"
    access_token = create_access_token(
        subject=user["id"],
        claims={
            "role": user["role"],
            "org": user.get("organization_id"),
            "email": user["email"],
        },
        expires_in_seconds=1800,
    )
    refresh_token = create_refresh_token(
        subject=user["id"],
        family_id=family_id,
        expires_in_seconds=604800,
    )

    # Register refresh token in repository for rotation and reuse tracking
    ref_payload = decode_and_validate_token(refresh_token, expected_type="refresh")
    await repository.register_refresh_token(
        jti=ref_payload["jti"],
        user_id=user["id"],
        family_id=family_id,
        expires_at=ref_payload["exp"],
    )

    await repository.record_security_event(
        event_type="LOGIN_SUCCESS",
        actor_user_id=user["id"],
        actor_role=user["role"],
        organization_id=user.get("organization_id"),
        resource="/api/v1/auth/login",
        action="POST",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=1800,
        user_id=user["id"],
        role=user["role"],
        organization_id=user.get("organization_id"),
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh an expired access token with token rotation",
    description="Validates the refresh token, detects token reuse, rotates the refresh token, and issues a new access token.",
)
async def refresh_token(req: RefreshTokenRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    cid = correlation_id_ctx.get()

    payload = decode_and_validate_token(req.refresh_token, expected_type="refresh", check_revocation=False)
    user_id = payload.get("sub")
    old_jti = payload.get("jti")
    family_id = payload.get("family_id")

    user = await repository.get_user_by_id(user_id)
    if not user or user.get("status") != UserStatus.ACTIVE.value:
        raise UnauthorizedException("Account is inactive or user no longer exists.")

    # 1. Authoritative Token Rotation & Reuse Detection
    now = int(time.time())
    new_jti = str(uuid.uuid4())
    new_expires_at = now + 604800

    rot_status, resolved_family = await repository.verify_and_rotate_refresh_token(
        jti=old_jti,
        user_id=user_id,
        new_jti=new_jti,
        new_expires_at=new_expires_at,
    )

    if rot_status == "REUSED":
        # Compromise detected: rotated refresh token reused!
        revoke_token(old_jti)
        await repository.record_security_event(
            event_type="REFRESH_TOKEN_REUSE_DETECTED",
            actor_user_id=user["id"],
            actor_role=user["role"],
            organization_id=user.get("organization_id"),
            resource="/api/v1/auth/refresh",
            action="POST",
            result="DENIED",
            correlation_id=cid,
            client_ip=client_ip,
            details={"family_id": resolved_family, "compromised_jti": old_jti},
        )
        raise UnauthorizedException("Refresh token reuse detected. Session family invalidated.")

    if rot_status == "INVALID":
        raise UnauthorizedException("Invalid or revoked refresh token.")

    # 2. Issue New Access Token and Rotated Refresh Token
    new_access_token = create_access_token(
        subject=user["id"],
        claims={
            "role": user["role"],
            "org": user.get("organization_id"),
            "email": user["email"],
        },
        expires_in_seconds=1800,
    )
    new_refresh_token = create_refresh_token(
        subject=user["id"],
        family_id=resolved_family or family_id,
        expires_in_seconds=604800,
        jti=new_jti,
    )

    await repository.record_security_event(
        event_type="TOKEN_REFRESH",
        actor_user_id=user["id"],
        actor_role=user["role"],
        organization_id=user.get("organization_id"),
        resource="/api/v1/auth/refresh",
        action="POST",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
    )

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="Bearer",
        expires_in=1800,
        user_id=user["id"],
        role=user["role"],
        organization_id=user.get("organization_id"),
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Log out active session",
    description="Revokes the active bearer access token JTI and logs an audit logout event.",
)
async def logout(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    user: dict = Depends(get_current_user),
):
    cid = correlation_id_ctx.get()
    client_ip = request.client.host if request.client else "unknown"

    if credentials and credentials.credentials:
        try:
            payload = decode_and_validate_token(credentials.credentials, expected_type="access")
            jti = payload.get("jti")
            if jti:
                revoke_token(jti)
                await repository.revoke_token(jti, user_id=user["id"], reason="logout")
        except Exception:
            pass

    # Revoke provided refresh token and invalidate session family
    try:
        body = await request.json()
        if isinstance(body, dict):
            ref_token = body.get("refresh_token")
            if ref_token:
                ref_payload = decode_and_validate_token(ref_token, expected_type="refresh", check_revocation=False)
                ref_jti = ref_payload.get("jti")
                fam_id = ref_payload.get("family_id")
                if ref_jti:
                    revoke_token(ref_jti)
                    await repository.revoke_token(ref_jti, user_id=user["id"], reason="logout")
                if fam_id:
                    await repository.invalidate_token_family(fam_id, user_id=user["id"])
    except Exception:
        pass

    await repository.record_security_event(
        event_type="LOGOUT",
        actor_user_id=user["id"],
        actor_role=user["role"],
        organization_id=user.get("organization_id"),
        resource="/api/v1/auth/logout",
        action="POST",
        result="SUCCESS",
        correlation_id=cid,
        client_ip=client_ip,
    )

    return {"success": True, "message": "Successfully logged out."}



@router.get(
    "/me",
    response_model=UserContextResponse,
    summary="Get current authenticated user context",
    description="Returns verified user profile, active organizational jurisdiction, and effective capability permissions.",
)
async def get_me(user: dict = Depends(get_current_user)):
    org_id = user.get("organization_id")
    org_name = None
    jurisdiction_scope = "DISTRICT"

    if org_id:
        org = await repository.get_organization(org_id)
        if org:
            org_name = org.get("name")
            jurisdiction_scope = org.get("jurisdiction_scope", "DISTRICT")

    perms = sorted(list(get_role_permissions(user["role"])))

    return UserContextResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        status=user["status"],
        role=user["role"],
        organization_id=org_id,
        organization_name=org_name,
        jurisdiction_scope=jurisdiction_scope,
        permissions=perms,
    )
