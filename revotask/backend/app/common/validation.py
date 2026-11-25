"""Request validation helpers (BE-04). Schemas reject unknown fields by default."""

from flask import request
from marshmallow import Schema, ValidationError

from .errors import BadRequest, ValidationFailed


def load_json(schema: Schema) -> dict:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise BadRequest("Request body must be a JSON object")
    try:
        return schema.load(payload)
    except ValidationError as err:
        raise ValidationFailed(_as_dict(err.messages)) from err


def load_args(schema: Schema) -> dict:
    try:
        return schema.load(request.args.to_dict())
    except ValidationError as err:
        raise ValidationFailed(_as_dict(err.messages)) from err


def _as_dict(messages) -> dict:
    return messages if isinstance(messages, dict) else {"request": list(messages)}
