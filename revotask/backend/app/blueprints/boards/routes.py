import uuid

from flask_jwt_extended import jwt_required

from ...common.auth import current_user_id
from ...common.responses import created, ok
from ...common.validation import load_json
from . import boards_bp, service
from .schema import (
    BoardCreateSchema,
    BoardDetailSchema,
    BoardSummarySchema,
    BoardUpdateSchema,
    MemberAddSchema,
    MemberSchema,
    MemberUpdateSchema,
)


@boards_bp.post("")
@jwt_required()
def create_board():
    """Create a board. The creator becomes its admin."""
    board = service.create_board(current_user_id(), load_json(BoardCreateSchema())["name"])
    return created(BoardSummarySchema().dump(board))


@boards_bp.get("")
@jwt_required()
def list_boards():
    """List every board the current user belongs to."""
    return ok(BoardSummarySchema(many=True).dump(service.list_boards(current_user_id())))


@boards_bp.get("/<uuid:board_id>")
@jwt_required()
def get_board(board_id: uuid.UUID):
    """Return a board with members and all columns and cards nested."""
    return ok(BoardDetailSchema().dump(service.get_board_detail(board_id, current_user_id())))


@boards_bp.patch("/<uuid:board_id>")
@jwt_required()
def update_board(board_id: uuid.UUID):
    """Rename a board (admin only)."""
    name = load_json(BoardUpdateSchema())["name"]
    return ok(BoardSummarySchema().dump(service.rename_board(board_id, current_user_id(), name)))


@boards_bp.delete("/<uuid:board_id>")
@jwt_required()
def delete_board(board_id: uuid.UUID):
    """Soft-delete a board and its contents (admin only)."""
    return ok({"id": str(service.delete_board(board_id, current_user_id()))})


@boards_bp.get("/<uuid:board_id>/members")
@jwt_required()
def list_members(board_id: uuid.UUID):
    return ok(MemberSchema(many=True).dump(service.list_members(board_id, current_user_id())))


@boards_bp.post("/<uuid:board_id>/members")
@jwt_required()
def add_member(board_id: uuid.UUID):
    """Add an existing user to the board by email (admin only)."""
    data = load_json(MemberAddSchema())
    member = service.add_member(board_id, current_user_id(), data["email"], data["role"])
    return created(MemberSchema().dump(member))


@boards_bp.patch("/<uuid:board_id>/members/<uuid:user_id>")
@jwt_required()
def update_member(board_id: uuid.UUID, user_id: uuid.UUID):
    role = load_json(MemberUpdateSchema())["role"]
    return ok(MemberSchema().dump(service.set_member_role(board_id, current_user_id(), user_id, role)))


@boards_bp.delete("/<uuid:board_id>/members/<uuid:user_id>")
@jwt_required()
def remove_member(board_id: uuid.UUID, user_id: uuid.UUID):
    return ok({"id": str(service.remove_member(board_id, current_user_id(), user_id))})
