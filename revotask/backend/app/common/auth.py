"""Identity and JWT error handling (BE-07)."""

import uuid

from flask_jwt_extended import get_jwt_identity

from ..extensions import jwt
from .errors import error_response


def current_user_id() -> uuid.UUID:
    """The caller's id, taken only from the verified token."""
    return uuid.UUID(get_jwt_identity())


def register_jwt_handlers() -> None:
    """Return 401 in the standard envelope for every JWT failure (the library defaults to 422)."""

    @jwt.unauthorized_loader
    def _missing(_reason: str):
        return error_response("Authentication required", 401, "UNAUTHORIZED")

    @jwt.invalid_token_loader
    def _invalid(_reason: str):
        return error_response("Invalid authentication token", 401, "UNAUTHORIZED")

    @jwt.expired_token_loader
    def _expired(_header: dict, _payload: dict):
        return error_response("Authentication token has expired", 401, "UNAUTHORIZED")
