import uuid

from ..common.clock import same_as_created, utcnow
from ..extensions import db


class Comment(db.Model):
    __tablename__ = "comments"

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    card_id = db.Column(db.Uuid, db.ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=same_as_created, onupdate=utcnow)
    deleted_at = db.Column(db.DateTime(timezone=True), nullable=True)

    author = db.relationship("User", foreign_keys=[user_id], lazy="joined")
