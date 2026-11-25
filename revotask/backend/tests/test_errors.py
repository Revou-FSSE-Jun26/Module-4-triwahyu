import pytest

from app import create_app
from tests.helpers import make_actor


def test_expired_token_returns_401_envelope(client, app):
    """REQ-FND-2: an expired JWT is 401 with the standard error body."""
    from datetime import timedelta

    from flask_jwt_extended import create_access_token

    token = create_access_token(identity="00000000-0000-0000-0000-000000000000", expires_delta=timedelta(seconds=-5))
    response = client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.get_json() == {"error": "Authentication token has expired", "code": "UNAUTHORIZED"}


def test_success_responses_use_the_data_envelope(client):
    """REQ-FND-2: every success body has exactly one `data` key."""
    actor = make_actor(client)
    for url in ("/api/users/me", "/api/boards", "/api/notifications", "/api/cards?assignee=me"):
        body = actor.call("get", url)[1]
        assert list(body) == ["data"], url


def test_error_bodies_never_contain_internals(client):
    """REQ-FND-2: errors have `error` as a string and no stack or SQL text."""
    actor = make_actor(client)
    status, body = actor.call("post", "/api/boards", json={"name": 5})
    assert status == 400
    assert isinstance(body["error"], str)
    assert "Traceback" not in str(body) and "sqlalchemy" not in str(body).lower()


def test_unexpected_exception_is_a_generic_500():
    """REQ-FND-2: a crash returns a generic 500 and does not leak the exception text."""
    app = create_app(
        {"TESTING": False, "SQLALCHEMY_DATABASE_URI": "sqlite://", "SECRET_KEY": "k" * 40, "JWT_SECRET_KEY": "j" * 40}
    )

    @app.get("/boom")
    def boom():
        raise RuntimeError("secret-internal-detail postgres://user:pw@host")

    response = app.test_client().get("/boom")
    assert response.status_code == 500
    assert response.get_json() == {"error": "Internal server error", "code": "INTERNAL_ERROR"}


def test_health_reports_503_when_database_is_down(client, monkeypatch):
    """REQ-FND-1: a dead database is 503, not a false 200."""
    from app.blueprints.health import service

    def fail(*_a, **_k):
        raise RuntimeError("connection refused")

    monkeypatch.setattr(service.db.session, "execute", fail)
    response = client.get("/api/health")
    assert response.status_code == 503
    assert response.get_json()["code"] == "SERVICE_UNAVAILABLE"


@pytest.mark.parametrize("body", ['{"name": "x"', "[1, 2]", '"text"'])
def test_malformed_json_is_400(client, body):
    """REQ-FND-2: malformed or non-object JSON is a 400."""
    actor = make_actor(client)
    response = client.post("/api/boards", data=body, content_type="application/json", headers=actor.headers)
    assert response.status_code == 400
