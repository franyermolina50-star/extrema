from __future__ import annotations

from enum import StrEnum


class ProductCategoryEnum(StrEnum):
    PROTEINA = "proteina"
    CREATINA = "creatina"
    PREWORKOUT = "preworkout"
    VITAMINAS = "vitaminas"
    QUEMADOR = "quemador"


class ProductBadgeEnum(StrEnum):
    NEW = "new"
    HOT = "hot"
    SALE = "sale"


class PaymentMethodEnum(StrEnum):
    TRANSFERENCIA = "transferencia"
    CREDITO = "credito"
    PSE = "pse"


class PurchaseStatusEnum(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    SHIPPING = "shipping"
    CANCELLED = "cancelled"


class TokenTypeEnum(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"

