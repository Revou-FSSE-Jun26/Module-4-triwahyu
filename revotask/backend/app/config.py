"""Application configuration. The only module that reads os.environ (guideline BE-10)."""

import logging
import os
import secrets
from datetime import timedelta

from dotenv import load_dotenv

log = logging.getLogger(__name__)

MIN_SECRET_LENGTH = 32


def normalize_database_url(url: str) -> str:
    """Point hosted `postgres://` and `postgresql://` URLs at the psycopg 3 driver (DB-10)."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


def split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def build_config(overrides: dict | None = None) -> dict:
    """Build the Flask config from the environment, then apply explicit overrides (tests)."""
    load_dotenv()
    overrides = overrides or {}
    env = os.environ
    app_env = overrides.get("APP_ENV") or env.get("APP_ENV", "development")

    config = {
        "APP_ENV": app_env,
        "SECRET_KEY": env.get("SECRET_KEY", ""),
        "JWT_SECRET_KEY": env.get("JWT_SECRET_KEY", ""),
        "SQLALCHEMY_DATABASE_URI": normalize_database_url(env.get("DATABASE_URL", "")),
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        "SQLALCHEMY_ENGINE_OPTIONS": {"pool_pre_ping": True},
        "JWT_ACCESS_TOKEN_EXPIRES": timedelta(minutes=int(env.get("JWT_ACCESS_TOKEN_MINUTES", "60"))),
        "CORS_ORIGINS": split_csv(env.get("CORS_ORIGINS", "http://localhost:3000")),
        "PASSWORD_HASH_METHOD": "scrypt",
        "MAX_CONTENT_LENGTH": 1024 * 1024,
        "JSON_SORT_KEYS": False,
    }
    config.update(overrides)
    _validate(config)
    return config


def _validate(config: dict) -> None:
    if not config["SQLALCHEMY_DATABASE_URI"]:
        raise RuntimeError("DATABASE_URL is required. Copy backend/.env.example to backend/.env.")

    for key in ("SECRET_KEY", "JWT_SECRET_KEY"):
        value = config.get(key) or ""
        if config["APP_ENV"] == "production" and len(value) < MIN_SECRET_LENGTH:
            raise RuntimeError(f"{key} must be set to at least {MIN_SECRET_LENGTH} characters in production.")
        if not value:
            log.warning("%s is not set; using an ephemeral random value for this process.", key)
            config[key] = secrets.token_urlsafe(MIN_SECRET_LENGTH)
