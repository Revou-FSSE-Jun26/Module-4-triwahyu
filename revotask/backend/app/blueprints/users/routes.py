from flask_jwt_extended import jwt_required

from ...common.auth import current_user_id
from ...common.responses import ok
from ...common.validation import load_json
from . import service, users_bp
from .schema import UserSchema, UserUpdateSchema


@users_bp.get("/me")
@jwt_required()
def get_me():
    """Return the current user's profile (password excluded)."""
    return ok(UserSchema().dump(service.get_user(current_user_id())))


@users_bp.patch("/me")
@jwt_required()
def update_me():
    """Update name and email. A `password` field is rejected as unknown."""
    data = load_json(UserUpdateSchema())
    return ok(UserSchema().dump(service.update_profile(current_user_id(), data)))
