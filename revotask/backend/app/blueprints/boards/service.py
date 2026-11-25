import uuid

from sqlalchemy import func, update

from ...common.clock import utcnow
from ...common.errors import Conflict, Forbidden, NotFound
from ...extensions import db
from ...models import ROLE_ADMIN, Board, BoardMember, Card, Column, User
from ...models.notification import TYPE_MEMBER_ADDED
from ..notifications.service import notify


# --- access helpers (BE-08), reused by the other blueprints -----------------------------------
def require_member(board_id: uuid.UUID, user_id: uuid.UUID) -> tuple[Board, BoardMember]:
    """404 if the board is missing or deleted, 403 if the user is not a member."""
    board = db.session.get(Board, board_id)
    if board is None or board.deleted_at is not None:
        raise NotFound("Board not found")
    membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
    if membership is None:
        raise Forbidden("You are not a member of this board")
    return board, membership


def require_admin(board_id: uuid.UUID, user_id: uuid.UUID) -> tuple[Board, BoardMember]:
    board, membership = require_member(board_id, user_id)
    if membership.role != ROLE_ADMIN:
        raise Forbidden("Only a board admin can do that")
    return board, membership


# --- boards ---------------------------------------------------------------------------------
def create_board(user_id: uuid.UUID, name: str) -> dict:
    board = Board(name=name, owner_id=user_id)
    db.session.add(board)
    db.session.flush()
    db.session.add(BoardMember(board_id=board.id, user_id=user_id, role=ROLE_ADMIN))
    db.session.commit()
    return _summary(board, ROLE_ADMIN, 1)


def list_boards(user_id: uuid.UUID) -> list[dict]:
    counts = (
        db.session.query(BoardMember.board_id, func.count(BoardMember.id).label("n"))
        .group_by(BoardMember.board_id)
        .subquery()
    )
    rows = (
        db.session.query(Board, BoardMember.role, counts.c.n)
        .join(BoardMember, BoardMember.board_id == Board.id)
        .join(counts, counts.c.board_id == Board.id)
        .filter(BoardMember.user_id == user_id, Board.deleted_at.is_(None))
        .order_by(Board.created_at.desc(), Board.id)
        .all()
    )
    return [_summary(board, role, count) for board, role, count in rows]


def get_board_detail(board_id: uuid.UUID, user_id: uuid.UUID) -> dict:
    """Board with members, columns and cards in a fixed number of queries (DB-09)."""
    board, membership = require_member(board_id, user_id)
    members = BoardMember.query.filter_by(board_id=board_id).order_by(BoardMember.created_at).all()
    columns = (
        Column.query.filter(Column.board_id == board_id, Column.deleted_at.is_(None))
        .order_by(Column.order, Column.created_at, Column.id)
        .all()
    )
    cards = (
        Card.query.filter(Card.column_id.in_([c.id for c in columns]), Card.deleted_at.is_(None))
        .order_by(Card.order, Card.created_at, Card.id)
        .all()
        if columns
        else []
    )
    for column in columns:
        column.cards = [card for card in cards if card.column_id == column.id]  # transient attribute
    detail = _summary(board, membership.role, len(members))
    detail.update(members=members, columns=columns)
    return detail


def rename_board(board_id: uuid.UUID, user_id: uuid.UUID, name: str) -> dict:
    board, membership = require_admin(board_id, user_id)
    board.name = name
    db.session.commit()
    return _summary(board, membership.role, _member_count(board_id))


def delete_board(board_id: uuid.UUID, user_id: uuid.UUID) -> uuid.UUID:
    """Soft-delete the board and everything inside it with one timestamp (DB-03)."""
    from ..columns.service import soft_delete_columns

    board, _ = require_admin(board_id, user_id)
    when = utcnow()
    soft_delete_columns(Column.board_id == board_id, when)
    board.deleted_at = when
    db.session.commit()
    return board.id


def _member_count(board_id: uuid.UUID) -> int:
    return BoardMember.query.filter_by(board_id=board_id).count()


def _summary(board: Board, role: str, member_count: int) -> dict:
    return {
        "id": board.id,
        "name": board.name,
        "owner_id": board.owner_id,
        "role": role,
        "member_count": member_count,
        "created_at": board.created_at,
        "updated_at": board.updated_at,
    }


# --- members (admin only) ---------------------------------------------------------------------
def list_members(board_id: uuid.UUID, user_id: uuid.UUID) -> list[BoardMember]:
    require_member(board_id, user_id)
    return BoardMember.query.filter_by(board_id=board_id).order_by(BoardMember.created_at).all()


def add_member(board_id: uuid.UUID, actor_id: uuid.UUID, email: str, role: str) -> BoardMember:
    board, _ = require_admin(board_id, actor_id)
    user = User.query.filter_by(email=email.lower()).first()
    if user is None:
        raise NotFound("No user is registered with that email")
    if BoardMember.query.filter_by(board_id=board_id, user_id=user.id).first():
        raise Conflict("That user is already a member of this board")
    membership = BoardMember(board_id=board_id, user_id=user.id, role=role)
    db.session.add(membership)
    notify(user.id, TYPE_MEMBER_ADDED, f"You were added to the board “{board.name}”.", board_id=board_id)
    db.session.commit()
    return membership


def set_member_role(board_id: uuid.UUID, actor_id: uuid.UUID, target_id: uuid.UUID, role: str) -> BoardMember:
    require_admin(board_id, actor_id)
    membership = _get_membership(board_id, target_id)
    if membership.role == ROLE_ADMIN and role != ROLE_ADMIN:
        _ensure_another_admin(board_id)
    membership.role = role
    db.session.commit()
    return membership


def remove_member(board_id: uuid.UUID, actor_id: uuid.UUID, target_id: uuid.UUID) -> uuid.UUID:
    """Remove a member and unassign their cards on this board."""
    require_admin(board_id, actor_id)
    membership = _get_membership(board_id, target_id)
    if membership.role == ROLE_ADMIN:
        _ensure_another_admin(board_id)
    column_ids = db.session.query(Column.id).filter(Column.board_id == board_id)
    db.session.execute(
        update(Card).where(Card.column_id.in_(column_ids), Card.assignee_id == target_id).values(assignee_id=None)
    )
    db.session.delete(membership)
    db.session.commit()
    return target_id


def _get_membership(board_id: uuid.UUID, user_id: uuid.UUID) -> BoardMember:
    membership = BoardMember.query.filter_by(board_id=board_id, user_id=user_id).first()
    if membership is None:
        raise NotFound("Member not found")
    return membership


def _ensure_another_admin(board_id: uuid.UUID) -> None:
    admins = BoardMember.query.filter_by(board_id=board_id, role=ROLE_ADMIN).count()
    if admins <= 1:
        raise Conflict("A board must keep at least one admin")
