from marshmallow import Schema, fields, validate

from ...common.fields import UTCDateTime, required_text
from ..columns.schema import ColumnSchema

ROLES = ("admin", "member")


class BoardCreateSchema(Schema):
    name = required_text(100)


class BoardUpdateSchema(Schema):
    name = required_text(100)


class MemberSchema(Schema):
    user_id = fields.UUID()
    name = fields.String(attribute="user.name")
    email = fields.String(attribute="user.email")
    role = fields.String()


class BoardSummarySchema(Schema):
    """One row of the dashboard list."""

    id = fields.UUID()
    name = fields.String()
    owner_id = fields.UUID()
    role = fields.String()
    member_count = fields.Integer()
    created_at = UTCDateTime()
    updated_at = UTCDateTime()


class BoardDetailSchema(BoardSummarySchema):
    """A board with members and its columns, each column holding its cards."""

    members = fields.List(fields.Nested(MemberSchema))
    columns = fields.List(fields.Nested(ColumnSchema))


class MemberAddSchema(Schema):
    email = required_text(255)
    role = fields.String(load_default="member", validate=validate.OneOf(ROLES))


class MemberUpdateSchema(Schema):
    role = fields.String(required=True, validate=validate.OneOf(ROLES))
