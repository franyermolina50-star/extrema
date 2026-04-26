from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.controllers.product_controller import create_product, delete_product, list_products, update_product
from backend.dependencies.auth import get_current_admin, require_csrf
from backend.db.session import get_db_session
from backend.models.enums import ProductCategoryEnum
from backend.schemas.auth import MessageResponse
from backend.schemas.product import ProductCreate, ProductRead, ProductUpdate

router = APIRouter(
    prefix="/admin/products",
    tags=["admin-products"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/", response_model=list[ProductRead])
async def admin_list_products(
    active_only: bool = False,
    category: ProductCategoryEnum | None = None,
    session: AsyncSession = Depends(get_db_session),
) -> list[ProductRead]:
    return await list_products(session, active_only=active_only, category=category)


@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def admin_create_product(
    payload: ProductCreate,
    session: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_csrf),
) -> ProductRead:
    return await create_product(session, payload)


@router.patch("/{product_id}", response_model=ProductRead)
async def admin_update_product(
    product_id: UUID,
    payload: ProductUpdate,
    session: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_csrf),
) -> ProductRead:
    return await update_product(session, product_id=product_id, payload=payload)


@router.delete("/{product_id}", response_model=MessageResponse)
async def admin_delete_product(
    product_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    _: None = Depends(require_csrf),
) -> MessageResponse:
    await delete_product(session, product_id=product_id)
    return MessageResponse(message="Producto eliminado.")

