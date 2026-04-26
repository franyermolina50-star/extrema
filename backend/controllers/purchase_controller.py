from __future__ import annotations

from collections import Counter
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.product import ProductModel
from backend.models.purchase import PurchaseItemModel, PurchaseModel
from backend.schemas.purchase import CheckoutRequest, PurchaseStatusUpdate


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


async def create_checkout_purchase(
    session: AsyncSession,
    payload: CheckoutRequest,
) -> PurchaseModel:
    quantities = Counter()
    for item in payload.items:
        quantities[item.product_id] += item.quantity

    product_ids = list(quantities.keys())
    stmt = (
        select(ProductModel)
        .where(ProductModel.id.in_(product_ids))
        .with_for_update()
    )
    products_found = await session.scalars(stmt)
    products_by_id = {product.id: product for product in products_found}

    missing = [str(product_id) for product_id in product_ids if product_id not in products_by_id]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Productos inexistentes en el checkout: {', '.join(missing)}",
        )

    for product_id, requested_qty in quantities.items():
        product = products_by_id[product_id]
        if not product.active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El producto '{product.name}' no esta activo.",
            )
        if product.stock < requested_qty:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Stock insuficiente para '{product.name}'.",
            )

    purchase = PurchaseModel(
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        customer_phone=payload.customer_phone,
        payment_method=payload.payment_method,
        total=Decimal("0.00"),
    )
    session.add(purchase)
    await session.flush()

    total = Decimal("0.00")
    for product_id, requested_qty in quantities.items():
        product = products_by_id[product_id]
        unit_price = _money(product.price)
        line_total = unit_price * requested_qty

        product.stock -= requested_qty
        total += line_total

        session.add(
            PurchaseItemModel(
                purchase_id=purchase.id,
                product_id=product.id,
                product_name=product.name,
                quantity=requested_qty,
                unit_price=unit_price,
            )
        )

    purchase.total = _money(total)
    await session.commit()

    created_stmt = (
        select(PurchaseModel)
        .where(PurchaseModel.id == purchase.id)
        .options(selectinload(PurchaseModel.items))
    )
    created_purchase = await session.scalar(created_stmt)
    if created_purchase is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo recuperar la compra creada.",
        )
    return created_purchase


async def list_purchases(session: AsyncSession) -> list[PurchaseModel]:
    stmt = (
        select(PurchaseModel)
        .options(selectinload(PurchaseModel.items))
        .order_by(PurchaseModel.created_at.desc())
    )
    result = await session.scalars(stmt)
    return list(result)


async def update_purchase_status(
    session: AsyncSession,
    *,
    purchase_id: UUID,
    payload: PurchaseStatusUpdate,
) -> PurchaseModel:
    stmt = (
        select(PurchaseModel)
        .where(PurchaseModel.id == purchase_id)
        .options(selectinload(PurchaseModel.items))
    )
    purchase = await session.scalar(stmt)
    if purchase is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compra no encontrada.")

    purchase.status = payload.status
    await session.commit()
    return purchase

