from flask import Flask


def register_blueprints(app: Flask) -> None:
    """Attach every feature blueprint. Each package registers its own routes on import."""
    from .analytics import analytics_bp
    from .auth import auth_bp
    from .boards import boards_bp
    from .cards import cards_bp
    from .columns import columns_bp
    from .comments import comments_bp
    from .health import health_bp
    from .notifications import notifications_bp
    from .users import users_bp

    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(boards_bp, url_prefix="/api/boards")
    app.register_blueprint(columns_bp, url_prefix="/api")
    app.register_blueprint(cards_bp, url_prefix="/api")
    app.register_blueprint(comments_bp, url_prefix="/api")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(analytics_bp, url_prefix="/api")
