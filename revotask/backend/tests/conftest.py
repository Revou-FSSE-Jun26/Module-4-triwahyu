import os

import pytest
from sqlalchemy.engine import make_url

from app import create_app
from app.extensions import db


def resolve_test_database_uri() -> str:
    """SQLite by default. TEST_DATABASE_URL runs the suite on PostgreSQL, but only on a database whose
    name contains "test": the fixtures drop every table, so pointing them at a dev database would wipe it."""
    uri = os.getenv("TEST_DATABASE_URL", "sqlite://")
    database = make_url(uri).database or ""
    if not uri.startswith("sqlite") and "test" not in database.lower():
        raise RuntimeError(
            f"Refusing to run tests against database {database!r}: the tests drop all tables. "
            "Create a separate database whose name contains 'test' (for example revotask_test)."
        )
    return uri


@pytest.fixture()
def app():
    """A fresh app and schema per test."""
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": resolve_test_database_uri(),
            "SECRET_KEY": "test-secret-key-0123456789-abcdefghij",
            "JWT_SECRET_KEY": "test-jwt-secret-0123456789-abcdefghij",
            "PASSWORD_HASH_METHOD": "pbkdf2:sha256:1000",  # fast hashing in tests only
        }
    )
    with app.app_context():
        db.drop_all()
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()
