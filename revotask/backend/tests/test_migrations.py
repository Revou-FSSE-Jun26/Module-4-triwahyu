import os
from pathlib import Path

import pytest
from flask_migrate import check, downgrade, upgrade
from sqlalchemy import inspect, text

from app import create_app
from app.extensions import db
from tests.conftest import resolve_test_database_uri

MIGRATIONS = str(Path(__file__).resolve().parents[1] / "migrations")
TABLES = {"users", "boards", "board_members", "columns", "cards", "comments", "notifications"}


def _wipe():
    db.session.remove()
    db.drop_all()
    db.session.execute(text("DROP TABLE IF EXISTS alembic_version"))
    db.session.commit()


@pytest.fixture()
def empty_db(tmp_path):
    """An empty database: PostgreSQL when TEST_DATABASE_URL is set, otherwise a throwaway SQLite file."""
    uri = f"sqlite:///{tmp_path / 'migrate.db'}" if not os.getenv("TEST_DATABASE_URL") else resolve_test_database_uri()
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": uri,
            "SECRET_KEY": "m" * 40,
            "JWT_SECRET_KEY": "n" * 40,
        }
    )
    with app.app_context():
        _wipe()
        yield app
        _wipe()


def _tables() -> set[str]:
    return set(inspect(db.engine).get_table_names()) - {"alembic_version"}


def test_upgrade_creates_all_tables_and_downgrade_removes_them(empty_db):
    """REQ-FND-7: `flask db upgrade` builds the schema; `downgrade base` removes it; it can run again."""
    upgrade(directory=MIGRATIONS)
    assert _tables() == TABLES

    downgrade(directory=MIGRATIONS, revision="base")
    assert _tables() == set()

    upgrade(directory=MIGRATIONS)
    assert _tables() == TABLES


def test_card_table_matches_the_required_shape(empty_db):
    """REQ-FND-7 / REQ-CARD-1: cards have a UUID id, a Float order and the three audit timestamps."""
    upgrade(directory=MIGRATIONS)
    columns = {c["name"]: c for c in inspect(db.engine).get_columns("cards")}
    assert {"id", "order", "created_at", "updated_at", "deleted_at"} <= columns.keys()
    assert columns["order"]["nullable"] is False
    assert "FLOAT" in str(columns["order"]["type"]).upper() or "DOUBLE" in str(columns["order"]["type"]).upper()
    assert columns["deleted_at"]["nullable"] is True


def test_migration_matches_models_without_drift(empty_db):
    """REQ-FND-7: autogenerate finds nothing to change after upgrade (raises on drift)."""
    if db.engine.dialect.name != "postgresql":
        pytest.skip("Type reflection differs on SQLite; the drift check is authoritative on PostgreSQL.")
    upgrade(directory=MIGRATIONS)
    check(directory=MIGRATIONS)


def test_unique_membership_constraint_is_named(empty_db):
    """DB-07: the composite unique constraint has an explicit, accurate name."""
    upgrade(directory=MIGRATIONS)
    names = {u["name"] for u in inspect(db.engine).get_unique_constraints("board_members")}
    assert "uq_board_members_board_id_user_id" in names
