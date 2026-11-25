import uuid

from ..common.clock import same_as_created, utcnow
from ..extensions import db


class Card(db.Model):
    __tablename__ = "cards"
    __table_args__ = (db.Index("ix_cards_column_id_order", "column_id", "order"),)

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    column_id = db.Column(db.Uuid, db.ForeignKey("columns.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    order = db.Column(db.Float, nullable=False)  # FLOAT ordering strategy (DB-04)
    assignee_id = db.Column(db.Uuid, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by = db.Column(db.Uuid, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    column_entered_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=same_as_created, onupdate=utcnow)
    deleted_at = db.Column(db.DateTime(timezone=True), nullable=True)

    assignee = db.relationship("User", foreign_keys=[assignee_id], lazy="joined")
