from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.controllers.auth_controller import (
    change_admin_credentials,
    login_admin,
    revoke_refresh_session,
    rotate_refresh_session,
)
from backend.core.config import get_settings
from backend.dependencies.auth import get_current_admin, validate_csrf_header_and_cookie
from backend.db.session import get_db_session
from backend.models.admin import AdminUserModel
from backend.schemas.auth import (
    AdminCredentialChangeRequest,
    AdminIdentity,
    AdminLoginRequest,
    AuthSessionResponse,
    MeResponse,
    MessageResponse,
)
from backend.services.cookie_service import clear_auth_cookies, set_auth_cookies
from backend.services.rate_limit_service import credential_change_rate_limiter, login_rate_limiter

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_key(request: Request) -> str:
    if request.client:
        return request.client.host
    return "unknown"


def _build_session_response(
    *,
    user: AdminUserModel,
    access_expires_at,
    refresh_expires_at,
    csrf_token: str,
) -> AuthSessionResponse:
    return AuthSessionResponse(
        user=AdminIdentity(id=user.id, email=user.email),
        access_expires_at=access_expires_at,
        refresh_expires_at=refresh_expires_at,
        csrf_token=csrf_token,
    )


@router.post("/change-credentials", response_model=AuthSessionResponse)
async def change_credentials(
    payload: AdminCredentialChangeRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db_session),
) -> AuthSessionResponse:
    key = _client_key(request)
    if not credential_change_rate_limiter.allow(key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Espera un minuto e intenta de nuevo.",
        )

    auth_session = await change_admin_credentials(
        session,
        request=request,
        current_email=payload.current_email,
        current_password=payload.current_password,
        new_email=payload.new_email,
        new_password=payload.new_password,
    )
    if auth_session is None:
        credential_change_rate_limiter.add_failure(key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invalidas.",
        )

    credential_change_rate_limiter.reset(key)
    set_auth_cookies(
        response,
        access_token=auth_session.access_token.token,
        refresh_token=auth_session.refresh_token.token,
        csrf_token=auth_session.access_token.csrf_token,
    )
    return _build_session_response(
        user=auth_session.user,
        access_expires_at=auth_session.access_token.expires_at,
        refresh_expires_at=auth_session.refresh_token.expires_at,
        csrf_token=auth_session.access_token.csrf_token,
    )


@router.post("/login", response_model=AuthSessionResponse)
async def login(
    payload: AdminLoginRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db_session),
) -> AuthSessionResponse:
    key = _client_key(request)
    if not login_rate_limiter.allow(key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos de login. Espera un minuto e intenta de nuevo.",
        )

    auth_session = await login_admin(
        session,
        request=request,
        email=payload.email,
        password=payload.password,
    )
    if auth_session is None:
        login_rate_limiter.add_failure(key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invalidas.",
        )

    login_rate_limiter.reset(key)
    set_auth_cookies(
        response,
        access_token=auth_session.access_token.token,
        refresh_token=auth_session.refresh_token.token,
        csrf_token=auth_session.access_token.csrf_token,
    )
    return _build_session_response(
        user=auth_session.user,
        access_expires_at=auth_session.access_token.expires_at,
        refresh_expires_at=auth_session.refresh_token.expires_at,
        csrf_token=auth_session.access_token.csrf_token,
    )


@router.post("/refresh", response_model=AuthSessionResponse)
async def refresh_session(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db_session),
) -> AuthSessionResponse:
    validate_csrf_header_and_cookie(request)
    settings = get_settings()
    refresh_cookie = request.cookies.get(settings.refresh_cookie_name)
    if not refresh_cookie:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token no disponible.",
        )

    auth_session = await rotate_refresh_session(
        session,
        request=request,
        refresh_token=refresh_cookie,
    )
    set_auth_cookies(
        response,
        access_token=auth_session.access_token.token,
        refresh_token=auth_session.refresh_token.token,
        csrf_token=auth_session.access_token.csrf_token,
    )
    return _build_session_response(
        user=auth_session.user,
        access_expires_at=auth_session.access_token.expires_at,
        refresh_expires_at=auth_session.refresh_token.expires_at,
        csrf_token=auth_session.access_token.csrf_token,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    validate_csrf_header_and_cookie(request)
    settings = get_settings()
    refresh_cookie = request.cookies.get(settings.refresh_cookie_name)
    if refresh_cookie:
        await revoke_refresh_session(session, refresh_token=refresh_cookie)

    clear_auth_cookies(response)
    return MessageResponse(message="Sesion cerrada correctamente.")


@router.get("/me", response_model=MeResponse)
async def me(current_admin: AdminUserModel = Depends(get_current_admin)) -> MeResponse:
    return MeResponse(user=AdminIdentity(id=current_admin.id, email=current_admin.email))
