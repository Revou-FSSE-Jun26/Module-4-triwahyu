# Backend Guidelines

Scope: everything under `backend/app/` except `models/` (see `database.md`).
Every guideline has a **Rule**, a **Rationale**, and a concrete RevoTask **Example**.
Rule IDs (`BE-xx`) are referenced by `scripts/check_guidelines.py` and the violation report.
Ownership: this file owns HTTP, validation, authorization, configuration and secrets.

## BE-01 One blueprint per feature with three files

**Rule:** Each feature lives in `app/blueprints/<feature>/` with `routes.py`, `service.py`, `schema.py` and an `__init__.py` that creates the `Blueprint`.
**Rationale:** A predictable layout lets any developer, or any AI agent, find the right file without searching.
**Example:** Comments live in `blueprints/comments/{routes,service,schema}.py` and nowhere else.

## BE-02 Keep route handlers thin

**Rule:** A handler authenticates, validates input with a schema, calls exactly one service function, and returns a response helper. No queries, branching on business state, or notification logic in `routes.py`.
**Rationale:** HTTP concerns and business rules change for different reasons, and services can be tested without a request context.
**Example:** `create_comment()` in `comments/routes.py` is four lines and delegates to `service.add_comment(...)`.

## BE-03 Touch the database only from services

**Rule:** `db.session`, `Model.query` and `select()` appear only in `service.py` (and `models/`). Routes and schemas never import `db`.
**Rationale:** One place owns each transaction, which makes commits, rollbacks and authorization checks auditable.
**Example:** `boards/routes.py` imports `service` and `schema` only; `scripts/check_guidelines.py` fails the build if it imports `db`.

## BE-04 Validate every request at the boundary with Marshmallow

**Rule:** Each endpoint that reads a body or query string loads it through a schema with `unknown = RAISE`. Path IDs use `<uuid:...>` converters. Trim strings and bound every length and number.
**Rationale:** Browser input is untrusted, and rejecting unknown fields stops mass assignment, such as sending `password` to `PATCH /api/users/me`.
**Example:** `CardPositionSchema` requires a UUID `column_id` and an `order` greater than 0 and finite; extra keys give HTTP 400.

## BE-05 Return one JSON envelope

**Rule:** Success is `{"data": ...}` built by `common/responses.py`. Failure is `{"error": "<message>", "code": "<CODE>", "details": {...}}` built by the central error handler. Never call `jsonify` in a route.
**Rationale:** The frontend can handle every response with one code path, and the contract is defined once in `docs/contracts/error-contract.md`.
**Example:** A missing comment body returns `400 {"error": "Validation failed: content: Missing data for required field.", "code": "VALIDATION_ERROR", "details": {...}}`.

## BE-06 Raise typed errors and never leak internals

**Rule:** Services raise `ApiError` subclasses (`NotFound`, `Forbidden`, `Conflict`, ...). The app registers handlers for `ApiError`, HTTP exceptions, JWT failures, and a catch-all that logs the traceback and returns a generic 500.
**Rationale:** Stack traces and SQL text help attackers and confuse users.
**Example:** A database failure during `POST /api/boards` returns `500 {"error": "Internal server error"}` and logs the exception server-side.

## BE-07 Take the caller's identity only from the verified token

**Rule:** Protected routes use `@jwt_required()`, and the actor is `current_user_id()` from the token. Never accept `user_id`, `owner_id` or `author_id` from the request body or query string. JWT failures return 401 in the standard envelope.
**Rationale:** Any identity the client can send is an identity the client can forge.
**Example:** `POST /api/cards/<id>/comments` stores `user_id = current_user_id()`; a body containing `user_id` is rejected by `unknown = RAISE`.

## BE-08 Authorize in the service on every resource access

**Rule:** Each service function that reads or changes a board, column, card or comment first calls `require_member` or `require_admin` (or an ownership check). A non-member gets 403, a missing resource gets 404, and checks follow `docs/contracts/permission-matrix.md`.
**Rationale:** A UUID in a URL is an identifier, not a permission, and hiding a button is not authorization.
**Example:** `comments.service.edit_comment` raises `Forbidden` unless `comment.user_id == actor_id`, even if the actor is a board admin.

## BE-09 Hash passwords and keep login errors generic

**Rule:** Passwords are hashed with Werkzeug (`scrypt`) before storage, are never returned or logged, and login fails with the same message and status for an unknown email and a wrong password. Password changes are not accepted by profile endpoints.
**Rationale:** Stolen databases must not reveal passwords, and distinct errors let attackers enumerate accounts.
**Example:** `UserSchema` has no `password_hash` field; both failure cases return `401 "Invalid email or password"`.

## BE-10 Read configuration and secrets from the environment, and fail fast

**Rule:** `config.py` is the only place that reads `os.environ`. Secrets (`SECRET_KEY`, `JWT_SECRET_KEY`, `DATABASE_URL`) have no literal defaults in code. In production a missing or short secret stops startup. Commit only `.env.example`.
**Rationale:** Credentials in Git cannot be fully revoked, and a hardcoded default silently ships to production.
**Example:** With `APP_ENV=production` and no `JWT_SECRET_KEY`, `create_app()` raises `RuntimeError` before serving a request.

## BE-11 Bound every list endpoint

**Rule:** Endpoints returning collections accept validated `page` and `per_page` (default 20, maximum 100), or a validated `limit`, and return the total.
**Rationale:** Unbounded queries let one request exhaust memory and make responses unpredictable.
**Example:** `GET /api/notifications?per_page=500` returns 400; `per_page=20` returns `items`, `total` and `pages`.

## BE-12 Test every endpoint's success and failure paths

**Rule:** Each endpoint has pytest cases for success (200/201), validation failure (400), missing token (401), and forbidden or missing resource (403/404), and each test names the requirement it covers (`REQ-...`). The fixtures drop every table, so they refuse any database whose name does not contain `test`.
**Rationale:** Authorization and validation failures are core behaviour, and traceability proves nothing was skipped.
**Example:** `tests/test_comments.py` covers 201, 400 (missing `content`), 401 (no token) and 403 (editing someone else's comment). Setting `TEST_DATABASE_URL` to the dev database `revotask` raises `Refusing to run tests`; `revotask_test` is accepted.
