import uuid

from ..common.clock import same_as_created, utcnow
from ..extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True)  # stored lower-case (DB-06)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=same_as_created, onupdate=utcnow)
