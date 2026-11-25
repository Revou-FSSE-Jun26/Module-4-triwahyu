from flask import Flask
from flask_cors import CORS

from .common.auth import register_jwt_handlers
from .common.errors import register_error_handlers
from .config import build_config
from .extensions import db, jwt, migrate


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_mapping(build_config(test_config))
    app.url_map.strict_slashes = False

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    from . import models  # noqa: F401  (register tables with SQLAlchemy metadata)

    register_jwt_handlers()
    register_error_handlers(app)

    from .blueprints import register_blueprints

    register_blueprints(app)
    return app
