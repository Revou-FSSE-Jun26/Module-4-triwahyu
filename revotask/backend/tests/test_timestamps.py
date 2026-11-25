import time

from tests.helpers import make_actor, make_board, make_card, make_column, setup_board

# DB-02: an unmodified row has created_at == updated_at, and an UPDATE advances updated_at.
# Found when a brand-new comment was labelled "edited" in the UI (the two columns used separate clock reads).


def test_new_card_has_equal_timestamps_and_edit_advances_updated_at(client):
    """REQ-CARD-2: created_at equals updated_at until the card is changed."""
    admin = make_actor(client)
    column = make_column(admin, make_board(admin)["id"])
    card = make_card(admin, column["id"])
    assert card["created_at"] == card["updated_at"]

    time.sleep(0.05)  # guarantee a later clock reading than the insert, not a wait on a condition
    changed = admin.call("patch", f"/api/cards/{card['id']}", json={"title": "Renamed"})[1]["data"]
    assert changed["updated_at"] > changed["created_at"]
    assert changed["created_at"] == card["created_at"]


def test_new_comment_is_not_edited_until_its_content_changes(client):
    """REQ-CMT-3: a fresh comment has equal timestamps; editing it moves updated_at forward."""
    _, member, _, _, _, card = setup_board(client)
    fresh = member.call("post", f"/api/cards/{card['id']}/comments", json={"content": "hello"})[1]["data"]
    assert fresh["created_at"] == fresh["updated_at"]

    time.sleep(0.05)
    edited = member.call("patch", f"/api/comments/{fresh['id']}", json={"content": "hello again"})[1]["data"]
    assert edited["updated_at"] > edited["created_at"]
    assert edited["created_at"] == fresh["created_at"]
