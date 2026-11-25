from flask import Blueprint

boards_bp = Blueprint("boards", __name__)

from . import routes  # noqa: E402,F401  (registers the handlers)
