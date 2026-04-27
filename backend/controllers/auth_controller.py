from __future__ import annotations

import secrets
from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, Request, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.security import (
    AccessTokenBundle,
    RefreshTokenBundle,
    TokenValidationError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token_value,
    utc_now,
    verify_password,
)
from backend.models.admin import AdminUserModel
from backend.models.enums import TokenTypeEnum
from backend.models.refresh_token import RefreshTokenModel


@dataclass(frozen=True)
class AuthSessionResult:
    user: AdminUserModel
    access_token: AccessTokenBundle
    refresh_token: RefreshTokenBundle


def _extract_client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


async def get_admin_by_email(session: AsyncSession, email: str) -> AdminUserModel | None:
    normalized = email.strip().lower()
    stmt = select(AdminUserModel).where(func.lower(AdminUserModel.email) == normalized)
    return await session.scalar(stmt)


async def ensure_default_admin(
    session: AsyncSession,
    *,
    email: str,
    password: str,
) -> bool:
    normalized_email = email.strip().lower()
    existing = await get_admin_by_email(session, normalized_email)
    if existing is not None:
        # Keep default admin credentials in sync when configured from env.
        updated = False
        if existing.email != normalized_email:
            existing.email = normalized_email
            updated = True
        if not existing.is_active:
            existing.is_active = True
            updated = True
        if not verify_password(password, existing.password_hash):
            existing.password_hash = hash_password(password)
            updated = True
        if updated:
            await session.commit()
        return False

    new_admin = AdminUserModel(
        email=normalized_email,
        password_hash=hash_password(password),
        is_active=True,
    )
    session.add(new_admin)
    await session.commit()
    return True


async def authenticate_admin(
    session: AsyncSession,
    *,
    email: str,
    password: str,
) -> AdminUserModel | None:
    admin = await get_admin_by_email(session, email)
    if admin is None or not admin.is_active:
        return None
    if not verify_password(password, admin.password_hash):
        return None
    return admin


async def _revoke_admin_refresh_sessions(session: AsyncSession, *, user_id: UUID) -> None:
    await session.execute(
        update(RefreshTokenModel)
        .where(RefreshTokenModel.user_id == user_id)
        .where(RefreshTokenModel.revoked_at.is_(None))
        .values(revoked_at=utc_now())
    )


async def _issue_auth_session(
    session: AsyncSession,
    *,
    user: AdminUserModel,
    request: Request,
) -> AuthSessionResult:
    access_bundle = create_access_token(user.id)
    refresh_bundle = create_refresh_token(user.id)

    refresh_record = RefreshTokenModel(
        id=refresh_bundle.jti,
        user_id=user.id,
        token_hash=hash_token_value(refresh_bundle.token),
        user_agent=request.headers.get("user-agent"),
        ip_address=_extract_client_ip(request),
        expires_at=refresh_bundle.expires_at,
    )
    session.add(refresh_record)
    await session.flush()

    return AuthSessionResult(
        user=user,
        access_token=access_bundle,
        refresh_token=refresh_bundle,
    )


async def login_admin(
    session: AsyncSession,
    *,
    request: Request,
    email: str,
    password: str,
) -> AuthSessionResult | None:
    admin = await authenticate_admin(session, email=email, password=password)
    if admin is None:
        return None

    auth_session = await _issue_auth_session(session, user=admin, request=request)
    await session.commit()
    return auth_session


async def change_admin_credentials(
    session: AsyncSession,
    *,
    request: Request,
    current_email: str,
    current_password: str,
    new_email: str,
    new_password: str,
) -> AuthSessionResult | None:
    admin = await authenticate_admin(session, email=current_email, password=current_password)
    if admin is None:
        return None

    normalized_new_email = new_email.strip().lower()
    existing_admin = await get_admin_by_email(session, normalized_new_email)
    if existing_admin is not None and existing_admin.id != admin.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El nuevo usuario ya esta en uso.",
        )

    admin.email = normalized_new_email
    admin.password_hash = hash_password(new_password)
    await _revoke_admin_refresh_sessions(session, user_id=admin.id)

    auth_session = await _issue_auth_session(session, user=admin, request=request)
    await session.commit()
    return auth_session


async def rotate_refresh_session(
    session: AsyncSession,
    *,
    request: Request,
    refresh_token: str,
) -> AuthSessionResult:
    try:
        payload = decode_token(refresh_token, TokenTypeEnum.REFRESH)
        user_id = UUID(str(payload["sub"]))
        token_id = UUID(str(payload["jti"]))
    except (TokenValidationError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalido o expirado.",
        ) from exc

    token_record = await session.get(RefreshTokenModel, token_id)
    if token_record is None or token_record.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token invalido.",
        )

    now = utc_now()
    if token_record.revoked_at is not None or token_record.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token revocado o expirado.",
        )

    expected_hash = hash_token_value(refresh_token)
    if not secrets.compare_digest(token_record.token_hash, expected_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token comprometido.",
        )

    admin = await session.get(AdminUserModel, user_id)
    if admin is None or not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El usuario ya no esta autorizado.",
        )

    token_record.revoked_at = now
    auth_session = await _issue_auth_session(session, user=admin, request=request)
    await session.commit()
    return auth_session


async def revoke_refresh_session(session: AsyncSession, *, refresh_token: str) -> None:
    try:
        payload = decode_token(refresh_token, TokenTypeEnum.REFRESH)
        token_id = UUID(str(payload["jti"]))
    except (TokenValidationError, KeyError, ValueError):
        return

    token_record = await session.get(RefreshTokenModel, token_id)
    if token_record is None:
        return

    if token_record.revoked_at is None:
        token_record.revoked_at = utc_now()
        await session.commit()
