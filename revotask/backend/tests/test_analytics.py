import uuid
from datetime import UTC, datetime, timedelta

from app.blueprints.analytics.service import board_analytics, week_start
from app.extensions import db
from app.models import Card
from tests.helpers import make_card, setup_board


def test_week_start_is_monday_midnight_utc():
    """REQ-ANL-2: any moment in the week maps to Monday 00:00 UTC."""
    assert week_start(datetime(2026, 11, 26, 15, 30, tzinfo=UTC)) == datetime(2026, 11, 23, tzinfo=UTC)
    assert week_start(datetime(2026, 11, 23, 0, 0, tzinfo=UTC)) == datetime(2026, 11, 23, tzinfo=UTC)
    assert week_start(datetime(2026, 11, 29, 23, 59, tzinfo=UTC)) == datetime(2026, 11, 23, tzinfo=UTC)


def test_analytics_reports_cards_per_column_completed_and_activity(client):
    """REQ-ANL-1, REQ-ANL-2, REQ-ANL-3: totals per column, completed this week, per-member activity."""
    admin, member, board, todo, done, card = setup_board(client)
    mine = make_card(admin, todo["id"], "Mine", assignee_id=admin.id)
    admin.call("patch", f"/api/cards/{mine['id']}/position", json={"column_id": done["id"], "order": 1.0})
    admin.call("post", f"/api/cards/{card['id']}/comments", json={"content": "hi"})
    member.call("post", f"/api/cards/{card['id']}/comments", json={"content": "yo"})

    status, body = admin.call("get", f"/api/boards/{board['id']}/analytics")
    data = body["data"]
    assert status == 200
    assert [(c["name"], c["card_count"]) for c in data["cards_per_column"]] == [("To Do", 1), ("Done", 1)]
    assert data["completed_this_week"] == 1
    by_name = {m["name"]: m for m in data["member_activity"]}
    assert (by_name["Admin"]["cards_assigned"], by_name["Admin"]["cards_completed"]) == (1, 1)
    assert by_name["Admin"]["comments_made"] == 1 and by_name["Member"]["comments_made"] == 1
    assert by_name["Member"]["cards_assigned"] == 0


def test_cards_completed_in_earlier_weeks_are_not_counted(client):
    """REQ-ANL-2: a card that entered the done column last week is excluded."""
    admin, _, board, _, done, _ = setup_board(client)
    old = make_card(admin, done["id"], "Old")
    card = db.session.get(Card, uuid.UUID(old["id"]))
    card.column_entered_at = datetime.now(UTC) - timedelta(days=14)
    db.session.commit()
    assert admin.call("get", f"/api/boards/{board['id']}/analytics")[1]["data"]["completed_this_week"] == 0
    result = board_analytics(uuid.UUID(board["id"]), uuid.UUID(admin.id), now=datetime.now(UTC) - timedelta(days=14))
    assert result["completed_this_week"] == 1


def test_analytics_excludes_deleted_cards(client):
    """REQ-ANL-1: soft-deleted cards are not counted."""
    admin, _, board, _, _, card = setup_board(client)
    admin.call("delete", f"/api/cards/{card['id']}")
    counts = admin.call("get", f"/api/boards/{board['id']}/analytics")[1]["data"]["cards_per_column"]
    assert [c["card_count"] for c in counts] == [0, 0]


def test_analytics_is_admin_only(client):
    """REQ-ANL-4: members get 403, outsiders 403, no token 401, unknown board 404."""
    admin, member, board, *_ = setup_board(client)
    url = f"/api/boards/{board['id']}/analytics"
    assert member.call("get", url)[0] == 403
    assert client.get(url).status_code == 401
    assert admin.call("get", f"/api/boards/{uuid.uuid4()}/analytics")[0] == 404
