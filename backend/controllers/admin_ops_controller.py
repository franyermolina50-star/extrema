from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.security import utc_now
from backend.models.admin_ops import OnlinePaymentValidationModel, StoreSaleModel
from backend.models.enums import PurchaseStatusEnum
from backend.models.product import ProductModel
from backend.models.purchase import PurchaseModel
from backend.schemas.admin_ops import OnlinePaymentValidationUpsertRequest, StoreSaleCreateRequest


def _to_money(value: float | Decimal) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


async def list_store_sales(session: AsyncSession) -> list[StoreSaleModel]:
    stmt = select(StoreSaleModel).order_by(StoreSaleModel.created_at.desc())
    result = await session.scalars(stmt)
    return list(result)


async def create_store_sale(
    session: AsyncSession,
    payload: StoreSaleCreateRequest,
) -> StoreSaleModel:
    stmt = (
        select(ProductModel)
        .where(ProductModel.id == payload.product_id)
        .with_for_update()
    )
    product = await session.scalar(stmt)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado.")

    if payload.quantity > product.stock:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No hay inventario suficiente para registrar esta venta.",
        )

    unit_price = _to_money(payload.unit_price)
    expected_total = _to_money(unit_price * payload.quantity)
    paid_amount = _to_money(payload.paid_amount)
    validated = paid_amount >= expected_total

    product.stock -= payload.quantity

    sale = StoreSaleModel(
        product_id=product.id,
        product_name=product.name,
        quantity=payload.quantity,
        unit_price=unit_price,
        expected_total=expected_total,
        paid_amount=paid_amount,
        validated=validated,
    )
    session.add(sale)
    await session.commit()
    await session.refresh(sale)
    return sale


async def list_online_validations(session: AsyncSession) -> list[OnlinePaymentValidationModel]:
    stmt = select(OnlinePaymentValidationModel).order_by(OnlinePaymentValidationModel.validated_at.desc())
    result = await session.scalars(stmt)
    return list(result)


async def upsert_online_validation(
    session: AsyncSession,
    payload: OnlinePaymentValidationUpsertRequest,
) -> OnlinePaymentValidationModel:
    purchase = await session.get(PurchaseModel, payload.purchase_id)
    if purchase is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compra no encontrada.")

    paid_amount = _to_money(payload.paid_amount)
    validated = (
        purchase.status != PurchaseStatusEnum.CANCELLED
        and paid_amount >= _to_money(purchase.total)
    )

    existing = await session.get(OnlinePaymentValidationModel, payload.purchase_id)
    if existing is None:
        validation = OnlinePaymentValidationModel(
            purchase_id=payload.purchase_id,
            paid_amount=paid_amount,
            validated=validated,
        )
        session.add(validation)
    else:
        existing.paid_amount = paid_amount
        existing.validated = validated
        existing.validated_at = utc_now()
        validation = existing

    await session.commit()
    await session.refresh(validation)
    return validation
