from marshmallow import Schema, ValidationError, fields, validate, validates_schema

from ...common.fields import TrimmedStr, UTCDateTime, required_text
from ..cards.schema import MAX_ORDER, CardSchema


class ColumnSchema(Schema):
    """Column as returned to clients. `cards` is present only on the board detail."""

    id = fields.UUID()
    board_id = fields.UUID()
    name = fields.String()
    order = fields.Float()
    is_done = fields.Boolean()
    created_at = UTCDateTime()
    updated_at = UTCDateTime()
    cards = fields.List(fields.Nested(CardSchema))


class ColumnCreateSchema(Schema):
    name = required_text(100)
    is_done = fields.Boolean(load_default=False)
    order = fields.Float(validate=validate.Range(min=0, min_inclusive=False, max=MAX_ORDER))


class ColumnUpdateSchema(Schema):
    name = TrimmedStr(validate=validate.Length(min=1, max=100))
    is_done = fields.Boolean()

    @validates_schema
    def require_a_field(self, data, **kwargs):
        if not data:
            raise ValidationError("Provide at least one of: name, is_done.", "request")


class ReorderItemSchema(Schema):
    id = fields.UUID(required=True)
    order = fields.Float(required=True, validate=validate.Range(min=0, min_inclusive=False, max=MAX_ORDER))


class ColumnReorderSchema(Schema):
    items = fields.List(fields.Nested(ReorderItemSchema), required=True, validate=validate.Length(min=1, max=200))
