import uuid

from sqlalchemy import func, update

from ...common.clock import utcnow
from ...common.errors import BadRequest, NotFound
from ...extensions import db
from ...models import Card, Column, Comment
from ..boards.service import require_admin, require_member

ORDER_STEP = 1024.0
MIN_GAP = 1e-6


def get_column(column_id: uuid.UUID) -> Column:
    column = db.session.get(Column, column_id)
    if column is None or column.deleted_at is not None:
        raise NotFound("Column not found")
    return column


def require_column_member(column_id: uuid.UUID, user_id: uuid.UUID) -> Column:
    column = get_column(column_id)
    require_member(column.board_id, user_id)
    return column


def next_order(model, scope_filter) -> float:
    """Append position: highest live `order` plus one step, or one step when empty (DB-04)."""
    top = db.session.query(func.max(model.order)).filter(scope_filter, model.deleted_at.is_(None)).scalar()
    return (top or 0.0) + ORDER_STEP


def needs_rebalance(orders: list[float]) -> bool:
    ordered = sorted(orders)
    return any(b - a < MIN_GAP for a, b in zip(ordered, ordered[1:], strict=False))


def create_column(board_id: uuid.UUID, user_id: uuid.UUID, data: dict) -> Column:
    require_member(board_id, user_id)
    order = data.get("order") or next_order(Column, Column.board_id == board_id)
    column = Column(board_id=board_id, name=data["name"], is_done=data["is_done"], order=order)
    db.session.add(column)
    db.session.commit()
    return column


def update_column(column_id: uuid.UUID, user_id: uuid.UUID, data: dict) -> Column:
    column = require_column_member(column_id, user_id)
    for field in ("name", "is_done"):
        if field in data:
            setattr(column, field, data[field])
    db.session.commit()
    return column


def delete_column(column_id: uuid.UUID, user_id: uuid.UUID) -> uuid.UUID:
    """Soft-delete a column and its cards (admin only)."""
    column = get_column(column_id)
    require_admin(column.board_id, user_id)
    when = utcnow()
    soft_delete_columns(Column.id == column_id, when)
    db.session.commit()
    return column_id


def soft_delete_columns(column_filter, when) -> None:
    """Soft-delete matching live columns, their cards and those cards' comments (DB-03).

    Children are updated first because each statement selects through its still-live parent.
    """
    column_ids = db.session.query(Column.id).filter(column_filter, Column.deleted_at.is_(None))
    card_ids = db.session.query(Card.id).filter(Card.column_id.in_(column_ids), Card.deleted_at.is_(None))
    db.session.execute(
        update(Comment).where(Comment.card_id.in_(card_ids), Comment.deleted_at.is_(None)).values(deleted_at=when)
    )
    db.session.execute(
        update(Card).where(Card.column_id.in_(column_ids), Card.deleted_at.is_(None)).values(deleted_at=when)
    )
    db.session.execute(update(Column).where(column_filter, Column.deleted_at.is_(None)).values(deleted_at=when))


def reorder_columns(board_id: uuid.UUID, user_id: uuid.UUID, items: list[dict]) -> list[Column]:
    require_member(board_id, user_id)
    ids = [item["id"] for item in items]
    if len(set(ids)) != len(ids):
        raise BadRequest("Column ids must be unique", code="INVALID_REORDER")
    columns = {c.id: c for c in Column.query.filter(Column.board_id == board_id, Column.deleted_at.is_(None)).all()}
    if any(column_id not in columns for column_id in ids):
        raise BadRequest("Every column must belong to this board", code="INVALID_REORDER")
    for item in items:
        columns[item["id"]].order = item["order"]
    ordered = sorted(columns.values(), key=lambda c: (c.order, c.created_at, str(c.id)))
    if needs_rebalance([c.order for c in ordered]):
        for index, column in enumerate(ordered, start=1):
            column.order = index * ORDER_STEP
    db.session.commit()
    return ordered
