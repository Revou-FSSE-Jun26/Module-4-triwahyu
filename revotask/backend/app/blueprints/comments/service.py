import uuid

from ...common.clock import utcnow
from ...common.errors import Forbidden, NotFound
from ...extensions import db
from ...models import Comment, User
from ...models.notification import TYPE_COMMENT_ADDED
from ..cards.service import require_card_member
from ..notifications.service import notify


def _get_comment(comment_id: uuid.UUID) -> Comment:
    comment = db.session.get(Comment, comment_id)
    if comment is None or comment.deleted_at is not None:
        raise NotFound("Comment not found")
    return comment


def _require_owner(comment_id: uuid.UUID, user_id: uuid.UUID) -> Comment:
    """The caller must still be a board member and must have written the comment."""
    comment = _get_comment(comment_id)
    require_card_member(comment.card_id, user_id)
    if comment.user_id != user_id:
        raise Forbidden("You can only change your own comments")
    return comment


def add_comment(card_id: uuid.UUID, user_id: uuid.UUID, content: str) -> Comment:
    card, column, _ = require_card_member(card_id, user_id)
    comment = Comment(card_id=card_id, user_id=user_id, content=content)
    db.session.add(comment)
    author = db.session.get(User, user_id)
    for recipient in {card.assignee_id, card.created_by} - {None, user_id}:
        notify(
            recipient,
            TYPE_COMMENT_ADDED,
            f"{author.name} commented on “{card.title}”.",
            card_id=card.id,
            board_id=column.board_id,
        )
    db.session.commit()
    return comment


def list_comments(card_id: uuid.UUID, user_id: uuid.UUID) -> list[Comment]:
    require_card_member(card_id, user_id)
    return (
        Comment.query.filter(Comment.card_id == card_id, Comment.deleted_at.is_(None))
        .order_by(Comment.created_at, Comment.id)
        .all()
    )


def edit_comment(comment_id: uuid.UUID, user_id: uuid.UUID, content: str) -> Comment:
    comment = _require_owner(comment_id, user_id)
    comment.content = content
    db.session.commit()
    return comment


def delete_comment(comment_id: uuid.UUID, user_id: uuid.UUID) -> uuid.UUID:
    comment = _require_owner(comment_id, user_id)
    comment.deleted_at = utcnow()
    db.session.commit()
    return comment.id
