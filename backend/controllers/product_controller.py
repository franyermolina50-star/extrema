from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.enums import ProductCategoryEnum
from backend.models.product import ProductModel
from backend.schemas.product import ProductCreate, ProductUpdate


def _to_money(value: float | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


async def list_products(
    session: AsyncSession,
    *,
    active_only: bool = False,
    category: ProductCategoryEnum | None = None,
) -> list[ProductModel]:
    stmt = select(ProductModel)
    if active_only:
        stmt = stmt.where(ProductModel.active.is_(True))
    if category is not None:
        stmt = stmt.where(ProductModel.category == category)
    stmt = stmt.order_by(ProductModel.updated_at.desc())
    result = await session.scalars(stmt)
    return list(result)


async def create_product(session: AsyncSession, payload: ProductCreate) -> ProductModel:
    product = ProductModel(
        name=payload.name,
        category=payload.category,
        custom_category_label=payload.custom_category_label,
        description=payload.description,
        price=_to_money(payload.price),
        old_price=_to_money(payload.old_price),
        image_url=str(payload.image_url),
        badge=payload.badge,
        stock=payload.stock,
        active=payload.active,
    )
    session.add(product)
    await session.commit()
    await session.refresh(product)
    return product


async def update_product(
    session: AsyncSession,
    *,
    product_id: UUID,
    payload: ProductUpdate,
) -> ProductModel:
    product = await session.get(ProductModel, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado.")

    updates = payload.model_dump(exclude_unset=True)
    for field_name, field_value in updates.items():
        if field_name in {"price", "old_price"}:
            setattr(product, field_name, _to_money(field_value))
        elif field_name in {"image_url", "custom_category_label"}:
            setattr(product, field_name, None if field_value is None else str(field_value))
        else:
            setattr(product, field_name, field_value)

    await session.commit()
    await session.refresh(product)
    return product


async def delete_product(session: AsyncSession, *, product_id: UUID) -> None:
    product = await session.get(ProductModel, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado.")
    await session.delete(product)
    await session.commit()
