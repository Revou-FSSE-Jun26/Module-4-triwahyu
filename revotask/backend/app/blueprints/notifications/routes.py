import uuid

from flask_jwt_extended import jwt_required

from ...common.auth import current_user_id
from ...common.responses import ok, paginated
from ...common.validation import load_args
from . import notifications_bp, service
from .schema import NotificationSchema, PageQuerySchema


@notifications_bp.get("")
@jwt_required()
def list_notifications():
    """Return the current user's notifications, newest first, paginated."""
    args = load_args(PageQuerySchema())
    result = service.list_notifications(current_user_id(), args["page"], args["per_page"])
    return paginated(
        NotificationSchema(many=True).dump(result["items"]),
        page=args["page"],
        per_page=args["per_page"],
        total=result["total"],
        unread_count=result["unread_count"],
    )


@notifications_bp.patch("/<uuid:notification_id>/read")
@jwt_required()
def mark_read(notification_id: uuid.UUID):
    """Mark one notification as read."""
    return ok(NotificationSchema().dump(service.mark_read(current_user_id(), notification_id)))
