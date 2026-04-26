from __future__ import annotations

from backend.schemas.base import CamelSchema


class OverviewRead(CamelSchema):
    total_products: int
    active_products: int
    total_videos: int
    active_videos: int
    total_purchases: int
    pending_purchases: int
    gross_sales: float

