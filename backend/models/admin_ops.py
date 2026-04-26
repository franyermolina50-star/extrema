from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.base import Base

if TYPE_CHECKING:
    from backend.models.product import ProductModel
    from backend.models.purchase import PurchaseModel


class StoreSaleModel(Base):
    __tablename__ = "store_sales"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="store_sales_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="store_sales_unit_price_non_negative"),
        CheckConstraint("expected_total >= 0", name="store_sales_expected_total_non_negative"),
        CheckConstraint("paid_amount >= 0", name="store_sales_paid_amount_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    expected_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    validated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    product: Mapped["ProductModel | None"] = relationship(lazy="joined")


class OnlinePaymentValidationModel(Base):
    __tablename__ = "online_payment_validations"
    __table_args__ = (
        CheckConstraint("paid_amount >= 0", name="online_validations_paid_amount_non_negative"),
    )

    purchase_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchases.id", ondelete="CASCADE"),
        primary_key=True,
    )
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    validated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    validated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    purchase: Mapped["PurchaseModel"] = relationship(lazy="joined")

