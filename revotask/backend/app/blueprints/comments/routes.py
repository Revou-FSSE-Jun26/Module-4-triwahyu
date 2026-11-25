import uuid

from flask_jwt_extended import jwt_required

from ...common.auth import current_user_id
from ...common.responses import created, ok
from ...common.validation import load_json
from . import comments_bp, service
from .schema import CommentSchema, CommentWriteSchema


@comments_bp.post("/cards/<uuid:card_id>/comments")
@jwt_required()
def add_comment(card_id: uuid.UUID):
    """Add a comment to a card."""
    content = load_json(CommentWriteSchema())["content"]
    return created(CommentSchema().dump(service.add_comment(card_id, current_user_id(), content)))


@comments_bp.get("/cards/<uuid:card_id>/comments")
@jwt_required()
def list_comments(card_id: uuid.UUID):
    """List the comments on a card, oldest first."""
    return ok(CommentSchema(many=True).dump(service.list_comments(card_id, current_user_id())))


@comments_bp.patch("/comments/<uuid:comment_id>")
@jwt_required()
def edit_comment(comment_id: uuid.UUID):
    """Edit a comment (owner only)."""
    content = load_json(CommentWriteSchema())["content"]
    return ok(CommentSchema().dump(service.edit_comment(comment_id, current_user_id(), content)))


@comments_bp.delete("/comments/<uuid:comment_id>")
@jwt_required()
def delete_comment(comment_id: uuid.UUID):
    """Delete a comment (owner only)."""
    return ok({"id": str(service.delete_comment(comment_id, current_user_id()))})
