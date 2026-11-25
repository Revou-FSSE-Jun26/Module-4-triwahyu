"""Typed API errors and the central handlers that turn them into the error envelope (BE-05/06)."""

import logging

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

log = logging.getLogger(__name__)


class ApiError(Exception):
    status_code = 500
    code = "INTERNAL_ERROR"
    default_message = "Internal server error"

    def __init__(self, message: str | None = None, *, code: str | None = None, details: dict | None = None):
        super().__init__(message or self.default_message)
        self.message = message or self.default_message
        if code:
            self.code = code
        self.details = details


class BadRequest(ApiError):
    status_code = 400
    code = "BAD_REQUEST"
    default_message = "Bad request"


class ValidationFailed(BadRequest):
    code = "VALIDATION_ERROR"

    def __init__(self, messages: dict):
        first_field, first_messages = next(iter(messages.items()), ("request", ["Invalid input."]))
        first = first_messages[0] if isinstance(first_messages, list) else str(first_messages)
        super().__init__(f"Validation failed: {first_field}: {first}", details=messages)


class Unauthorized(ApiError):
    status_code = 401
    code = "UNAUTHORIZED"
    default_message = "Authentication required"


class Forbidden(ApiError):
    status_code = 403
    code = "FORBIDDEN"
    default_message = "You do not have permission to do that"


class NotFound(ApiError):
    status_code = 404
    code = "NOT_FOUND"
    default_message = "Resource not found"


class Conflict(ApiError):
    status_code = 409
    code = "CONFLICT"
    default_message = "Conflict with existing data"


def error_response(message: str, status: int, code: str, details: dict | None = None):
    body: dict = {"error": message, "code": code}
    if details:
        body["details"] = details
    return jsonify(body), status


_HTTP_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    413: "PAYLOAD_TOO_LARGE",
    415: "UNSUPPORTED_MEDIA_TYPE",
}


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(ApiError)
    def handle_api_error(err: ApiError):
        return error_response(err.message, err.status_code, err.code, err.details)

    @app.errorhandler(HTTPException)
    def handle_http_error(err: HTTPException):
        status = err.code or 500
        code = _HTTP_CODES.get(status, "HTTP_ERROR")
        message = "Resource not found" if status == 404 else (err.description or err.name)
        return error_response(message, status, code)

    @app.errorhandler(Exception)
    def handle_unexpected(err: Exception):
        log.exception("Unhandled error: %s", type(err).__name__)
        return error_response("Internal server error", 500, "INTERNAL_ERROR")
