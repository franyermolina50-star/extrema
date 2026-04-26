from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.controllers.video_controller import create_video, delete_video, list_videos, update_video
from backend.dependencies.auth import get_current_admin, require_csrf
from backend.db.session import get_db_session
from backend.schemas.auth import MessageResponse
from backend.schemas.video import VideoCreate, VideoRead, VideoUpdate

router = APIRouter(
    prefix="/admin/videos",
    tags=["admin-videos"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/", response_model=list[VideoRead])
async def admin_list_videos(
    active_only: bool = False,
    session: AsyncSession = Depends(get_db_session),
) -> list[VideoRead]:
    return await list_videos(session, active_only=active_only)


@router.post("/", response_model=VideoRead, status_code=status.HTTP_201_CREATED)
async def admin_create_video(
    payload: VideoCreate,
    session: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_csrf),
) -> VideoRead:
    return await create_video(session, payload)


@router.patch("/{video_id}", response_model=VideoRead)
async def admin_update_video(
    video_id: UUID,
    payload: VideoUpdate,
    session: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_csrf),
) -> VideoRead:
    return await update_video(session, video_id=video_id, payload=payload)


@router.delete("/{video_id}", response_model=MessageResponse)
async def admin_delete_video(
    video_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_csrf),
) -> MessageResponse:
    await delete_video(session, video_id=video_id)
    return MessageResponse(message="Video eliminado.")

