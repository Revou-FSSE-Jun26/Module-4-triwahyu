import uuid

from tests.helpers import make_actor, make_board, make_column, setup_board


def test_add_column_appends_with_float_order(client):
    """REQ-COL-1: columns are created at the end, 1024 apart (FLOAT strategy)."""
    admin = make_actor(client)
    board = make_board(admin)
    first = make_column(admin, board["id"], "To Do")
    second = make_column(admin, board["id"], "Doing")
    assert (first["order"], second["order"]) == (1024.0, 2048.0)
    assert first["is_done"] is False


def test_add_column_validation_auth_and_membership(client):
    """REQ-COL-1: 400 blank name, 401 no token, 403 non-member, 404 unknown board."""
    admin = make_actor(client)
    board = make_board(admin)
    url = f"/api/boards/{board['id']}/columns"
    assert admin.call("post", url, json={"name": ""})[0] == 400
    assert admin.call("post", url, json={"name": "x", "bogus": 1})[0] == 400
    assert client.post(url, json={"name": "x"}).status_code == 401
    assert make_actor(client).call("post", url, json={"name": "x"})[0] == 403
    assert admin.call("post", f"/api/boards/{uuid.uuid4()}/columns", json={"name": "x"})[0] == 404


def test_rename_column_and_mark_done(client):
    """REQ-COL-2: members can rename a column and flag it as a done column."""
    admin, member, _, todo, *_ = setup_board(client)
    status, body = member.call("patch", f"/api/columns/{todo['id']}", json={"name": "Backlog", "is_done": True})
    assert status == 200
    assert (body["data"]["name"], body["data"]["is_done"]) == ("Backlog", True)
    assert admin.call("patch", f"/api/columns/{todo['id']}", json={})[0] == 400
    assert make_actor(client).call("patch", f"/api/columns/{todo['id']}", json={"name": "x"})[0] == 403


def test_delete_column_is_admin_only_and_removes_its_cards(client):
    """REQ-COL-3: members get 403; admin delete soft-deletes the column and its cards."""
    admin, member, board, todo, _, card = setup_board(client)
    assert member.call("delete", f"/api/columns/{todo['id']}")[0] == 403
    assert admin.call("delete", f"/api/columns/{todo['id']}")[0] == 200
    assert admin.call("delete", f"/api/columns/{todo['id']}")[0] == 404
    detail = admin.call("get", f"/api/boards/{board['id']}")[1]["data"]
    assert [c["name"] for c in detail["columns"]] == ["Done"]
    assert admin.call("get", f"/api/cards?q={card['title']}")[1]["data"] == []


def test_reorder_columns_with_float_orders(client):
    """REQ-COL-4: a single float change moves one column; the response is the full ordered list."""
    admin = make_actor(client)
    board = make_board(admin)
    for name in "AB":
        make_column(admin, board["id"], name)
    c = make_column(admin, board["id"], "C")
    url = f"/api/boards/{board['id']}/columns/reorder"
    status, body = admin.call("patch", url, json={"items": [{"id": c["id"], "order": 1536.0}]})
    assert status == 200
    assert [col["name"] for col in body["data"]] == ["A", "C", "B"]
    detail = admin.call("get", f"/api/boards/{board['id']}")[1]["data"]
    assert [col["name"] for col in detail["columns"]] == ["A", "C", "B"]


def test_reorder_columns_validation(client):
    """REQ-COL-4: non-positive orders, duplicate ids and foreign columns are 400; no token is 401."""
    admin = make_actor(client)
    board, other = make_board(admin), make_board(admin, "Other")
    mine = make_column(admin, board["id"])
    foreign = make_column(admin, other["id"])
    url = f"/api/boards/{board['id']}/columns/reorder"
    assert admin.call("patch", url, json={"items": [{"id": mine["id"], "order": 0}]})[0] == 400
    assert admin.call("patch", url, json={"items": [{"id": mine["id"], "order": -3}]})[0] == 400
    assert admin.call("patch", url, json={"items": []})[0] == 400
    twice = [{"id": mine["id"], "order": 5}, {"id": mine["id"], "order": 6}]
    assert admin.call("patch", url, json={"items": twice})[0] == 400
    assert admin.call("patch", url, json={"items": [{"id": foreign["id"], "order": 5}]})[0] == 400
    assert client.patch(url, json={"items": []}).status_code == 401


def test_reorder_rebalances_when_gap_collapses(client):
    """REQ-COL-4: colliding orders are renumbered to multiples of 1024."""
    admin = make_actor(client)
    board = make_board(admin)
    a, b = make_column(admin, board["id"], "A"), make_column(admin, board["id"], "B")
    items = [{"id": a["id"], "order": 10.0}, {"id": b["id"], "order": 10.0}]
    body = admin.call("patch", f"/api/boards/{board['id']}/columns/reorder", json={"items": items})[1]
    assert [c["order"] for c in body["data"]] == [1024.0, 2048.0]
