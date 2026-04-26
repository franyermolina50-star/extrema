from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.controllers.purchase_controller import list_purchases, update_purchase_status
from backend.dependencies.auth import get_current_admin, require_csrf
from backend.db.session import get_db_session
from backend.schemas.purchase import PurchaseRead, PurchaseStatusUpdate

router = APIRouter(
    prefix="/admin/purchases",
    tags=["admin-purchases"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/", response_model=list[PurchaseRead])
async def admin_list_purchases(
    session: AsyncSession = Depends(get_db_session),
) -> list[PurchaseRead]:
    return await list_purchases(session)


@router.patch("/{purchase_id}/status", response_model=PurchaseRead)
async def admin_update_purchase_status(
    purchase_id: UUID,
    payload: PurchaseStatusUpdate,
    session: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_csrf),
) -> PurchaseRead:
    return await update_purchase_status(session, purchase_id=purchase_id, payload=payload)

