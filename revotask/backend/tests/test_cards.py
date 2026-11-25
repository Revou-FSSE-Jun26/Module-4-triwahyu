import uuid

import pytest

from tests.helpers import make_actor, make_board, make_card, make_column, setup_board


def test_create_card_appends_with_float_order(client):
    """REQ-CARD-1: cards are created at the end of the column, 1024 apart."""
    admin, _, _, todo, *_ = setup_board(client)
    second = make_card(admin, todo["id"], "Second", description="  details  ")
    assert second["order"] == 2048.0
    assert second["description"] == "details"
    assert second["created_by"] == admin.id


def test_create_card_validation_auth_and_membership(client):
    """REQ-CARD-1: 400 blank title, 401 no token, 403 non-member, 404 unknown column."""
    admin, _, _, todo, *_ = setup_board(client)
    url = f"/api/columns/{todo['id']}/cards"
    assert admin.call("post", url, json={"title": ""})[0] == 400
    assert admin.call("post", url, json={"title": "x", "order": -1})[0] == 400
    assert client.post(url, json={"title": "x"}).status_code == 401
    assert make_actor(client).call("post", url, json={"title": "x"})[0] == 403
    assert admin.call("post", f"/api/columns/{uuid.uuid4()}/cards", json={"title": "x"})[0] == 404


def test_assignee_must_be_a_board_member(client):
    """REQ-CARD-2: assigning an outsider is rejected with INVALID_ASSIGNEE."""
    admin, member, _, todo, *_ = setup_board(client)
    outsider = make_actor(client)
    status, body = admin.call(
        "post", f"/api/columns/{todo['id']}/cards", json={"title": "x", "assignee_id": outsider.id}
    )
    assert (status, body["code"]) == (400, "INVALID_ASSIGNEE")
    ok_card = make_card(admin, todo["id"], "ok", assignee_id=member.id)
    assert ok_card["assignee"]["name"] == "Member"


def test_update_card_details_and_unassign(client):
    """REQ-CARD-2: title, description and assignee can be patched; null unassigns."""
    admin, member, _, _, _, card = setup_board(client)
    url = f"/api/cards/{card['id']}"
    status, body = member.call("patch", url, json={"title": "New", "description": "Body", "assignee_id": member.id})
    assert status == 200
    assert (body["data"]["title"], body["data"]["assignee"]["id"]) == ("New", member.id)
    assert admin.call("patch", url, json={"assignee_id": None})[1]["data"]["assignee"] is None
    assert admin.call("patch", url, json={})[0] == 400
    assert admin.call("patch", url, json={"order": 5})[0] == 400
    assert make_actor(client).call("patch", url, json={"title": "x"})[0] == 403
    assert admin.call("patch", f"/api/cards/{uuid.uuid4()}", json={"title": "x"})[0] == 404


def test_assigning_someone_else_notifies_them(client):
    """REQ-NOTIF-4: assigning a card to another member creates a card_assigned notification."""
    admin, member, _, _, _, card = setup_board(client)
    admin.call("patch", f"/api/cards/{card['id']}", json={"assignee_id": member.id})
    items = member.call("get", "/api/notifications")[1]["data"]["items"]
    assigned = [n for n in items if n["type"] == "card_assigned"]
    assert len(assigned) == 1 and assigned[0]["card_id"] == card["id"]
    admin.call("patch", f"/api/cards/{card['id']}", json={"assignee_id": admin.id})
    assert [n["type"] for n in admin.call("get", "/api/notifications")[1]["data"]["items"]].count("card_assigned") == 0


def test_delete_card_permissions(client):
    """REQ-CARD-3: creator or admin may delete; other members get 403; the card disappears."""
    admin, member, board, todo, *_ = setup_board(client)
    admins_card = make_card(admin, todo["id"], "Admin's")
    assert member.call("delete", f"/api/cards/{admins_card['id']}")[0] == 403
    own = make_card(member, todo["id"], "Member's")
    assert member.call("delete", f"/api/cards/{own['id']}")[0] == 200
    assert admin.call("delete", f"/api/cards/{admins_card['id']}")[0] == 200
    assert admin.call("delete", f"/api/cards/{own['id']}")[0] == 404
    cards = admin.call("get", f"/api/boards/{board['id']}")[1]["data"]["columns"][0]["cards"]
    assert [c["title"] for c in cards] == ["Write specs"]


def test_move_card_between_columns_persists(client):
    """REQ-CARD-4: a valid move changes column and order and survives a reload."""
    admin, _, board, todo, done, card = setup_board(client)
    status, body = admin.call(
        "patch", f"/api/cards/{card['id']}/position", json={"column_id": done["id"], "order": 512.5}
    )
    assert status == 200
    assert body["data"]["rebalanced"] is False
    assert (body["data"]["card"]["column_id"], body["data"]["card"]["order"]) == (done["id"], 512.5)
    columns = admin.call("get", f"/api/boards/{board['id']}")[1]["data"]["columns"]
    assert [len(c["cards"]) for c in columns] == [0, 1]


