from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile, status

from backend.controllers.media_controller import upload_media_file
from backend.dependencies.auth import get_current_admin, require_csrf
from backend.schemas.media import MediaUploadRead

router = APIRouter(
    prefix="/admin/media",
    tags=["admin-media"],
    dependencies=[Depends(get_current_admin)],
)


@router.post("/upload", response_model=MediaUploadRead, status_code=status.HTTP_201_CREATED)
async def admin_upload_media(
    request: Request,
    file: UploadFile = File(...),
    kind: Literal["image", "video"] = Form(...),
    _: None = Depends(require_csrf),
) -> MediaUploadRead:
    url = await upload_media_file(request, upload_file=file, media_kind=kind)
    return MediaUploadRead(url=url)
