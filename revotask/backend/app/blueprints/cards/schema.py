from marshmallow import Schema, ValidationError, fields, validate, validates_schema

from ...common.fields import TrimmedStr, UTCDateTime, required_text
from ..users.schema import UserBriefSchema

MAX_ORDER = 1e12
_order_range = validate.Range(min=0, min_inclusive=False, max=MAX_ORDER)


class CardSchema(Schema):
    """Card as returned to clients."""

    id = fields.UUID()
    column_id = fields.UUID()
    title = fields.String()
    description = fields.String(allow_none=True)
    order = fields.Float()
    assignee = fields.Nested(UserBriefSchema, allow_none=True)
    created_by = fields.UUID(allow_none=True)
    column_entered_at = UTCDateTime()
    created_at = UTCDateTime()
    updated_at = UTCDateTime()


class _NamedRefSchema(Schema):
    id = fields.UUID()
    name = fields.String()


class TaskCardSchema(CardSchema):
    """A card plus where it lives, for My Tasks and search results."""

    board = fields.Nested(_NamedRefSchema)
    column = fields.Nested(_NamedRefSchema)


class CardCreateSchema(Schema):
    title = required_text(200)
    description = TrimmedStr(validate=validate.Length(max=5000), allow_none=True)
    assignee_id = fields.UUID(allow_none=True)
    order = fields.Float(validate=_order_range)


class CardUpdateSchema(Schema):
    title = TrimmedStr(validate=validate.Length(min=1, max=200))
    description = TrimmedStr(validate=validate.Length(max=5000), allow_none=True)
    assignee_id = fields.UUID(allow_none=True)

    @validates_schema
    def require_a_field(self, data, **kwargs):
        if not data:
            raise ValidationError("Provide at least one of: title, description, assignee_id.", "request")


class CardPositionSchema(Schema):
    """Move payload: a valid UUID column and a positive, finite float order (REQ-CARD-4)."""

    column_id = fields.UUID(required=True)
    order = fields.Float(required=True, validate=_order_range)


class CardQuerySchema(Schema):
    assignee = fields.String(validate=validate.Equal("me"))
    q = TrimmedStr(validate=validate.Length(min=1, max=100))
    board_id = fields.UUID()
    limit = fields.Integer(load_default=50, validate=validate.Range(min=1, max=100))
