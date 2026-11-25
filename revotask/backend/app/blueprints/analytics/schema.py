from marshmallow import Schema, fields

from ...common.fields import UTCDateTime


class ColumnCountSchema(Schema):
    column_id = fields.UUID()
    name = fields.String()
    order = fields.Float()
    card_count = fields.Integer()


class MemberActivitySchema(Schema):
    user_id = fields.UUID()
    name = fields.String()
    role = fields.String()
    cards_assigned = fields.Integer()
    cards_completed = fields.Integer()
    comments_made = fields.Integer()


class AnalyticsSchema(Schema):
    board_id = fields.UUID()
    week_start = UTCDateTime()
    cards_per_column = fields.List(fields.Nested(ColumnCountSchema))
    completed_this_week = fields.Integer()
    member_activity = fields.List(fields.Nested(MemberActivitySchema))
