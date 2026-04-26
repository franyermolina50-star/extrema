from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def _load_local_env_file(path: Path | None = None) -> None:
    """Load a local .env file into the current process if it exists.

    Render will provide real environment variables, so this only fills in
    missing values when running the app locally.
    """

    env_path = path or Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            continue

        if key.startswith("export "):
            key = key.removeprefix("export ").strip()
            if not key:
                continue

        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]

        os.environ.setdefault(key, value)


_load_local_env_file()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False, extra="ignore")

    app_name: str = Field(default="APEX Backend API", alias="APP_NAME")
    app_env: Literal["development", "staging", "production"] = Field(
        default="production",
        alias="APP_ENV",
    )
    app_debug: bool = Field(default=False, alias="APP_DEBUG")
    api_prefix: str = Field(default="/api/v1", alias="API_PREFIX")

    database_url: str = Field(alias="DATABASE_URL")

    jwt_secret_key: str = Field(alias="JWT_SECRET_KEY", min_length=32)
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_ttl_minutes: int = Field(default=15, alias="ACCESS_TOKEN_TTL_MINUTES")
    refresh_token_ttl_days: int = Field(default=7, alias="REFRESH_TOKEN_TTL_DAYS")

    access_cookie_name: str = Field(default="apex_access_token", alias="ACCESS_COOKIE_NAME")
    refresh_cookie_name: str = Field(default="apex_refresh_token", alias="REFRESH_COOKIE_NAME")
    csrf_cookie_name: str = Field(default="apex_csrf_token", alias="CSRF_COOKIE_NAME")
    secure_cookies: bool = Field(default=True, alias="SECURE_COOKIES")
    cookie_domain: str | None = Field(default=None, alias="COOKIE_DOMAIN")
    cookie_samesite: Literal["strict", "lax", "none"] = Field(
        default="strict",
        alias="COOKIE_SAMESITE",
    )

    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=list,
        alias="CORS_ORIGINS",
    )
    trusted_hosts: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["*"],
        alias="TRUSTED_HOSTS",
    )

    default_admin_email: str | None = Field(default=None, alias="DEFAULT_ADMIN_EMAIL")
    default_admin_password: str | None = Field(default=None, alias="DEFAULT_ADMIN_PASSWORD")
    auto_create_tables: bool = Field(default=False, alias="AUTO_CREATE_TABLES")

    login_max_attempts: int = Field(default=6, alias="LOGIN_MAX_ATTEMPTS")
    login_window_seconds: int = Field(default=60, alias="LOGIN_WINDOW_SECONDS")

    @field_validator("cors_origins", "trusted_hosts", mode="before")
    @classmethod
    def parse_csv_or_json_list(cls, value: str | list[str] | None) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        raw = value.strip()
        if not raw:
            return []

        if raw.startswith("["):
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]

        return [item.strip() for item in raw.split(",") if item.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
