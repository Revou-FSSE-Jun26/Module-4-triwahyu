import jwt as pyjwt
import pytest

from app.models import User
from tests.helpers import PASSWORD

VALID = {"name": "Ada Lovelace", "email": "ada@example.com", "password": PASSWORD}


def test_register_creates_user_with_hashed_password(client):
    """REQ-AUTH-1, REQ-NFR-1: 201, user returned without password, hash stored instead of plaintext."""
    response = client.post("/api/auth/register", json=VALID)
    assert response.status_code == 201
    user = response.get_json()["data"]["user"]
    assert user["email"] == "ada@example.com"
    assert "password" not in user and "password_hash" not in user
    stored = User.query.filter_by(email="ada@example.com").one()
    assert stored.password_hash != PASSWORD
    assert stored.password_hash.startswith("pbkdf2:")


def test_register_normalizes_email_case(client):
    """REQ-AUTH-1: emails are stored lower-case."""
    client.post("/api/auth/register", json={**VALID, "email": "ADA@Example.COM"})
    assert User.query.filter_by(email="ada@example.com").count() == 1


def test_register_duplicate_email_conflicts(client):
    """REQ-AUTH-2: a second registration with the same email is 409."""
    client.post("/api/auth/register", json=VALID)
    response = client.post("/api/auth/register", json={**VALID, "email": "ADA@example.com"})
    assert response.status_code == 409
    assert response.get_json()["code"] == "CONFLICT"


@pytest.mark.parametrize(
    "payload, field",
    [
        ({**VALID, "email": "not-an-email"}, "email"),
        ({**VALID, "password": "short1"}, "password"),
        ({**VALID, "password": "onlyletters"}, "password"),
        ({**VALID, "name": "   "}, "name"),
        ({"email": "a@b.co", "password": PASSWORD}, "name"),
        ({**VALID, "is_admin": True}, "is_admin"),
    ],
)
def test_register_rejects_invalid_input(client, payload, field):
    """REQ-AUTH-2: invalid or unknown fields give 400 with field-level details."""
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    body = response.get_json()
    assert body["code"] == "VALIDATION_ERROR"
    assert field in body["details"]
    assert body["error"].startswith("Validation failed")


def test_register_requires_json_object(client):
    """REQ-AUTH-2: a non-JSON body is a 400, not a 500."""
    response = client.post("/api/auth/register", data="nope", content_type="text/plain")
    assert response.status_code == 400
    assert response.get_json()["code"] == "BAD_REQUEST"


def test_login_returns_jwt_with_expiry(client):
    """REQ-AUTH-3: login returns a bearer token whose `exp` matches expires_in."""
    client.post("/api/auth/register", json=VALID)
    response = client.post("/api/auth/login", json={"email": "ada@example.com", "password": PASSWORD})
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["token_type"] == "Bearer"
    assert data["expires_in"] == 3600
    claims = pyjwt.decode(data["access_token"], options={"verify_signature": False})
    assert claims["exp"] - claims["iat"] == 3600
    assert claims["sub"] == data["user"]["id"]


def test_login_failures_are_indistinguishable(client):
    """REQ-AUTH-4: unknown email and wrong password give the same 401 message."""
    client.post("/api/auth/register", json=VALID)
    wrong_password = client.post("/api/auth/login", json={"email": "ada@example.com", "password": "Wrong123x"})
    unknown_email = client.post("/api/auth/login", json={"email": "who@example.com", "password": PASSWORD})
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.get_json() == unknown_email.get_json()
    assert wrong_password.get_json()["error"] == "Invalid email or password"


def test_login_requires_both_fields(client):
    """REQ-AUTH-4: missing credentials are a 400."""
    assert client.post("/api/auth/login", json={"email": "a@b.co"}).status_code == 400


def test_register_creates_welcome_notification(client):
    """REQ-NOTIF-4: a new account starts with one unread welcome notification."""
    client.post("/api/auth/register", json=VALID)
    token = client.post("/api/auth/login", json={"email": "ada@example.com", "password": PASSWORD}).get_json()["data"][
        "access_token"
    ]
    body = client.get("/api/notifications", headers={"Authorization": f"Bearer {token}"}).get_json()["data"]
    assert body["unread_count"] == 1
    assert body["items"][0]["type"] == "welcome"
