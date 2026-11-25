import uuid

from flask_jwt_extended import jwt_required

from ...common.auth import current_user_id
from ...common.responses import ok
from . import analytics_bp, service
from .schema import AnalyticsSchema


@analytics_bp.get("/boards/<uuid:board_id>/analytics")
@jwt_required()
def board_analytics(board_id: uuid.UUID):
    """Cards per column, cards completed this week, and member activity (board admins only)."""
    return ok(AnalyticsSchema().dump(service.board_analytics(board_id, current_user_id())))
