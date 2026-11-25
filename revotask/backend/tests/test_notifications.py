import uuid

from app.extensions import db
from app.models import Notification
from tests.helpers import make_actor


def _seed(actor, count):
    for i in range(count):
        db.session.add(Notification(user_id=uuid.UUID(actor.id), type="member_added", message=f"n{i}"))
    db.session.commit()


def test_list_is_paginated_newest_first(client):
    """REQ-NOTIF-1: page and per_page slice the list; totals and pages are returned."""
    actor = make_actor(client)
    _seed(actor, 24)  # plus the welcome notification = 25
    status, body = actor.call("get", "/api/notifications?page=1&per_page=10")
    data = body["data"]
    assert status == 200
    assert (data["page"], data["per_page"], data["total"], data["pages"]) == (1, 10, 25, 3)
    assert len(data["items"]) == 10
    assert data["unread_count"] == 25
    last = actor.call("get", "/api/notifications?page=3&per_page=10")[1]["data"]
    assert len(last["items"]) == 5
    assert last["items"][-1]["type"] == "welcome"


def test_defaults_and_limits(client):
    """REQ-NOTIF-1: defaults are page 1 / 20 per page; invalid values are 400."""
    actor = make_actor(client)
    data = actor.call("get", "/api/notifications")[1]["data"]
    assert (data["page"], data["per_page"]) == (1, 20)
    for query in ("page=0", "per_page=0", "per_page=101", "per_page=abc", "page=-1"):
        assert actor.call("get", f"/api/notifications?{query}")[0] == 400


def test_notifications_require_token_and_are_private(client):
    """REQ-NOTIF-1: 401 without a token; users only see their own."""
    first, second = make_actor(client), make_actor(client)
    assert client.get("/api/notifications").status_code == 401
    _seed(first, 3)
    assert second.call("get", "/api/notifications")[1]["data"]["total"] == 1


def test_mark_read_updates_unread_count(client):
    """REQ-NOTIF-2: marking read flips `read` and reduces unread_count; repeating is harmless."""
    actor = make_actor(client)
    item = actor.call("get", "/api/notifications")[1]["data"]["items"][0]
    assert item["read"] is False
    status, body = actor.call("patch", f"/api/notifications/{item['id']}/read")
    assert (status, body["data"]["read"]) == (200, True)
    assert actor.call("patch", f"/api/notifications/{item['id']}/read")[0] == 200
    assert actor.call("get", "/api/notifications")[1]["data"]["unread_count"] == 0


def test_mark_read_other_users_or_unknown_notification_is_404(client):
    """REQ-NOTIF-2: another user's notification and unknown ids are 404; no token is 401."""
    first, second = make_actor(client), make_actor(client)
    item = first.call("get", "/api/notifications")[1]["data"]["items"][0]
    assert second.call("patch", f"/api/notifications/{item['id']}/read")[0] == 404
    assert first.call("patch", f"/api/notifications/{uuid.uuid4()}/read")[0] == 404
    assert client.patch(f"/api/notifications/{item['id']}/read").status_code == 401
