from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field

from backend.schemas.base import CamelSchema


class AdminLoginRequest(CamelSchema):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AdminCredentialChangeRequest(CamelSchema):
    current_email: EmailStr
    current_password: str = Field(min_length=8, max_length=128)
    new_email: EmailStr
    new_password: str = Field(min_length=8, max_length=128)


class AdminIdentity(CamelSchema):
    id: UUID
    email: EmailStr


class AuthSessionResponse(CamelSchema):
    user: AdminIdentity
    access_expires_at: datetime
    refresh_expires_at: datetime
    csrf_token: str = Field(min_length=24, max_length=128)


class MessageResponse(CamelSchema):
    message: str


class MeResponse(CamelSchema):
    user: AdminIdentity
