from __future__ import annotations

import secrets
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import get_settings
from backend.core.security import TokenValidationError, decode_token
from backend.db.session import get_db_session
from backend.models.admin import AdminUserModel
from backend.models.enums import TokenTypeEnum


def _extract_bearer_token(request: Request) -> str | None:
    auth_header = request.headers.get("authorization", "")
    prefix = "bearer "
    if auth_header.lower().startswith(prefix):
        return auth_header[len(prefix) :].strip()
    return None


def validate_csrf_header_and_cookie(request: Request) -> str:
    settings = get_settings()
    header_token = request.headers.get("x-csrf-token")
    cookie_token = request.cookies.get(settings.csrf_cookie_name)

    if not header_token or not cookie_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token requerido.",
        )

    if not secrets.compare_digest(header_token, cookie_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token invalido.",
        )

    return header_token


async def get_current_admin(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> AdminUserModel:
    settings = get_settings()
    access_token = request.cookies.get(settings.access_cookie_name) or _extract_bearer_token(request)
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No hay sesion activa.",
        )

    try:
        payload = decode_token(access_token, TokenTypeEnum.ACCESS)
        user_id = UUID(str(payload["sub"]))
        csrf_claim = str(payload.get("csrf", ""))
    except (TokenValidationError, ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acceso invalido o expirado.",
        ) from exc

    if not csrf_claim:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acceso incompleto.",
        )

    user = await session.get(AdminUserModel, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario sin permisos.",
        )

    request.state.csrf_claim = csrf_claim
    return user


async def require_csrf(request: Request) -> None:
    header_token = validate_csrf_header_and_cookie(request)
    expected_claim = getattr(request.state, "csrf_claim", None)
    if expected_claim and not secrets.compare_digest(header_token, expected_claim):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token no coincide con la sesion.",
        )

