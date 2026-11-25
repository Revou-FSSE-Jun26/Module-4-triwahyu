from flask import current_app
from flask_jwt_extended import create_access_token
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from ...common.errors import Conflict, Unauthorized
from ...extensions import db
from ...models.notification import TYPE_WELCOME
from ...models.user import User
from ..notifications.service import notify

# Verified against when the email is unknown, so both failures cost the same time (BE-09).
_DUMMY_HASH = generate_password_hash("not-a-real-password")
INVALID_CREDENTIALS = "Invalid email or password"


def register_user(data: dict) -> User:
    email = data["email"].lower()
    if User.query.filter_by(email=email).first():
        raise Conflict("Email is already registered")

    user = User(
        name=data["name"],
        email=email,
        password_hash=generate_password_hash(data["password"], method=current_app.config["PASSWORD_HASH_METHOD"]),
    )
    db.session.add(user)
    db.session.flush()
    notify(user.id, TYPE_WELCOME, f"Welcome to RevoTask, {user.name}! Create a board to get started.")
    try:
        db.session.commit()
    except IntegrityError:  # two simultaneous registrations passed the check above (DB-06)
        db.session.rollback()
        raise Conflict("Email is already registered") from None
    return user


def login(data: dict) -> dict:
    user = User.query.filter_by(email=data["email"].lower()).first()
    password_hash = user.password_hash if user else _DUMMY_HASH
    if not check_password_hash(password_hash, data["password"]) or user is None:
        raise Unauthorized(INVALID_CREDENTIALS)

    expires = current_app.config["JWT_ACCESS_TOKEN_EXPIRES"]
    return {
        "access_token": create_access_token(identity=str(user.id)),
        "token_type": "Bearer",
        "expires_in": int(expires.total_seconds()),
        "user": user,
    }
