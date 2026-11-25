import uuid

from tests.helpers import make_actor, setup_board


def _comment(actor, card_id, content="Looks good"):
    return actor.call("post", f"/api/cards/{card_id}/comments", json={"content": content})


def test_add_comment_returns_201(client):
    """REQ-CMT-1: a member can comment; the author comes from the token."""
    _, member, _, _, _, card = setup_board(client)
    status, body = _comment(member, card["id"], "  Needs review  ")
    assert status == 201
    assert body["data"]["content"] == "Needs review"
    assert body["data"]["author"] == {"id": member.id, "name": "Member"}
    assert body["data"]["card_id"] == card["id"]


def test_add_comment_without_content_returns_400(client):
    """REQ-CMT-1: missing, blank or oversize content is 400; the body cannot set the author."""
    admin, _, _, _, _, card = setup_board(client)
    url = f"/api/cards/{card['id']}/comments"
    status, body = admin.call("post", url, json={})
    assert (status, body["code"]) == (400, "VALIDATION_ERROR")
    assert "content" in body["details"]
    assert admin.call("post", url, json={"content": "   "})[0] == 400
    assert admin.call("post", url, json={"content": "x" * 2001})[0] == 400
    assert admin.call("post", url, json={"content": "ok", "user_id": str(uuid.uuid4())})[0] == 400


def test_comment_endpoints_without_token_return_401(client):
    """REQ-CMT-1: every comment endpoint requires authentication."""
    admin, _, _, _, _, card = setup_board(client)
    comment = _comment(admin, card["id"])[1]["data"]
    assert client.post(f"/api/cards/{card['id']}/comments", json={"content": "x"}).status_code == 401
    assert client.get(f"/api/cards/{card['id']}/comments").status_code == 401
    assert client.patch(f"/api/comments/{comment['id']}", json={"content": "x"}).status_code == 401
    assert client.delete(f"/api/comments/{comment['id']}").status_code == 401


def test_non_member_cannot_comment_or_list_returns_403(client):
    """REQ-CMT-1: users outside the board get 403 for both add and list."""
    _, _, _, _, _, card = setup_board(client)
    outsider = make_actor(client)
    assert _comment(outsider, card["id"])[0] == 403
    assert outsider.call("get", f"/api/cards/{card['id']}/comments")[0] == 403


def test_edit_and_delete_are_owner_only_returns_403(client):
    """REQ-CMT-3/4: another member, even a board admin, gets 403 on edit and delete."""
    admin, member, _, _, _, card = setup_board(client)
    comment = _comment(member, card["id"])[1]["data"]
    url = f"/api/comments/{comment['id']}"
    assert admin.call("patch", url, json={"content": "hijack"})[0] == 403
    assert admin.call("delete", url)[0] == 403
    assert member.call("get", f"/api/cards/{card['id']}/comments")[1]["data"][0]["content"] == "Looks good"


def test_owner_can_edit_comment(client):
    """REQ-CMT-3: the owner edits their comment and updated_at advances."""
    _, member, _, _, _, card = setup_board(client)
    comment = _comment(member, card["id"])[1]["data"]
    status, body = member.call("patch", f"/api/comments/{comment['id']}", json={"content": "Edited"})
    assert (status, body["data"]["content"]) == (200, "Edited")
    assert body["data"]["updated_at"] >= comment["updated_at"]
    assert member.call("patch", f"/api/comments/{comment['id']}", json={"content": ""})[0] == 400
    assert member.call("patch", f"/api/comments/{uuid.uuid4()}", json={"content": "x"})[0] == 404


def test_owner_can_delete_comment(client):
    """REQ-CMT-4: the owner deletes; it disappears from the list and a second delete is 404."""
    _, member, _, _, _, card = setup_board(client)
    comment = _comment(member, card["id"])[1]["data"]
    assert member.call("delete", f"/api/comments/{comment['id']}")[0] == 200
    assert member.call("get", f"/api/cards/{card['id']}/comments")[1]["data"] == []
    assert member.call("delete", f"/api/comments/{comment['id']}")[0] == 404


def test_list_comments_oldest_first(client):
    """REQ-CMT-2: comments are listed in creation order."""
    admin, member, _, _, _, card = setup_board(client)
    _comment(admin, card["id"], "first")
    _comment(member, card["id"], "second")
    contents = [c["content"] for c in admin.call("get", f"/api/cards/{card['id']}/comments")[1]["data"]]
    assert contents == ["first", "second"]
    assert admin.call("get", f"/api/cards/{uuid.uuid4()}/comments")[0] == 404


def test_comment_notifies_assignee_but_not_the_author(client):
    """REQ-NOTIF-4: the assignee is notified of a comment by someone else; authors never self-notify."""
    admin, member, _, _, _, card = setup_board(client)
    admin.call("patch", f"/api/cards/{card['id']}", json={"assignee_id": member.id})
    _comment(admin, card["id"], "ping")
    _comment(member, card["id"], "pong")
    kinds = lambda a: [n["type"] for n in a.call("get", "/api/notifications")[1]["data"]["items"]]  # noqa: E731
    assert kinds(member).count("comment_added") == 1
    assert kinds(admin).count("comment_added") == 1  # admin created the card, member's comment notifies them
