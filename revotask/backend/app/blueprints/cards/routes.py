import uuid

from flask_jwt_extended import jwt_required

from ...common.auth import current_user_id
from ...common.responses import created, ok
from ...common.validation import load_args, load_json
from . import cards_bp, service
from .schema import (
    CardCreateSchema,
    CardPositionSchema,
    CardQuerySchema,
    CardSchema,
    CardUpdateSchema,
    TaskCardSchema,
)


@cards_bp.post("/columns/<uuid:column_id>/cards")
@jwt_required()
def create_card(column_id: uuid.UUID):
    """Create a card in a column."""
    data = load_json(CardCreateSchema())
    return created(CardSchema().dump(service.create_card(column_id, current_user_id(), data)))


@cards_bp.get("/cards")
@jwt_required()
def list_cards():
    """List cards for My Tasks (`assignee=me`) or search (`q`, `board_id`)."""
    args = load_args(CardQuerySchema())
    cards = service.list_cards(
        current_user_id(),
        assignee_me=args.get("assignee") == "me",
        q=args.get("q"),
        board_id=args.get("board_id"),
        limit=args["limit"],
    )
    return ok(TaskCardSchema(many=True).dump(cards))


@cards_bp.patch("/cards/<uuid:card_id>")
@jwt_required()
def update_card(card_id: uuid.UUID):
    """Update a card's title, description or assignee."""
    data = load_json(CardUpdateSchema())
    return ok(CardSchema().dump(service.update_card(card_id, current_user_id(), data)))


@cards_bp.delete("/cards/<uuid:card_id>")
@jwt_required()
def delete_card(card_id: uuid.UUID):
    """Soft-delete a card (its creator or a board admin)."""
    return ok({"id": str(service.delete_card(card_id, current_user_id()))})


@cards_bp.patch("/cards/<uuid:card_id>/position")
@jwt_required()
def move_card(card_id: uuid.UUID):
    """Move a card to a column at a float order, validated by CardPositionSchema."""
    data = load_json(CardPositionSchema())
    card, rebalanced = service.move_card(card_id, current_user_id(), data["column_id"], data["order"])
    return ok({"card": CardSchema().dump(card), "rebalanced": rebalanced})
