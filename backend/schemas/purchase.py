from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field

from backend.models.enums import PaymentMethodEnum, PurchaseStatusEnum
from backend.schemas.base import CamelSchema


class CheckoutItemInput(CamelSchema):
    product_id: UUID
    quantity: int = Field(ge=1, le=99)


class CheckoutRequest(CamelSchema):
    customer_name: str = Field(min_length=3, max_length=180)
    customer_email: EmailStr
    customer_phone: str = Field(min_length=7, max_length=30, pattern=r"^[0-9+\-\s()]+$")
    payment_method: PaymentMethodEnum
    items: list[CheckoutItemInput] = Field(min_length=1, max_length=50)


class PurchaseItemRead(CamelSchema):
    product_id: UUID | None = None
    product_name: str
    quantity: int
    unit_price: float


class PurchaseRead(CamelSchema):
    id: UUID
    customer_name: str
    customer_email: EmailStr
    customer_phone: str
    payment_method: PaymentMethodEnum
    status: PurchaseStatusEnum
    items: list[PurchaseItemRead]
    total: float
    created_at: datetime


class PurchaseStatusUpdate(CamelSchema):
    status: PurchaseStatusEnum

