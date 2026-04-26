from __future__ import annotations

from typing import Literal

from fastapi import Request, UploadFile

from backend.services.media_service import save_media_file


async def upload_media_file(
    request: Request,
    *,
    upload_file: UploadFile,
    media_kind: Literal["image", "video"],
) -> str:
    relative_path = await save_media_file(upload_file, media_kind)
    return str(request.url_for("media", path=relative_path))
