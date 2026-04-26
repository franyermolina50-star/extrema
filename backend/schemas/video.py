from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import AnyHttpUrl, Field, model_validator

from backend.schemas.base import CamelSchema


class VideoBase(CamelSchema):
    title: str = Field(min_length=2, max_length=180)
    subtitle: str = Field(default="", max_length=2000)
    video_url: AnyHttpUrl
    cover_url: AnyHttpUrl
    order: int = Field(ge=1, le=5000)
    active: bool = True


class VideoCreate(VideoBase):
    pass


class VideoUpdate(CamelSchema):
    title: str | None = Field(default=None, min_length=2, max_length=180)
    subtitle: str | None = Field(default=None, max_length=2000)
    video_url: AnyHttpUrl | None = None
    cover_url: AnyHttpUrl | None = None
    order: int | None = Field(default=None, ge=1, le=5000)
    active: bool | None = None

    @model_validator(mode="after")
    def validate_not_empty(self) -> "VideoUpdate":
        if not self.model_dump(exclude_none=True):
            raise ValueError("Debes enviar al menos un campo para actualizar.")
        return self


class VideoRead(VideoBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

