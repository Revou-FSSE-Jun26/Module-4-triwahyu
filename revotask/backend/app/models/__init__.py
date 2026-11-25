"""Import every model so Flask-Migrate and `db.create_all()` see the full metadata."""

from .board import ROLE_ADMIN, ROLE_MEMBER, Board, BoardMember
from .card import Card
from .column import Column
from .comment import Comment
from .notification import Notification
from .user import User

__all__ = [
    "ROLE_ADMIN",
    "ROLE_MEMBER",
    "Board",
    "BoardMember",
    "Card",
    "Column",
    "Comment",
    "Notification",
    "User",
]
