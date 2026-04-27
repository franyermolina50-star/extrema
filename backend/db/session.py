from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from backend.core.config import get_settings

settings = get_settings()


def normalize_database_url(raw_url: str) -> str:
    """Adapt common Postgres URLs (Render/Supabase) to SQLAlchemy asyncpg."""
    if raw_url.startswith("postgresql+asyncpg://"):
        return raw_url
    if raw_url.startswith("postgres://"):
        return "postgresql+asyncpg://" + raw_url[len("postgres://") :]
    if raw_url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + raw_url[len("postgresql://") :]
    return raw_url


engine = create_async_engine(
    normalize_database_url(settings.database_url),
    pool_pre_ping=True,
    poolclass=NullPool,
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


async def ping_database() -> bool:
    async with async_session_factory() as session:
        await session.execute(text("SELECT 1"))
    return True
