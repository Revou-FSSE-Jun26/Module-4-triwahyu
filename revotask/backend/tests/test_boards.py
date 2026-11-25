import uuid

from sqlalchemy import event

from app.extensions import db
from tests.helpers import add_member, make_actor, make_board, make_card, setup_board


def test_create_board_makes_creator_admin(client):
    """REQ-BOARD-1: 201 and the creator is the board's admin."""
    actor = make_actor(client)
    status, body = actor.call("post", "/api/boards", json={"name": "  Roadmap  "})
    assert status == 201
    assert (body["data"]["name"], body["data"]["role"], body["data"]["member_count"]) == ("Roadmap", "admin", 1)


def test_create_board_validation_and_auth(client):
    """REQ-BOARD-1: blank name is 400, missing token is 401."""
    actor = make_actor(client)
    assert actor.call("post", "/api/boards", json={"name": " "})[0] == 400
    assert client.post("/api/boards", json={"name": "x"}).status_code == 401


def test_list_boards_only_returns_own_boards(client):
    """REQ-BOARD-2: users see only boards they belong to, newest first."""
    ada, bob = make_actor(client), make_actor(client)
    make_board(ada, "First")
    make_board(ada, "Second")
    make_board(bob, "Bob's")
    names = [b["name"] for b in ada.call("get", "/api/boards")[1]["data"]]
    assert names == ["Second", "First"]
    assert client.get("/api/boards").status_code == 401


def test_get_board_nests_columns_and_cards_in_order(client):
    """REQ-BOARD-3: the board detail contains ordered columns each holding ordered cards."""
    admin, _, board, todo, done, card = setup_board(client)
    second = make_card(admin, todo["id"], "Second task")
    status, body = admin.call("get", f"/api/boards/{board['id']}")
    assert status == 200
    columns = body["data"]["columns"]
    assert [c["name"] for c in columns] == ["To Do", "Done"]
    assert [c["id"] for c in columns[0]["cards"]] == [card["id"], second["id"]]
    assert columns[1]["cards"] == []
    assert {m["role"] for m in body["data"]["members"]} == {"admin", "member"}


def test_get_board_forbidden_for_non_member_and_404_for_unknown(client):
    """REQ-BOARD-3: non-members get 403, unknown or malformed ids get 404."""
    admin, _, board, *_ = setup_board(client)
    outsider = make_actor(client)
    assert outsider.call("get", f"/api/boards/{board['id']}")[0] == 403
    assert admin.call("get", f"/api/boards/{uuid.uuid4()}")[0] == 404
    assert admin.call("get", "/api/boards/not-a-uuid")[0] == 404


def test_board_detail_uses_a_fixed_number_of_queries(client):
    """REQ-NFR-4 (DB-09): query count does not grow with the number of cards."""
    admin, _, board, todo, *_ = setup_board(client)

    def count_queries() -> int:
        statements: list[str] = []

        def record(conn, cursor, statement, *args):
            statements.append(statement)

        event.listen(db.engine, "before_cursor_execute", record)
        try:
            admin.call("get", f"/api/boards/{board['id']}")
        finally:
            event.remove(db.engine, "before_cursor_execute", record)
        return len(statements)

    before = count_queries()
    for i in range(25):
        make_card(admin, todo["id"], f"Card {i}")
    assert count_queries() == before


def test_rename_board_is_admin_only(client):
    """REQ-BOARD-4: admins rename (200); members get 403; blank name is 400."""
    admin, member, board, *_ = setup_board(client)
    url = f"/api/boards/{board['id']}"
    status, body = admin.call("patch", url, json={"name": "Renamed"})
    assert (status, body["data"]["name"]) == (200, "Renamed")
    assert member.call("patch", url, json={"name": "Hack"})[0] == 403
    assert admin.call("patch", url, json={"name": ""})[0] == 400


def test_delete_board_soft_deletes_everything(client):
    """REQ-BOARD-5, REQ-NFR-2: admin delete soft-deletes the board, columns and cards; members get 403."""
    admin, member, board, todo, _, card = setup_board(client)
    assert member.call("delete", f"/api/boards/{board['id']}")[0] == 403
    assert admin.call("delete", f"/api/boards/{board['id']}")[0] == 200
    assert admin.call("get", f"/api/boards/{board['id']}")[0] == 404
    assert admin.call("get", "/api/boards")[1]["data"] == []
    assert admin.call("patch", f"/api/cards/{card['id']}", json={"title": "x"})[0] == 404
    assert admin.call("patch", f"/api/columns/{todo['id']}", json={"name": "x"})[0] == 404


def test_member_management_rules(client):
    """REQ-BOARD-6: admins add, promote and remove members; the last admin is protected."""
    admin, member, board, todo, *_ = setup_board(client)
    newcomer = make_actor(client)
    base = f"/api/boards/{board['id']}/members"
    assert member.call("post", base, json={"email": newcomer.email})[0] == 403
    assert admin.call("post", base, json={"email": "ghost@example.com"})[0] == 404
    assert admin.call("post", base, json={"email": member.email})[0] == 409
    add_member(admin, board["id"], newcomer)
    assert admin.call("patch", f"{base}/{newcomer.id}", json={"role": "admin"})[1]["data"]["role"] == "admin"
    assert admin.call("patch", f"{base}/{newcomer.id}", json={"role": "owner"})[0] == 400
    assert admin.call("delete", f"{base}/{newcomer.id}")[0] == 200
    assert admin.call("delete", f"{base}/{admin.id}")[0] == 409
    assert admin.call("patch", f"{base}/{admin.id}", json={"role": "member"})[0] == 409
    assert len(member.call("get", base)[1]["data"]) == 2


def test_removing_a_member_unassigns_their_cards(client):
    """REQ-BOARD-6: a removed member's cards become unassigned."""
    admin, member, board, todo, *_ = setup_board(client)
    card = make_card(admin, todo["id"], "Mine", assignee_id=member.id)
    assert card["assignee"]["id"] == member.id
    admin.call("delete", f"/api/boards/{board['id']}/members/{member.id}")
    detail = admin.call("get", f"/api/boards/{board['id']}")[1]["data"]
    mine = [c for col in detail["columns"] for c in col["cards"] if c["id"] == card["id"]][0]
    assert mine["assignee"] is None
    assert member.call("get", f"/api/boards/{board['id']}")[0] == 403


def test_adding_a_member_notifies_them(client):
    """REQ-NOTIF-4: the added user gets a member_added notification."""
    admin, member, *_ = setup_board(client)
    items = member.call("get", "/api/notifications")[1]["data"]["items"]
    assert "member_added" in {n["type"] for n in items}
