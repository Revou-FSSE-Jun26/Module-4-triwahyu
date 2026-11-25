from marshmallow import Schema, ValidationError, fields, validate, validates_schema

from ...common.fields import TrimmedStr, UTCDateTime


class UserSchema(Schema):
    """Public profile. There is deliberately no password field (BE-09)."""

    id = fields.UUID(dump_only=True)
    name = fields.String()
    email = fields.String()
    created_at = UTCDateTime()


class UserBriefSchema(Schema):
    id = fields.UUID()
    name = fields.String()


class UserUpdateSchema(Schema):
    """Profile update. `password` is an unknown field here, so it is rejected (REQ-USER-3)."""

    name = TrimmedStr(validate=validate.Length(min=1, max=100))
    email = TrimmedStr(validate=[validate.Length(max=255), validate.Email()])

    @validates_schema
    def require_a_field(self, data, **kwargs):
        if not data:
            raise ValidationError("Provide at least one of: name, email.", "request")
