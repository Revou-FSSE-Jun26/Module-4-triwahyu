from ...common.responses import created, ok
from ...common.validation import load_json
from ..users.schema import UserSchema
from . import auth_bp, service
from .schema import LoginResponseSchema, LoginSchema, RegisterSchema


@auth_bp.post("/register")
def register():
    """Register a new user. The password is hashed before it is stored."""
    user = service.register_user(load_json(RegisterSchema()))
    return created({"user": UserSchema().dump(user)})


@auth_bp.post("/login")
def login():
    """Authenticate and return a JWT with an expiry."""
    result = service.login(load_json(LoginSchema()))
    return ok(LoginResponseSchema().dump(result))
