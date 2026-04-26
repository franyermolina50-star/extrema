from __future__ import annotations

from fastapi import Response

from backend.core.config import get_settings


def _base_cookie_options() -> dict[str, object]:
    settings = get_settings()
    options: dict[str, object] = {
        "path": "/",
        "secure": settings.secure_cookies,
        "samesite": settings.cookie_samesite,
    }
    if settings.cookie_domain:
        options["domain"] = settings.cookie_domain
    return options


def set_auth_cookies(
    response: Response,
    *,
    access_token: str,
    refresh_token: str,
    csrf_token: str,
) -> None:
    settings = get_settings()
    base_options = _base_cookie_options()

    response.set_cookie(
        key=settings.access_cookie_name,
        value=access_token,
        httponly=True,
        max_age=settings.access_token_ttl_minutes * 60,
        **base_options,
    )
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=refresh_token,
        httponly=True,
        max_age=settings.refresh_token_ttl_days * 24 * 60 * 60,
        **base_options,
    )
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=csrf_token,
        httponly=False,
        max_age=settings.refresh_token_ttl_days * 24 * 60 * 60,
        **base_options,
    )


def clear_auth_cookies(response: Response) -> None:
    settings = get_settings()
    base_options = _base_cookie_options()

    response.delete_cookie(key=settings.access_cookie_name, **base_options)
    response.delete_cookie(key=settings.refresh_cookie_name, **base_options)
    response.delete_cookie(key=settings.csrf_cookie_name, **base_options)

