from marshmallow import Schema, fields, validate

from ...common.fields import UTCDateTime

MAX_PER_PAGE = 100


class NotificationSchema(Schema):
    id = fields.UUID()
    type = fields.String()
    message = fields.String()
    card_id = fields.UUID(allow_none=True)
    board_id = fields.UUID(allow_none=True)
    read = fields.Method("get_read")
    created_at = UTCDateTime()

    def get_read(self, obj) -> bool:
        return obj.read_at is not None


class PageQuerySchema(Schema):
    page = fields.Integer(load_default=1, validate=validate.Range(min=1, max=100_000))
    per_page = fields.Integer(load_default=20, validate=validate.Range(min=1, max=MAX_PER_PAGE))
