from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.base import Base
from backend.models.enums import PaymentMethodEnum, PurchaseStatusEnum

if TYPE_CHECKING:
    from backend.models.product import ProductModel


class PurchaseModel(Base):
    __tablename__ = "purchases"
    __table_args__ = (CheckConstraint("total >= 0", name="purchases_total_non_negative"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_name: Mapped[str] = mapped_column(String(180), nullable=False)
    customer_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    customer_phone: Mapped[str] = mapped_column(String(50), nullable=False)
    payment_method: Mapped[PaymentMethodEnum] = mapped_column(
        Enum(PaymentMethodEnum, native_enum=False, length=32),
        nullable=False,
    )
    status: Mapped[PurchaseStatusEnum] = mapped_column(
        Enum(PurchaseStatusEnum, native_enum=False, length=32),
        nullable=False,
        default=PurchaseStatusEnum.PENDING,
        server_default=PurchaseStatusEnum.PENDING.value,
    )
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    items: Mapped[list["PurchaseItemModel"]] = relationship(
        back_populates="purchase",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class PurchaseItemModel(Base):
    __tablename__ = "purchase_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="purchase_items_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="purchase_items_unit_price_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    purchase_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
    )
    product_name: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    purchase: Mapped["PurchaseModel"] = relationship(back_populates="items")
    product: Mapped["ProductModel | None"] = relationship(lazy="joined")

