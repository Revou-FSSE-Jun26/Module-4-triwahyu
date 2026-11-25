import uuid

from ..common.clock import same_as_created, utcnow
from ..extensions import db


class Column(db.Model):
    __tablename__ = "columns"

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    board_id = db.Column(db.Uuid, db.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    order = db.Column(db.Float, nullable=False)  # FLOAT ordering strategy (DB-04)
    is_done = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=same_as_created, onupdate=utcnow)
    deleted_at = db.Column(db.DateTime(timezone=True), nullable=True)
