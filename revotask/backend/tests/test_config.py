import pytest
from sqlalchemy.pool import NullPool

from app import create_app
from app.config import build_config, engine_options, normalize_database_url, split_csv

LONG = "x" * 40


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for key in (
        "APP_ENV",
        "SECRET_KEY",
        "JWT_SECRET_KEY",
        "DATABASE_URL",
        "CORS_ORIGINS",
        "JWT_ACCESS_TOKEN_MINUTES",
        "VERCEL",
    ):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setattr("app.config.load_dotenv", lambda *a, **k: None)  # ignore a developer's .env


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("postgres://u:p@h:5432/db", "postgresql+psycopg://u:p@h:5432/db"),
        ("postgresql://u:p@h/db?sslmode=require", "postgresql+psycopg://u:p@h/db?sslmode=require"),
        ("postgresql+psycopg://u:p@h/db", "postgresql+psycopg://u:p@h/db"),
        ("sqlite://", "sqlite://"),
    ],
)
def test_database_url_is_normalized_for_psycopg(raw, expected):
    """REQ-FND-3 (DB-10): hosted URLs are pointed at the psycopg 3 driver."""
    assert normalize_database_url(raw) == expected


def test_split_csv_trims_and_drops_blanks():
    """REQ-FND-3: CORS_ORIGINS accepts a comma-separated list."""
    assert split_csv(" https://a.app , ,http://localhost:3000 ") == ["https://a.app", "http://localhost:3000"]


def test_database_url_is_required():
    """REQ-FND-3: startup fails fast without DATABASE_URL."""
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        build_config()


def test_production_requires_long_secrets(monkeypatch):
    """REQ-FND-3 (BE-10): production refuses missing or short secrets."""
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@h/db")
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        build_config()
    monkeypatch.setenv("SECRET_KEY", LONG)
    monkeypatch.setenv("JWT_SECRET_KEY", "short")
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        build_config()
    monkeypatch.setenv("JWT_SECRET_KEY", LONG)
    assert build_config()["SQLALCHEMY_DATABASE_URI"].startswith("postgresql+psycopg://")


def test_development_generates_ephemeral_secrets(monkeypatch):
    """REQ-FND-3: no hardcoded secret exists; dev gets random per-process values."""
    monkeypatch.setenv("DATABASE_URL", "sqlite://")
    first, second = build_config(), build_config()
    assert len(first["SECRET_KEY"]) >= 32 and first["JWT_SECRET_KEY"] != first["SECRET_KEY"]
    assert first["SECRET_KEY"] != second["SECRET_KEY"]


def test_cors_origins_and_token_lifetime_come_from_env(monkeypatch):
    """REQ-FND-3: the scaffold ignored CORS_ORIGINS; it is now read from the environment."""
    monkeypatch.setenv("DATABASE_URL", "sqlite://")
    monkeypatch.setenv("CORS_ORIGINS", "https://revotask.vercel.app,http://localhost:3000")
    monkeypatch.setenv("JWT_ACCESS_TOKEN_MINUTES", "15")
    config = build_config()
    assert config["CORS_ORIGINS"] == ["https://revotask.vercel.app", "http://localhost:3000"]
    assert config["JWT_ACCESS_TOKEN_EXPIRES"].total_seconds() == 900


def test_cors_allows_only_configured_origins():
    """REQ-FND-3: preflight succeeds for a configured origin and omits CORS headers for others."""
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite://",
            "CORS_ORIGINS": ["https://good.app"],
            "SECRET_KEY": LONG,
            "JWT_SECRET_KEY": LONG,
        }
    )
    client = app.test_client()
    headers = {"Access-Control-Request-Method": "PATCH", "Access-Control-Request-Headers": "authorization"}
    good = client.options("/api/boards", headers={**headers, "Origin": "https://good.app"})
    bad = client.options("/api/boards", headers={**headers, "Origin": "https://evil.app"})
    assert good.headers.get("Access-Control-Allow-Origin") == "https://good.app"
    assert "PATCH" in good.headers.get("Access-Control-Allow-Methods", "")
    assert bad.headers.get("Access-Control-Allow-Origin") is None


def test_test_suite_refuses_a_non_test_database(monkeypatch):
    """The fixtures drop every table, so they must never run against a dev database (found the hard way)."""
    from tests.conftest import resolve_test_database_uri

    monkeypatch.setenv("TEST_DATABASE_URL", "postgresql+psycopg://u@localhost/revotask")
    with pytest.raises(RuntimeError, match="Refusing to run tests"):
        resolve_test_database_uri()
    monkeypatch.setenv("TEST_DATABASE_URL", "postgresql+psycopg://u@localhost/revotask_test")
    assert resolve_test_database_uri().endswith("/revotask_test")
    monkeypatch.delenv("TEST_DATABASE_URL")
    assert resolve_test_database_uri() == "sqlite://"


PG_URL = "postgresql+psycopg://u:p@host/db"


def test_long_running_servers_keep_a_pre_pinged_pool():
    """DB-10: the default engine options are unchanged for Gunicorn-style deployments."""
    assert engine_options(PG_URL, serverless=False) == {"pool_pre_ping": True}


def test_serverless_postgres_uses_no_pool_and_no_prepared_statements():
    """DB-10: on Vercel each request opens its own connection and avoids prepared statements (poolers)."""
    options = engine_options(PG_URL, serverless=True)
    assert options["poolclass"] is NullPool
    assert options["connect_args"] == {"prepare_threshold": None}


def test_serverless_sqlite_gets_no_postgres_only_connect_args():
    """DB-10: psycopg-only arguments are not passed to other drivers."""
    assert engine_options("sqlite://", serverless=True) == {"poolclass": NullPool}


def test_vercel_environment_selects_serverless_options(monkeypatch):
    """REQ-FND-3: VERCEL=1 switches the real config; leaving it unset keeps the default."""
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@host/db")
    assert build_config()["SQLALCHEMY_ENGINE_OPTIONS"] == {"pool_pre_ping": True}
    monkeypatch.setenv("VERCEL", "1")
    options = build_config()["SQLALCHEMY_ENGINE_OPTIONS"]
    assert options["poolclass"] is NullPool and options["connect_args"] == {"prepare_threshold": None}
