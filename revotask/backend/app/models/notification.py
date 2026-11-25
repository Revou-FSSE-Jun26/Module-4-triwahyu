import uuid

from ..common.clock import same_as_created, utcnow
from ..extensions import db

TYPE_WELCOME = "welcome"
TYPE_CARD_ASSIGNED = "card_assigned"
TYPE_COMMENT_ADDED = "comment_added"
TYPE_MEMBER_ADDED = "member_added"


class Notification(db.Model):
    __tablename__ = "notifications"
    __table_args__ = (db.Index("ix_notifications_user_id_created_at", "user_id", "created_at"),)

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = db.Column(db.String(30), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    card_id = db.Column(db.Uuid, db.ForeignKey("cards.id", ondelete="SET NULL"), nullable=True)
    board_id = db.Column(db.Uuid, db.ForeignKey("boards.id", ondelete="SET NULL"), nullable=True)
    read_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=same_as_created, onupdate=utcnow)
