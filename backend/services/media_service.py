from __future__ import annotations

import asyncio
import shutil
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

MEDIA_ROOT = Path(__file__).resolve().parents[1] / "media"

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v", ".ogv"}

IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
}
VIDEO_CONTENT_TYPES = {
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-m4v",
    "video/ogg",
}

ContentType = Literal["image", "video"]


def _allowed_sets(media_kind: ContentType) -> tuple[set[str], set[str]]:
    if media_kind == "image":
        return IMAGE_EXTENSIONS, IMAGE_CONTENT_TYPES
    return VIDEO_EXTENSIONS, VIDEO_CONTENT_TYPES


def _normalize_extension(upload_file: UploadFile, media_kind: ContentType) -> str:
    allowed_extensions, allowed_content_types = _allowed_sets(media_kind)

    filename = upload_file.filename or ""
    suffix = Path(filename).suffix.lower()
    content_type = (upload_file.content_type or "").lower().strip()

    if suffix in allowed_extensions and (not content_type or content_type in allowed_content_types):
        return suffix

    if content_type in allowed_content_types:
        guessed_extension = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
            "image/avif": ".avif",
            "video/mp4": ".mp4",
            "video/webm": ".webm",
            "video/quicktime": ".mov",
            "video/x-m4v": ".m4v",
            "video/ogg": ".ogv",
        }.get(content_type)
        if guessed_extension in allowed_extensions:
            return guessed_extension

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="El archivo no tiene un formato permitido.",
    )


async def save_media_file(upload_file: UploadFile, media_kind: ContentType) -> str:
    allowed_extensions, _ = _allowed_sets(media_kind)
    extension = _normalize_extension(upload_file, media_kind)
    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no tiene un formato permitido.",
        )

    media_subdir = "images" if media_kind == "image" else "videos"
    relative_directory = MEDIA_ROOT / media_subdir
    relative_directory.mkdir(parents=True, exist_ok=True)

    stored_name = f"{uuid4().hex}{extension}"
    destination = relative_directory / stored_name

    def _copy_file() -> None:
        upload_file.file.seek(0)
        with destination.open("wb") as destination_file:
            shutil.copyfileobj(upload_file.file, destination_file)

    await asyncio.to_thread(_copy_file)
    await upload_file.close()

    return f"{media_subdir}/{stored_name}"
