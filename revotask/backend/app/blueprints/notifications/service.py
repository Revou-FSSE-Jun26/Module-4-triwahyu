import uuid

from sqlalchemy import func

from ...common.clock import utcnow
from ...common.errors import NotFound
from ...extensions import db
from ...models.notification import Notification


def notify(user_id, type_: str, message: str, *, card_id=None, board_id=None) -> Notification:
    """Stage a notification. The caller owns the transaction and commits."""
    notification = Notification(user_id=user_id, type=type_, message=message[:255], card_id=card_id, board_id=board_id)
    db.session.add(notification)
    return notification


def list_notifications(user_id: uuid.UUID, page: int, per_page: int) -> dict:
    query = Notification.query.filter_by(user_id=user_id)
    total = query.count()
    items = (
        query.order_by(Notification.created_at.desc(), Notification.id)
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    unread = (
        db.session.query(func.count(Notification.id))
        .filter(Notification.user_id == user_id, Notification.read_at.is_(None))
        .scalar()
    )
    return {"items": items, "total": total, "unread_count": unread}


def mark_read(user_id: uuid.UUID, notification_id: uuid.UUID) -> Notification:
    notification = db.session.get(Notification, notification_id)
    if notification is None or notification.user_id != user_id:
        raise NotFound("Notification not found")  # never confirm another user's ids
    if notification.read_at is None:
        notification.read_at = utcnow()
        db.session.commit()
    return notification
