from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import AnyHttpUrl, Field, model_validator

from backend.models.enums import ProductBadgeEnum, ProductCategoryEnum
from backend.schemas.base import CamelSchema


class ProductBase(CamelSchema):
    name: str = Field(min_length=2, max_length=120)
    category: ProductCategoryEnum
    custom_category_label: str | None = Field(default=None, max_length=120)
    description: str = Field(min_length=8, max_length=4000)
    price: float = Field(ge=0)
    old_price: float | None = Field(default=None, ge=0)
    image_url: AnyHttpUrl
    badge: ProductBadgeEnum | None = None
    stock: int = Field(ge=0, le=100000)
    active: bool = True

    @model_validator(mode="after")
    def validate_old_price(self) -> "ProductBase":
        if self.old_price is not None and self.old_price < self.price:
            raise ValueError("oldPrice no puede ser menor que price.")
        return self

    @model_validator(mode="after")
    def normalize_custom_category_label(self) -> "ProductBase":
        if self.custom_category_label is not None:
            normalized = self.custom_category_label.strip()
            self.custom_category_label = normalized or None
        return self


class ProductCreate(ProductBase):
    pass


class ProductUpdate(CamelSchema):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    category: ProductCategoryEnum | None = None
    custom_category_label: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, min_length=8, max_length=4000)
    price: float | None = Field(default=None, ge=0)
    old_price: float | None = Field(default=None, ge=0)
    image_url: AnyHttpUrl | None = None
    badge: ProductBadgeEnum | None = None
    stock: int | None = Field(default=None, ge=0, le=100000)
    active: bool | None = None

    @model_validator(mode="after")
    def validate_not_empty(self) -> "ProductUpdate":
        if not self.model_dump(exclude_unset=True):
            raise ValueError("Debes enviar al menos un campo para actualizar.")
        return self

    @model_validator(mode="after")
    def validate_old_price(self) -> "ProductUpdate":
        if self.old_price is not None and self.price is not None and self.old_price < self.price:
            raise ValueError("oldPrice no puede ser menor que price.")
        return self

    @model_validator(mode="after")
    def normalize_custom_category_label(self) -> "ProductUpdate":
        if self.custom_category_label is not None:
            normalized = self.custom_category_label.strip()
            self.custom_category_label = normalized or None
        return self


class ProductRead(ProductBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
