from marshmallow import Schema, fields

from ...common.fields import UTCDateTime, required_text
from ..users.schema import UserBriefSchema

MAX_COMMENT_LENGTH = 2000


class CommentSchema(Schema):
    id = fields.UUID()
    card_id = fields.UUID()
    content = fields.String()
    author = fields.Nested(UserBriefSchema)
    created_at = UTCDateTime()
    updated_at = UTCDateTime()


class CommentWriteSchema(Schema):
    """Used for both create and edit. The author always comes from the token (BE-07)."""

    content = required_text(MAX_COMMENT_LENGTH)
