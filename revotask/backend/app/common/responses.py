"""Success envelope builders. Routes must use these instead of jsonify (BE-05)."""

from flask import jsonify


def ok(data=None, status: int = 200):
    return jsonify({"data": data}), status


def created(data=None):
    return ok(data, 201)


def paginated(items: list, *, page: int, per_page: int, total: int, **extra):
    pages = (total + per_page - 1) // per_page if per_page else 0
    return ok({"items": items, "page": page, "per_page": per_page, "total": total, "pages": pages, **extra})