def test_move_card_within_column_reorders(client):
    """REQ-CARD-4: moving before the first card uses half its order and sorts first."""
    admin, _, board, todo, *_ = setup_board(client)
    second = make_card(admin, todo["id"], "Second")
    admin.call("patch", f"/api/cards/{second['id']}/position", json={"column_id": todo["id"], "order": 512.0})
    cards = admin.call("get", f"/api/boards/{board['id']}")[1]["data"]["columns"][0]["cards"]
    assert [c["title"] for c in cards] == ["Second", "Write specs"]


@pytest.mark.parametrize(
    "payload",
    [
        {"order": 5.0},
        {"column_id": "not-a-uuid", "order": 5.0},
        {"column_id": "00000000-0000-0000-0000-000000000000", "order": 0},
        {"column_id": "00000000-0000-0000-0000-000000000000", "order": -2.5},
        {"column_id": "00000000-0000-0000-0000-000000000000", "order": "abc"},
        {"column_id": "00000000-0000-0000-0000-000000000000", "order": True},
        {"column_id": "00000000-0000-0000-0000-000000000000", "order": 1e13},
        {"column_id": "00000000-0000-0000-0000-000000000000", "order": 1, "extra": 1},
    ],
)
def test_move_card_rejects_invalid_position_payloads(client, payload):
    """REQ-CARD-5: CardPositionSchema rejects bad UUIDs, non-positive or non-numeric orders, unknown keys."""
    admin, _, _, _, _, card = setup_board(client)
    assert admin.call("patch", f"/api/cards/{card['id']}/position", json=payload)[0] == 400


def test_move_card_rejects_nan_order(client):
    """REQ-CARD-5: NaN is not a valid order."""
    admin, _, _, _, done, card = setup_board(client)
    response = client.patch(
        f"/api/cards/{card['id']}/position",
        data=f'{{"column_id": "{done["id"]}", "order": NaN}}',
        content_type="application/json",
        headers=admin.headers,
    )
    assert response.status_code == 400


def test_move_card_auth_and_scope(client):
    """REQ-CARD-4: 401 no token, 403 non-member, 404 unknown column, 400 column on another board."""
    admin, _, _, _, done, card = setup_board(client)
    url = f"/api/cards/{card['id']}/position"
    body = {"column_id": done["id"], "order": 5.0}
    assert client.patch(url, json=body).status_code == 401
    assert make_actor(client).call("patch", url, json=body)[0] == 403
    assert admin.call("patch", url, json={**body, "column_id": str(uuid.uuid4())})[0] == 404
    elsewhere = make_column(admin, make_board(admin, "Other")["id"], "Elsewhere")
    status, error = admin.call("patch", url, json={**body, "column_id": elsewhere["id"]})
    assert (status, error["code"]) == (400, "INVALID_MOVE")


def test_move_rebalances_colliding_orders(client):
    """REQ-CARD-6: when orders collide the column is renumbered and `rebalanced` is true."""
    admin, _, board, todo, *_ = setup_board(client)
    second = make_card(admin, todo["id"], "Second")
    first_order = admin.call("get", f"/api/boards/{board['id']}")[1]["data"]["columns"][0]["cards"][0]["order"]
    status, body = admin.call(
        "patch", f"/api/cards/{second['id']}/position", json={"column_id": todo["id"], "order": first_order}
    )
    assert (status, body["data"]["rebalanced"]) == (200, True)
    orders = [c["order"] for c in admin.call("get", f"/api/boards/{board['id']}")[1]["data"]["columns"][0]["cards"]]
    assert orders == [1024.0, 2048.0]


def test_moving_into_done_column_updates_column_entered_at(client):
    """REQ-ANL-2: entering a new column refreshes column_entered_at."""
    admin, _, _, _, done, card = setup_board(client)
    moved = admin.call("patch", f"/api/cards/{card['id']}/position", json={"column_id": done["id"], "order": 1.0})[1]
    assert moved["data"]["card"]["column_entered_at"] >= card["column_entered_at"]


def test_my_tasks_lists_assigned_cards_with_board_name(client):
    """REQ-CARD-7: GET /api/cards?assignee=me returns only my cards, each with board and column."""
    admin, member, board, todo, *_ = setup_board(client)
    make_card(admin, todo["id"], "For member", assignee_id=member.id)
    status, body = member.call("get", "/api/cards?assignee=me")
    assert status == 200
    assert [(c["title"], c["board"]["name"], c["column"]["name"]) for c in body["data"]] == [
        ("For member", "Sprint 1", "To Do")
    ]
    assert admin.call("get", "/api/cards?assignee=me")[1]["data"] == []
    assert client.get("/api/cards?assignee=me").status_code == 401
    assert member.call("get", "/api/cards?assignee=you")[0] == 400


def test_search_cards_by_text_within_a_board(client):
    """REQ-CARD-8: search matches title or description, case-insensitively, scoped by board."""
    admin, _, board, todo, *_ = setup_board(client)
    make_card(admin, todo["id"], "Deploy API", description="to Helipod")
    make_card(admin, todo["id"], "100% done_ish")
    find = lambda q: [c["title"] for c in admin.call("get", f"/api/cards?q={q}&board_id={board['id']}")[1]["data"]]  # noqa: E731
    assert find("deploy") == ["Deploy API"]
    assert find("HELIPOD") == ["Deploy API"]
    assert find("%25") == ["100% done_ish"]
    assert find("zzz") == []
    assert make_actor(client).call("get", f"/api/cards?q=x&board_id={board['id']}")[0] == 403
