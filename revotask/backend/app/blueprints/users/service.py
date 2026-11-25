import uuid

from sqlalchemy.exc import IntegrityError

from ...common.errors import Conflict, NotFound
from ...extensions import db
from ...models.user import User


def get_user(user_id: uuid.UUID) -> User:
    user = db.session.get(User, user_id)
    if user is None:
        raise NotFound("User not found")
    return user


def update_profile(user_id: uuid.UUID, data: dict) -> User:
    """Update name and/or email. Passwords are never changed here (BE-09)."""
    user = get_user(user_id)
    if "email" in data:
        email = data["email"].lower()
        taken = User.query.filter(User.email == email, User.id != user.id).first()
        if taken:
            raise Conflict("Email is already registered")
        user.email = email
    if "name" in data:
        user.name = data["name"]
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise Conflict("Email is already registered") from None
    return user
