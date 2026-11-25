import re

from marshmallow import Schema, ValidationError, fields, validate

from ...common.fields import TrimmedStr, required_text
from ..users.schema import UserSchema


def validate_password_strength(value: str) -> None:
    if not (re.search(r"[A-Za-z]", value) and re.search(r"\d", value)):
        raise ValidationError("Must contain at least one letter and one number.")


class RegisterSchema(Schema):
    name = required_text(100)
    email = TrimmedStr(required=True, validate=[validate.Length(max=255), validate.Email()])
    password = fields.String(required=True, validate=[validate.Length(min=8, max=128), validate_password_strength])


class LoginSchema(Schema):
    email = TrimmedStr(required=True, validate=validate.Length(min=1, max=255))
    password = fields.String(required=True, validate=validate.Length(min=1, max=128))


class LoginResponseSchema(Schema):
    access_token = fields.String()
    token_type = fields.String()
    expires_in = fields.Integer()
    user = fields.Nested(UserSchema)
