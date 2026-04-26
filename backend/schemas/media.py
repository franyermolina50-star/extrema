from __future__ import annotations

from backend.schemas.base import CamelSchema


class MediaUploadRead(CamelSchema):
    url: str
