from flask import Blueprint

cards_bp = Blueprint("cards", __name__)

from . import routes  # noqa: E402,F401  (registers the handlers)
