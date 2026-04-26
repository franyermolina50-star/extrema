from __future__ import annotations

from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.enums import PurchaseStatusEnum
from backend.models.purchase import PurchaseModel
from backend.models.product import ProductModel
from backend.models.video import VideoModel


async def get_overview_metrics(session: AsyncSession) -> dict[str, int | float]:
    total_products = (await session.scalar(select(func.count(ProductModel.id)))) or 0
    active_products = (
        await session.scalar(
            select(func.count(ProductModel.id)).where(ProductModel.active.is_(True))
        )
    ) or 0

    total_videos = (await session.scalar(select(func.count(VideoModel.id)))) or 0
    active_videos = (
        await session.scalar(select(func.count(VideoModel.id)).where(VideoModel.active.is_(True)))
    ) or 0

    total_purchases = (await session.scalar(select(func.count(PurchaseModel.id)))) or 0
    pending_purchases = (
        await session.scalar(
            select(func.count(PurchaseModel.id)).where(
                PurchaseModel.status == PurchaseStatusEnum.PENDING
            )
        )
    ) or 0

    gross_sales_raw = await session.scalar(
        select(func.coalesce(func.sum(PurchaseModel.total), Decimal("0.00")))
    )
    gross_sales = float(gross_sales_raw or Decimal("0.00"))

    return {
        "total_products": int(total_products),
        "active_products": int(active_products),
        "total_videos": int(total_videos),
        "active_videos": int(active_videos),
        "total_purchases": int(total_purchases),
        "pending_purchases": int(pending_purchases),
        "gross_sales": gross_sales,
    }
