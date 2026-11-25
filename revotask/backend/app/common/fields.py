"""Shared Marshmallow fields and constants."""

from datetime import UTC

from marshmallow import fields, validate


class TrimmedStr(fields.String):
    """A string that is stripped before validators run."""

    def _deserialize(self, value, attr, data, **kwargs):
        return super()._deserialize(value, attr, data, **kwargs).strip()


class UTCDateTime(fields.Field):
    """ISO 8601 output that always carries an offset (SQLite returns naive values)."""

    def _serialize(self, value, attr, obj, **kwargs):
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(UTC).isoformat()


def required_text(max_length: int) -> TrimmedStr:
    return TrimmedStr(required=True, validate=validate.Length(min=1, max=max_length))
