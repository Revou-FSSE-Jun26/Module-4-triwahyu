from flask import Blueprint

columns_bp = Blueprint("columns", __name__)

from . import routes  # noqa: E402,F401  (registers the handlers)
