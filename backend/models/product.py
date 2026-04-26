from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base
from backend.models.enums import ProductBadgeEnum, ProductCategoryEnum


class ProductModel(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price >= 0", name="products_price_non_negative"),
        CheckConstraint("old_price IS NULL OR old_price >= 0", name="products_old_price_non_negative"),
        CheckConstraint("stock >= 0", name="products_stock_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[ProductCategoryEnum] = mapped_column(
        Enum(ProductCategoryEnum, native_enum=False, length=32),
        index=True,
        nullable=False,
    )
    custom_category_label: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    old_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    image_url: Mapped[str] = mapped_column(String(1200), nullable=False)
    badge: Mapped[ProductBadgeEnum | None] = mapped_column(
        Enum(ProductBadgeEnum, native_enum=False, length=16),
        nullable=True,
    )
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
