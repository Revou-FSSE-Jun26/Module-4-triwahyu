import uuid
from datetime import datetime, timedelta

from sqlalchemy import and_, func

from ...common.clock import utcnow
from ...extensions import db
from ...models import Board, BoardMember, Card, Column, Comment, User
from ..boards.service import require_admin


def week_start(now: datetime) -> datetime:
    """Monday 00:00 UTC of the ISO week containing `now`."""
    monday = now - timedelta(days=now.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)


def board_analytics(board_id: uuid.UUID, user_id: uuid.UUID, now: datetime | None = None) -> dict:
    """Per-column card totals, cards completed this week, and per-member activity (admin only)."""
    require_admin(board_id, user_id)
    since = week_start(now or utcnow())

    live_cards = and_(Card.column_id == Column.id, Card.deleted_at.is_(None))
    per_column = (
        db.session.query(Column.id, Column.name, Column.order, func.count(Card.id))
        .outerjoin(Card, live_cards)
        .filter(Column.board_id == board_id, Column.deleted_at.is_(None))
        .group_by(Column.id, Column.name, Column.order)
        .order_by(Column.order, Column.id)
        .all()
    )

    done_this_week = and_(Column.is_done.is_(True), Card.column_entered_at >= since)
    completed_total = (
        db.session.query(func.count(Card.id))
        .join(Column, Card.column_id == Column.id)
        .filter(Column.board_id == board_id, Column.deleted_at.is_(None), Card.deleted_at.is_(None), done_this_week)
        .scalar()
    )
    return {
        "board_id": board_id,
        "week_start": since,
        "cards_per_column": [
            {"column_id": cid, "name": name, "order": order, "card_count": count}
            for cid, name, order, count in per_column
        ],
        "completed_this_week": completed_total,
        "member_activity": _member_activity(board_id, since),
    }


def _member_activity(board_id: uuid.UUID, since: datetime) -> list[dict]:
    """Assigned, completed-this-week and comment counts per member, each from its own joined query."""
    card_scope = [Column.board_id == board_id, Column.deleted_at.is_(None), Card.deleted_at.is_(None)]
    assigned = dict(
        db.session.query(Card.assignee_id, func.count(Card.id))
        .join(Column, Card.column_id == Column.id)
        .filter(*card_scope, Card.assignee_id.isnot(None))
        .group_by(Card.assignee_id)
        .all()
    )
    completed = dict(
        db.session.query(Card.assignee_id, func.count(Card.id))
        .join(Column, Card.column_id == Column.id)
        .filter(*card_scope, Card.assignee_id.isnot(None), Column.is_done.is_(True), Card.column_entered_at >= since)
        .group_by(Card.assignee_id)
        .all()
    )
    comments = dict(
        db.session.query(Comment.user_id, func.count(Comment.id))
        .join(Card, Comment.card_id == Card.id)
        .join(Column, Card.column_id == Column.id)
        .filter(*card_scope, Comment.deleted_at.is_(None))
        .group_by(Comment.user_id)
        .all()
    )
    members = (
        db.session.query(User.id, User.name, BoardMember.role)
        .join(BoardMember, BoardMember.user_id == User.id)
        .join(Board, Board.id == BoardMember.board_id)
        .filter(Board.id == board_id)
        .order_by(User.name, User.id)
        .all()
    )
    return [
        {
            "user_id": uid,
            "name": name,
            "role": role,
            "cards_assigned": assigned.get(uid, 0),
            "cards_completed": completed.get(uid, 0),
            "comments_made": comments.get(uid, 0),
        }
        for uid, name, role in members
    ]
