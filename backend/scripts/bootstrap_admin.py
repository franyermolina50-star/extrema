from __future__ import annotations

import asyncio
import sys
from pathlib import Path

if __package__ in {None, ""}:
    project_root = Path(__file__).resolve().parent.parent.parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

from backend.controllers.auth_controller import ensure_default_admin
from backend.core.config import get_settings
from backend.db.session import async_session_factory


async def _bootstrap_default_admin() -> None:
    settings = get_settings()
    if not settings.default_admin_email or not settings.default_admin_password:
        raise RuntimeError(
            "Configura DEFAULT_ADMIN_EMAIL y DEFAULT_ADMIN_PASSWORD antes de ejecutar este script."
        )

    async with async_session_factory() as session:
        created = await ensure_default_admin(
            session,
            email=settings.default_admin_email,
            password=settings.default_admin_password,
        )

    if created:
        print("Admin inicial creado correctamente.")
    else:
        print("El admin inicial ya existia, no se realizaron cambios.")


if __name__ == "__main__":
    asyncio.run(_bootstrap_default_admin())
