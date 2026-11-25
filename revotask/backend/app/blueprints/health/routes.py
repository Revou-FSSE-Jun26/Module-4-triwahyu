from ...common.responses import ok
from . import health_bp, service


@health_bp.get("/health")
def health():
    """Liveness and database check used by Helipod and Postman."""
    return ok(service.check_database())
