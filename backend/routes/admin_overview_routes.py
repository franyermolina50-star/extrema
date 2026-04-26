from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.controllers.overview_controller import get_overview_metrics
from backend.dependencies.auth import get_current_admin
from backend.db.session import get_db_session
from backend.schemas.overview import OverviewRead

router = APIRouter(
    prefix="/admin/overview",
    tags=["admin-overview"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/", response_model=OverviewRead)
async def admin_overview(
    session: AsyncSession = Depends(get_db_session),
) -> OverviewRead:
    metrics = await get_overview_metrics(session)
    return OverviewRead(**metrics)

