from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.controllers.product_controller import list_products
from backend.controllers.purchase_controller import create_checkout_purchase
from backend.controllers.video_controller import list_videos
from backend.db.session import get_db_session, ping_database
from backend.models.enums import ProductCategoryEnum
from backend.schemas.product import ProductRead
from backend.schemas.purchase import CheckoutRequest, PurchaseRead
from backend.schemas.video import VideoRead

router = APIRouter(tags=["public"])


@router.get("/health")
async def health() -> dict[str, str]:
    await ping_database()
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/store/products", response_model=list[ProductRead])
async def get_store_products(
    active_only: bool = Query(default=True),
    category: ProductCategoryEnum | None = Query(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> list[ProductRead]:
    return await list_products(session, active_only=active_only, category=category)


@router.get("/store/videos", response_model=list[VideoRead])
async def get_store_videos(
    active_only: bool = Query(default=True),
    session: AsyncSession = Depends(get_db_session),
) -> list[VideoRead]:
    return await list_videos(session, active_only=active_only)


@router.post("/store/checkout", response_model=PurchaseRead, status_code=201)
async def checkout_store_purchase(
    payload: CheckoutRequest,
    session: AsyncSession = Depends(get_db_session),
) -> PurchaseRead:
    return await create_checkout_purchase(session, payload)

