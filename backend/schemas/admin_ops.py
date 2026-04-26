from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field

from backend.schemas.base import CamelSchema


class StoreSaleCreateRequest(CamelSchema):
    product_id: UUID
    quantity: int = Field(ge=1, le=999)
    unit_price: float = Field(ge=0)
    paid_amount: float = Field(ge=0)


class StoreSaleRead(CamelSchema):
    id: UUID
    product_id: UUID | None
    product_name: str
    quantity: int
    unit_price: float
    expected_total: float
    paid_amount: float
    validated: bool
    created_at: datetime


class OnlinePaymentValidationUpsertRequest(CamelSchema):
    purchase_id: UUID
    paid_amount: float = Field(ge=0)


class OnlinePaymentValidationAmountUpdate(CamelSchema):
    paid_amount: float = Field(ge=0)


class OnlinePaymentValidationRead(CamelSchema):
    purchase_id: UUID
    paid_amount: float
    validated: bool
    validated_at: datetime


class AdminOpsStateRead(CamelSchema):
    store_sales: list[StoreSaleRead]
    online_validations: list[OnlinePaymentValidationRead]
