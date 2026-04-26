from __future__ import annotations

import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import inspect, text
from sqlalchemy.exc import NoSuchTableError
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

# Allow running this file directly: `python backend/main.py`
if __package__ in {None, ""}:
    project_root = Path(__file__).resolve().parent.parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

import backend.models  # noqa: F401  # Ensure model metadata is registered.
from backend.controllers.auth_controller import ensure_default_admin
from backend.core.config import get_settings
from backend.core.middleware import RequestContextMiddleware, SecurityHeadersMiddleware
from backend.db.base import Base
from backend.db.session import async_session_factory, engine
from backend.routes.admin_ops_routes import router as admin_ops_router
from backend.routes.admin_overview_routes import router as admin_overview_router
from backend.routes.admin_media_routes import router as admin_media_router
from backend.routes.admin_product_routes import router as admin_product_router
from backend.routes.admin_purchase_routes import router as admin_purchase_router
from backend.routes.admin_video_routes import router as admin_video_router
from backend.routes.auth_routes import router as auth_router
from backend.routes.public_routes import router as public_router

MEDIA_ROOT = Path(__file__).resolve().parent / "media"
LOGGER = logging.getLogger("apex.backend")


def table_exists(sync_connection, table_name: str) -> bool:
    inspector = inspect(sync_connection)
    return table_name in inspector.get_table_names()


def ensure_runtime_schema(sync_connection) -> None:
    if not table_exists(sync_connection, "products"):
        LOGGER.warning(
            "Skipping runtime schema patch because the 'products' table does not exist yet."
        )
        return

    try:
        inspector = inspect(sync_connection)
        product_columns = {column["name"] for column in inspector.get_columns("products")}
    except NoSuchTableError:
        LOGGER.warning(
            "Skipping runtime schema patch because the 'products' table was not found."
        )
        return

    if "custom_category_label" not in product_columns:
        sync_connection.execute(
            text("ALTER TABLE products ADD COLUMN custom_category_label VARCHAR(120)")
        )

    sync_connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS idx_products_custom_category_label "
            "ON products (custom_category_label)"
        )
    )


def configure_logging() -> None:
    settings = get_settings()
    level = logging.DEBUG if settings.app_debug else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


@asynccontextmanager
async def app_lifespan(_: FastAPI):
    settings = get_settings()
    if settings.auto_create_tables:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    async with engine.begin() as connection:
        await connection.run_sync(ensure_runtime_schema)

    if settings.default_admin_email and settings.default_admin_password:
        async with engine.begin() as connection:
            admin_table_exists = await connection.run_sync(table_exists, "admin_users")

        if admin_table_exists:
            async with async_session_factory() as session:
                await ensure_default_admin(
                    session,
                    email=settings.default_admin_email,
                    password=settings.default_admin_password,
                )
        else:
            LOGGER.warning(
                "Skipping default admin bootstrap because the 'admin_users' table does not exist yet."
            )

    yield
    await engine.dispose()


def create_app() -> FastAPI:
    configure_logging()
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        debug=settings.app_debug,
        lifespan=app_lifespan,
        docs_url=f"{settings.api_prefix}/docs",
        openapi_url=f"{settings.api_prefix}/openapi.json",
        redoc_url=None,
    )

    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=MEDIA_ROOT), name="media")

    if settings.trusted_hosts:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts)

    app.add_middleware(SecurityHeadersMiddleware, enable_hsts=settings.is_production)
    app.add_middleware(RequestContextMiddleware)

    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
            allow_headers=[
                "Authorization",
                "Content-Type",
                "X-CSRF-Token",
                "X-Requested-With",
                "X-Request-ID",
            ],
            expose_headers=["X-Request-ID"],
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "detail": "La solicitud no cumple el esquema esperado.",
                "errors": exc.errors(),
                "requestId": getattr(request.state, "request_id", None),
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def db_exception_handler(request: Request, exc: SQLAlchemyError):
        logging.getLogger("apex.backend").exception("Database error", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Error interno de base de datos.",
                "requestId": getattr(request.state, "request_id", None),
            },
        )

    @app.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {"service": settings.app_name, "status": "ok"}

    app.include_router(public_router, prefix=settings.api_prefix)
    app.include_router(auth_router, prefix=settings.api_prefix)
    app.include_router(admin_overview_router, prefix=settings.api_prefix)
    app.include_router(admin_media_router, prefix=settings.api_prefix)
    app.include_router(admin_product_router, prefix=settings.api_prefix)
    app.include_router(admin_video_router, prefix=settings.api_prefix)
    app.include_router(admin_purchase_router, prefix=settings.api_prefix)
    app.include_router(admin_ops_router, prefix=settings.api_prefix)
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=False,
    )
