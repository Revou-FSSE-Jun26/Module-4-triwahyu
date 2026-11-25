"""Small API-level builders so tests read as scenarios."""

import itertools
from dataclasses import dataclass, field

PASSWORD = "Passw0rd1"
_counter = itertools.count(1)


@dataclass
class Actor:
    client: object
    id: str
    email: str
    token: str
    headers: dict = field(default_factory=dict)

    def call(self, method: str, url: str, **kwargs):
        response = getattr(self.client, method)(url, headers=self.headers, **kwargs)
        return response.status_code, response.get_json()


def make_actor(client, name: str = "Ada") -> Actor:
    n = next(_counter)
    email = f"user{n}@example.com"
    client.post("/api/auth/register", json={"name": name, "email": email, "password": PASSWORD})
    login = client.post("/api/auth/login", json={"email": email, "password": PASSWORD}).get_json()["data"]
    token = login["access_token"]
    return Actor(client, login["user"]["id"], email, token, {"Authorization": f"Bearer {token}"})


def make_board(actor: Actor, name: str = "Sprint 1") -> dict:
    return actor.call("post", "/api/boards", json={"name": name})[1]["data"]


def make_column(actor: Actor, board_id: str, name: str = "To Do", **extra) -> dict:
    return actor.call("post", f"/api/boards/{board_id}/columns", json={"name": name, **extra})[1]["data"]


def make_card(actor: Actor, column_id: str, title: str = "Write specs", **extra) -> dict:
    return actor.call("post", f"/api/columns/{column_id}/cards", json={"title": title, **extra})[1]["data"]


def add_member(admin: Actor, board_id: str, member: Actor, role: str = "member") -> dict:
    return admin.call("post", f"/api/boards/{board_id}/members", json={"email": member.email, "role": role})[1]["data"]


def setup_board(client):
    """An admin with a board, two columns and one card, plus a second user who is a member."""
    admin, member = make_actor(client, "Admin"), make_actor(client, "Member")
    board = make_board(admin)
    todo = make_column(admin, board["id"], "To Do")
    done = make_column(admin, board["id"], "Done", is_done=True)
    card = make_card(admin, todo["id"])
    add_member(admin, board["id"], member)
    return admin, member, board, todo, done, card
