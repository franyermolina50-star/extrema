from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.controllers.admin_ops_controller import (
    create_store_sale,
    list_online_validations,
    list_store_sales,
    upsert_online_validation,
)
from backend.dependencies.auth import get_current_admin, require_csrf
from backend.db.session import get_db_session
from backend.schemas.admin_ops import (
    AdminOpsStateRead,
    OnlinePaymentValidationAmountUpdate,
    OnlinePaymentValidationRead,
    OnlinePaymentValidationUpsertRequest,
    StoreSaleCreateRequest,
    StoreSaleRead,
)

router = APIRouter(
    prefix="/admin/ops",
    tags=["admin-ops"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/state", response_model=AdminOpsStateRead)
async def admin_ops_state(session: AsyncSession = Depends(get_db_session)) -> AdminOpsStateRead:
    store_sales = await list_store_sales(session)
    online_validations = await list_online_validations(session)
    return AdminOpsStateRead(
        store_sales=store_sales,
        online_validations=online_validations,
    )


@router.get("/store-sales", response_model=list[StoreSaleRead])
async def admin_list_store_sales(
    session: AsyncSession = Depends(get_db_session),
) -> list[StoreSaleRead]:
    return await list_store_sales(session)


@router.post("/store-sales", response_model=StoreSaleRead, status_code=201)
async def admin_create_store_sale(
    payload: StoreSaleCreateRequest,
    session: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_csrf),
) -> StoreSaleRead:
    return await create_store_sale(session, payload)


@router.get("/online-validations", response_model=list[OnlinePaymentValidationRead])
async def admin_list_online_validations(
    session: AsyncSession = Depends(get_db_session),
) -> list[OnlinePaymentValidationRead]:
    return await list_online_validations(session)


@router.put("/online-validations/{purchase_id}", response_model=OnlinePaymentValidationRead)
async def admin_upsert_online_validation(
    purchase_id: UUID,
    payload: OnlinePaymentValidationAmountUpdate,
    session: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_csrf),
) -> OnlinePaymentValidationRead:
    request_payload = OnlinePaymentValidationUpsertRequest(
        purchase_id=purchase_id,
        paid_amount=payload.paid_amount,
    )
    return await upsert_online_validation(session, request_payload)

