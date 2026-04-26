from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.core.config import get_settings
from backend.models.enums import TokenTypeEnum

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


class TokenValidationError(ValueError):
    """Raised when a JWT token is missing, malformed, expired or invalid."""


@dataclass(frozen=True)
class AccessTokenBundle:
    token: str
    expires_at: datetime
    csrf_token: str


@dataclass(frozen=True)
class RefreshTokenBundle:
    token: str
    expires_at: datetime
    jti: UUID


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token_value(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _build_token_payload(
    *,
    user_id: UUID,
    token_type: TokenTypeEnum,
    expires_at: datetime,
    csrf_token: str | None = None,
    jti: UUID | None = None,
) -> dict[str, Any]:
    now = utc_now()
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "typ": token_type.value,
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "jti": str(jti or uuid4()),
    }
    if csrf_token is not None:
        payload["csrf"] = csrf_token
    return payload


def create_access_token(user_id: UUID) -> AccessTokenBundle:
    settings = get_settings()
    csrf_token = generate_csrf_token()
    expires_at = utc_now() + timedelta(minutes=settings.access_token_ttl_minutes)
    payload = _build_token_payload(
        user_id=user_id,
        token_type=TokenTypeEnum.ACCESS,
        expires_at=expires_at,
        csrf_token=csrf_token,
    )
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return AccessTokenBundle(token=token, expires_at=expires_at, csrf_token=csrf_token)


def create_refresh_token(user_id: UUID) -> RefreshTokenBundle:
    settings = get_settings()
    expires_at = utc_now() + timedelta(days=settings.refresh_token_ttl_days)
    token_id = uuid4()
    payload = _build_token_payload(
        user_id=user_id,
        token_type=TokenTypeEnum.REFRESH,
        expires_at=expires_at,
        jti=token_id,
    )
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return RefreshTokenBundle(token=token, expires_at=expires_at, jti=token_id)


def decode_token(token: str, expected_type: TokenTypeEnum) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:  # pragma: no cover - handled via integration.
        raise TokenValidationError("Token invalido o expirado.") from exc

    token_type = payload.get("typ")
    if token_type != expected_type.value:
        raise TokenValidationError("Tipo de token no permitido para esta operacion.")
    return payload

