"""Generate contracts/openapi.json from the Flask URL map (the code is the source of truth).

Usage:
  python scripts/export_openapi.py            write contracts/openapi.json
  python scripts/export_openapi.py --check    exit 1 if the committed file is stale (used in CI)

Routes, methods, path parameters, tags (one per blueprint) and the security requirement are read from the
running app. Summaries come from each handler's docstring. Request and response bodies follow the shared
envelope documented in docs/contracts/error-contract.md.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "contracts" / "openapi.json"
sys.path.insert(0, str(ROOT / "backend"))

PUBLIC = {"health.health", "auth.register", "auth.login"}
ERROR_REF = {"$ref": "#/components/schemas/Error"}
SUCCESS = {"description": "Success. Body is `{ \"data\": ... }`.", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Envelope"}}}}


def build_document() -> dict:
    from app import create_app

    app = create_app(
        {"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite://", "SECRET_KEY": "x" * 40, "JWT_SECRET_KEY": "y" * 40}
    )
    paths: dict = {}
    for rule in sorted(app.url_map.iter_rules(), key=lambda r: r.rule):
        if rule.endpoint == "static" or not rule.rule.startswith("/api"):
            continue
        path = re.sub(r"<(?:uuid:|int:)?(\w+)>", r"{\1}", rule.rule)
        view = app.view_functions[rule.endpoint]
        # rule.arguments is a set, so its order changes between processes (hash randomization). Order by position in the path.
        names = sorted(rule.arguments, key=lambda name: rule.rule.index(f"{name}>"))
        params = [{"name": name, "in": "path", "required": True, "schema": {"type": "string", "format": "uuid"}} for name in names]
        for method in sorted(rule.methods - {"HEAD", "OPTIONS"}):
            doc = (view.__doc__ or "").strip().splitlines()
            operation = {
                "operationId": f"{rule.endpoint.replace('.', '_')}",
                "tags": [rule.endpoint.split(".")[0]],
                "summary": doc[0] if doc else rule.endpoint,
                "parameters": params,
                "responses": {"200": SUCCESS, "400": {"description": "Validation error", "content": {"application/json": {"schema": ERROR_REF}}}},
            }
            if rule.endpoint not in PUBLIC:
                operation["security"] = [{"bearerAuth": []}]
                operation["responses"]["401"] = {"description": "Missing, invalid or expired token", "content": {"application/json": {"schema": ERROR_REF}}}
                operation["responses"]["403"] = {"description": "Not allowed on this resource", "content": {"application/json": {"schema": ERROR_REF}}}
            paths.setdefault(path, {})[method.lower()] = operation
    return {
        "openapi": "3.0.3",
        "info": {"title": "RevoTask API", "version": "1.0.0", "description": "Generated from the Flask URL map by scripts/export_openapi.py."},
        "paths": paths,
        "components": {
            "securitySchemes": {"bearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}},
            "schemas": {
                "Envelope": {"type": "object", "properties": {"data": {}}, "required": ["data"]},
                "Error": {
                    "type": "object",
                    "properties": {"error": {"type": "string"}, "code": {"type": "string"}, "details": {"type": "object"}},
                    "required": ["error"],
                },
            },
        },
    }


def main() -> int:
    rendered = json.dumps(build_document(), indent=2, sort_keys=False) + "\n"
    if "--check" in sys.argv:
        current = TARGET.read_text(encoding="utf-8") if TARGET.exists() else ""
        if current != rendered:
            print("contracts/openapi.json is out of date. Run: python scripts/export_openapi.py")
            return 1
        print("contracts/openapi.json is up to date.")
        return 0
    TARGET.write_text(rendered, encoding="utf-8", newline="\n")
    operations = sum(len(methods) for methods in json.loads(rendered)["paths"].values())
    print(f"Wrote {TARGET.relative_to(ROOT)}: {operations} operations")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
