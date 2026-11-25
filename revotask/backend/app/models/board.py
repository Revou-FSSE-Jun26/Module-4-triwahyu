import uuid

from ..common.clock import same_as_created, utcnow
from ..extensions import db

ROLE_ADMIN = "admin"
ROLE_MEMBER = "member"


class Board(db.Model):
    __tablename__ = "boards"

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(100), nullable=False)
    owner_id = db.Column(db.Uuid, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=same_as_created, onupdate=utcnow)
    deleted_at = db.Column(db.DateTime(timezone=True), nullable=True)


class BoardMember(db.Model):
    __tablename__ = "board_members"
    __table_args__ = (
        db.UniqueConstraint("board_id", "user_id", name="uq_board_members_board_id_user_id"),
        db.CheckConstraint("role in ('admin', 'member')", name="role_valid"),
    )

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    board_id = db.Column(db.Uuid, db.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = db.Column(db.String(10), nullable=False, default=ROLE_MEMBER, server_default=ROLE_MEMBER)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=same_as_created, onupdate=utcnow)

    user = db.relationship("User", lazy="joined")
