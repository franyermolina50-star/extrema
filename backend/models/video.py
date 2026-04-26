from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class VideoModel(Base):
    __tablename__ = "videos"
    __table_args__ = (CheckConstraint('"order" >= 1', name="videos_order_positive"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    subtitle: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    video_url: Mapped[str] = mapped_column(String(1200), nullable=False)
    cover_url: Mapped[str] = mapped_column(String(1200), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

