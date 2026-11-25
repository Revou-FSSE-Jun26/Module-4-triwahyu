import logging

from sqlalchemy import text

from ...common.errors import ApiError
from ...extensions import db

log = logging.getLogger(__name__)


class ServiceUnavailable(ApiError):
    status_code = 503
    code = "SERVICE_UNAVAILABLE"
    default_message = "Database unavailable"


def check_database() -> dict:
    """Ping the database. Raises ServiceUnavailable (503) when it cannot be reached."""
    try:
        db.session.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001 - any driver failure means the dependency is down
        log.exception("Health check database ping failed")
        raise ServiceUnavailable() from None
    return {"status": "ok", "database": "up"}
