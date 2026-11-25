import uuid

from flask_jwt_extended import jwt_required

from ...common.auth import current_user_id
from ...common.responses import created, ok
from ...common.validation import load_json
from . import columns_bp, service
from .schema import ColumnCreateSchema, ColumnReorderSchema, ColumnSchema, ColumnUpdateSchema


@columns_bp.post("/boards/<uuid:board_id>/columns")
@jwt_required()
def create_column(board_id: uuid.UUID):
    """Add a column to a board."""
    data = load_json(ColumnCreateSchema())
    return created(ColumnSchema().dump(service.create_column(board_id, current_user_id(), data)))


@columns_bp.patch("/columns/<uuid:column_id>")
@jwt_required()
def update_column(column_id: uuid.UUID):
    """Rename a column or mark it as a done column."""
    data = load_json(ColumnUpdateSchema())
    return ok(ColumnSchema().dump(service.update_column(column_id, current_user_id(), data)))


@columns_bp.delete("/columns/<uuid:column_id>")
@jwt_required()
def delete_column(column_id: uuid.UUID):
    """Soft-delete a column and its cards (admin only)."""
    return ok({"id": str(service.delete_column(column_id, current_user_id()))})


@columns_bp.patch("/boards/<uuid:board_id>/columns/reorder")
@jwt_required()
def reorder_columns(board_id: uuid.UUID):
    """Reorder columns using the FLOAT order strategy."""
    items = load_json(ColumnReorderSchema())["items"]
    columns = service.reorder_columns(board_id, current_user_id(), items)
    return ok(ColumnSchema(many=True, exclude=("cards",)).dump(columns))
