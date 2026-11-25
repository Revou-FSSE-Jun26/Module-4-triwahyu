import uuid

from sqlalchemy import and_, or_, update

from ...common.clock import utcnow
from ...common.errors import BadRequest, Forbidden, NotFound
from ...extensions import db
from ...models import ROLE_ADMIN, Board, BoardMember, Card, Column, Comment, User
from ...models.notification import TYPE_CARD_ASSIGNED
from ..boards.service import require_member
from ..columns.service import ORDER_STEP, get_column, needs_rebalance, next_order
from ..notifications.service import notify


def get_card(card_id: uuid.UUID) -> Card:
    card = db.session.get(Card, card_id)
    if card is None or card.deleted_at is not None:
        raise NotFound("Card not found")
    return card


def require_card_member(card_id: uuid.UUID, user_id: uuid.UUID) -> tuple[Card, Column, BoardMember]:
    card = get_card(card_id)
    column = get_column(card.column_id)
    _, membership = require_member(column.board_id, user_id)
    return card, column, membership


def _check_assignee(board_id: uuid.UUID, assignee_id: uuid.UUID | None) -> None:
    if assignee_id is None:
        return
    if not BoardMember.query.filter_by(board_id=board_id, user_id=assignee_id).first():
        raise BadRequest("Assignee must be a member of this board", code="INVALID_ASSIGNEE")


def _notify_assignment(card: Card, board_id: uuid.UUID, actor_id: uuid.UUID) -> None:
    if card.assignee_id is None or card.assignee_id == actor_id:
        return
    actor = db.session.get(User, actor_id)
    notify(
        card.assignee_id,
        TYPE_CARD_ASSIGNED,
        f"{actor.name} assigned you to “{card.title}”.",
        card_id=card.id,
        board_id=board_id,
    )


def create_card(column_id: uuid.UUID, user_id: uuid.UUID, data: dict) -> Card:
    column = get_column(column_id)
    require_member(column.board_id, user_id)
    assignee_id = data.get("assignee_id")
    _check_assignee(column.board_id, assignee_id)
    card = Card(
        column_id=column_id,
        title=data["title"],
        description=data.get("description"),
        assignee_id=assignee_id,
        created_by=user_id,
        order=data.get("order") or next_order(Card, Card.column_id == column_id),
        column_entered_at=utcnow(),
    )
    db.session.add(card)
    db.session.flush()
    _notify_assignment(card, column.board_id, user_id)
    db.session.commit()
    return card


def update_card(card_id: uuid.UUID, user_id: uuid.UUID, data: dict) -> Card:
    card, column, _ = require_card_member(card_id, user_id)
    previous_assignee = card.assignee_id
    if "assignee_id" in data:
        _check_assignee(column.board_id, data["assignee_id"])
    for field in ("title", "description", "assignee_id"):
        if field in data:
            setattr(card, field, data[field])
    db.session.flush()
    if card.assignee_id != previous_assignee:
        _notify_assignment(card, column.board_id, user_id)
    db.session.commit()
    return card


def delete_card(card_id: uuid.UUID, user_id: uuid.UUID) -> uuid.UUID:
    """Soft-delete a card and its comments. Allowed for its creator or a board admin."""
    card, _, membership = require_card_member(card_id, user_id)
    if membership.role != ROLE_ADMIN and card.created_by != user_id:
        raise Forbidden("Only the card's creator or a board admin can delete it")
    when = utcnow()
    db.session.execute(
        update(Comment).where(Comment.card_id == card.id, Comment.deleted_at.is_(None)).values(deleted_at=when)
    )
    card.deleted_at = when
    db.session.commit()
    return card.id


def move_card(card_id: uuid.UUID, user_id: uuid.UUID, column_id: uuid.UUID, order: float) -> tuple[Card, bool]:
    """Move a card to `column_id` at `order`. Returns the card and whether siblings were rebalanced."""
    card, source, _ = require_card_member(card_id, user_id)
    target = get_column(column_id)
    if target.board_id != source.board_id:
        raise BadRequest("A card can only move within its board", code="INVALID_MOVE")
    if target.id != source.id:
        card.column_entered_at = utcnow()
    card.column_id = target.id
    card.order = order
    db.session.flush()

    siblings = (
        Card.query.filter(Card.column_id == target.id, Card.deleted_at.is_(None))
        .order_by(Card.order, Card.created_at, Card.id)
        .all()
    )
    rebalanced = needs_rebalance([c.order for c in siblings])
    if rebalanced:
        for index, sibling in enumerate(siblings, start=1):
            sibling.order = index * ORDER_STEP
    db.session.commit()
    return card, rebalanced


def _like_pattern(term: str) -> str:
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def list_cards(user_id: uuid.UUID, *, assignee_me: bool, q: str | None, board_id, limit: int) -> list[Card]:
    """Cards on boards the user belongs to, for My Tasks (`assignee=me`) and search (`q`)."""
    if board_id is not None:
        require_member(board_id, user_id)
    query = (
        db.session.query(Card, Column, Board)
        .join(Column, Card.column_id == Column.id)
        .join(Board, Column.board_id == Board.id)
        .join(BoardMember, and_(BoardMember.board_id == Board.id, BoardMember.user_id == user_id))
        .filter(Card.deleted_at.is_(None), Column.deleted_at.is_(None), Board.deleted_at.is_(None))
    )
    if board_id is not None:
        query = query.filter(Board.id == board_id)
    if assignee_me:
        query = query.filter(Card.assignee_id == user_id)
    if q:
        pattern = _like_pattern(q)
        query = query.filter(or_(Card.title.ilike(pattern, escape="\\"), Card.description.ilike(pattern, escape="\\")))
    rows = query.order_by(Board.name, Column.order, Card.order, Card.id).limit(limit).all()
    for card, column, board in rows:  # transient attributes read by TaskCardSchema
        card.board = {"id": board.id, "name": board.name}
        card.column = {"id": column.id, "name": column.name}
    return [card for card, _, _ in rows]
