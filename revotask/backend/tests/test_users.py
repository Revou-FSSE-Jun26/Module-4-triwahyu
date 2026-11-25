from tests.helpers import make_actor


def test_get_me_returns_profile_without_password(client):
    """REQ-USER-1: the profile is returned and never contains password data."""
    actor = make_actor(client, "Ada")
    status, body = actor.call("get", "/api/users/me")
    assert status == 200
    assert body["data"]["id"] == actor.id
    assert body["data"]["name"] == "Ada"
    assert not {"password", "password_hash"} & body["data"].keys()


def test_get_me_requires_token(client):
    """REQ-USER-1: no token is 401 in the error envelope."""
    response = client.get("/api/users/me")
    assert response.status_code == 401
    assert response.get_json()["code"] == "UNAUTHORIZED"


def test_get_me_rejects_garbage_token(client):
    """REQ-USER-1: a malformed token is 401, not 422."""
    response = client.get("/api/users/me", headers={"Authorization": "Bearer not.a.token"})
    assert response.status_code == 401


def test_patch_me_updates_name_and_email(client):
    """REQ-USER-2: name and email can be changed; email is normalized."""
    actor = make_actor(client)
    status, body = actor.call("patch", "/api/users/me", json={"name": "Grace", "email": "Grace@Example.com"})
    assert status == 200
    assert (body["data"]["name"], body["data"]["email"]) == ("Grace", "grace@example.com")
    assert actor.call("get", "/api/users/me")[1]["data"]["name"] == "Grace"


def test_patch_me_rejects_password_change(client):
    """REQ-USER-3: password cannot be changed through this endpoint."""
    actor = make_actor(client)
    status, body = actor.call("patch", "/api/users/me", json={"password": "NewPassw0rd"})
    assert status == 400
    assert "password" in body["details"]


def test_patch_me_rejects_empty_body_and_bad_email(client):
    """REQ-USER-2: an empty update and an invalid email are 400."""
    actor = make_actor(client)
    assert actor.call("patch", "/api/users/me", json={})[0] == 400
    assert actor.call("patch", "/api/users/me", json={"email": "nope"})[0] == 400


def test_patch_me_email_conflict(client):
    """REQ-USER-2: taking another user's email is 409."""
    first, second = make_actor(client), make_actor(client)
    status, body = second.call("patch", "/api/users/me", json={"email": first.email})
    assert (status, body["code"]) == (409, "CONFLICT")


def test_patch_me_keeping_own_email_is_allowed(client):
    """REQ-USER-2: re-sending your own email is not a conflict."""
    actor = make_actor(client)
    assert actor.call("patch", "/api/users/me", json={"email": actor.email})[0] == 200
