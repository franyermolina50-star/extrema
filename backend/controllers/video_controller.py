from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.video import VideoModel
from backend.schemas.video import VideoCreate, VideoUpdate


async def list_videos(
    session: AsyncSession,
    *,
    active_only: bool = False,
) -> list[VideoModel]:
    stmt = select(VideoModel)
    if active_only:
        stmt = stmt.where(VideoModel.active.is_(True))
    stmt = stmt.order_by(VideoModel.order.asc(), VideoModel.updated_at.desc())
    result = await session.scalars(stmt)
    return list(result)


async def create_video(session: AsyncSession, payload: VideoCreate) -> VideoModel:
    video = VideoModel(
        title=payload.title,
        subtitle=payload.subtitle,
        video_url=str(payload.video_url),
        cover_url=str(payload.cover_url),
        order=payload.order,
        active=payload.active,
    )
    session.add(video)
    await session.commit()
    await session.refresh(video)
    return video


async def update_video(
    session: AsyncSession,
    *,
    video_id: UUID,
    payload: VideoUpdate,
) -> VideoModel:
    video = await session.get(VideoModel, video_id)
    if video is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video no encontrado.")

    updates = payload.model_dump(exclude_none=True)
    for field_name, field_value in updates.items():
        if field_name in {"video_url", "cover_url"}:
            setattr(video, field_name, str(field_value))
        else:
            setattr(video, field_name, field_value)

    await session.commit()
    await session.refresh(video)
    return video


async def delete_video(session: AsyncSession, *, video_id: UUID) -> None:
    video = await session.get(VideoModel, video_id)
    if video is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video no encontrado.")
    await session.delete(video)
    await session.commit()

