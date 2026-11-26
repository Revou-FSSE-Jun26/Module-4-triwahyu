# Foundation: Requirements

## Project brief

**Overview.** RevoTask is a Trello-like task management application built through a disciplined AI-driven workflow (Kiro and Kiro CLI). Users create boards, organize work into columns, move cards between stages by drag-and-drop, collaborate through comments, and track the tasks assigned to them. A Flask API and a Next.js frontend are deployed separately.

**User roles.**

| Role                | Can do                                                                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Board member        | Create boards, add columns and cards, move cards, comment, edit their own comments, track assigned tasks, receive notifications.                                                          |
| Board administrator | Everything a member can do, plus rename or delete the board, manage member access and roles, delete columns, and view board analytics. The creator of a board is its first administrator. |

**Core features.** JWT authentication with protected routes; boards, columns and cards; FLOAT-ordered drag-and-drop; comments (owner-only edit and delete); notifications with a polled unread badge; card search with a 300 ms debounce; My Tasks; profile management; board analytics.

**Tech stack.** Next.js (App Router), React, TypeScript, Tailwind CSS, react-hot-toast, Playwright, Vitest and React Testing Library. Flask, SQLAlchemy, Flask-Migrate, Flask-JWT-Extended, Marshmallow, PostgreSQL, python-dotenv, Gunicorn, pytest. Vercel (API), Vercel (web). Kiro and Kiro CLI as the AI tools.

**Non-functional requirements.** Security, reliability, responsiveness and accessibility, performance, and maintainability. They are specified as REQ-NFR-1 to REQ-NFR-5 below.

## Scope of this slice

Health endpoint, shared API envelope, environment configuration, shared UI components and API client, quality gates, and the cross-cutting E2E journey.

## Requirements

### REQ-FND-1 · Health check

**Story:** As an operator, I want a health endpoint so that deployments and monitors can verify the API and its database.

- **AC-FND-1.1** WHEN `GET /api/health` is called without a token, THEN the API SHALL respond `200` with `{"data": {"status": "ok", "database": "up"}}`.
- **AC-FND-1.2** IF the database cannot be reached, THEN the API SHALL respond `503` with the error envelope instead of a false `200`.

### REQ-FND-2 · Response envelope and error handling

**Story:** As a frontend developer, I want one response shape so that every call is handled the same way.

- **AC-FND-2.1** WHEN a request succeeds, THEN the response body SHALL contain exactly one top-level key, `data`.
- **AC-FND-2.2** WHEN a request fails, THEN the body SHALL be `{"error": "<message>", "code": "<CODE>"}` with an optional `details` object, and `error` SHALL be a string.
- **AC-FND-2.3** WHEN a route does not exist, the method is wrong, or the JSON is malformed, THEN the API SHALL return the error envelope with `404`, `405` or `400`, not an HTML page.
- **AC-FND-2.4** WHEN an unexpected exception occurs, THEN the API SHALL respond `500` with the generic message `Internal server error` and SHALL NOT include the exception text, SQL or a stack trace.
- **AC-FND-2.5** WHEN a JWT is missing, malformed or expired, THEN the API SHALL respond `401` in the envelope (never `422`).

### REQ-FND-3 · Configuration from the environment

**Story:** As a deployer, I want all configuration in environment variables so that no secret is committed.

- **AC-FND-3.1** WHEN the app starts, THEN `config.py` SHALL be the only module that reads `os.environ`, and no secret or database URL SHALL have a literal default in code.
- **AC-FND-3.2** IF `APP_ENV=production` and `SECRET_KEY` or `JWT_SECRET_KEY` is missing or shorter than 32 characters, THEN startup SHALL fail with a clear error.
- **AC-FND-3.3** IF `DATABASE_URL` is missing, THEN startup SHALL fail; a `postgres://` or `postgresql://` URL SHALL be rewritten to `postgresql+psycopg://`.
- **AC-FND-3.4** WHEN `CORS_ORIGINS` lists origins, THEN preflight requests from those origins SHALL succeed and others SHALL receive no CORS headers.
- **AC-FND-3.5** WHEN the repository is inspected, THEN `.env.example` SHALL exist for both projects with placeholder values and no real `.env*` file SHALL be tracked.
- **AC-FND-3.6** WHEN the app runs on Vercel (`VERCEL=1`), THEN the database engine SHALL open connections per request without a pool and SHALL disable psycopg server-side prepared statements; WHEN it runs elsewhere, THEN it SHALL keep a pre-pinged pool.

### REQ-FND-4 · Typed API client

**Story:** As a frontend developer, I want one typed fetch wrapper so that token handling and errors are consistent.

- **AC-FND-4.1** WHEN code runs in the browser, THEN `lib/apiClient.ts` SHALL use `NEXT_PUBLIC_API_BASE_URL`; WHEN it runs on the server, THEN it SHALL use `API_BASE_URL`.
- **AC-FND-4.2** WHEN a token is supplied, THEN the request SHALL carry `Authorization: Bearer <token>`.
- **AC-FND-4.3** WHEN the response is not 2xx or the network fails, THEN the client SHALL throw `ApiError` with `statusCode` and `message` (status `0` for network failure).
- **AC-FND-4.4** WHEN a response succeeds, THEN the client SHALL return the unwrapped `data` typed by the caller.

### REQ-FND-5 · Error toasts

**Story:** As a user, I want clear messages when something fails so that I know what to do next.

- **AC-FND-5.1** WHEN `useErrorHandler` receives an `ApiError`, THEN it SHALL show a toast chosen by `statusCode` (network, 400, 401, 403, 404, 409, 429, 5xx).
- **AC-FND-5.2** WHEN the error is not an `ApiError`, THEN the toast SHALL be generic and SHALL NOT show the error's own message.
- **AC-FND-5.3** WHEN the status is 401, THEN the handler SHALL also sign the user out.
- **AC-FND-5.4** `lib/toast.ts` SHALL wrap `toast.success()`, `toast.error()` and `toast.loading()`.

### REQ-FND-6 · Shared UI components

**Story:** As a user, I want consistent buttons, badges and dialogs so that the product feels coherent and accessible.

- **AC-FND-6.1** `BaseButton` SHALL offer primary, secondary and destructive variants, default to `type="button"`, and keep a 44 px minimum hit target.
- **AC-FND-6.2** `BaseBadge` SHALL offer color variants.
- **AC-FND-6.3** `BaseModal` SHALL expose `role="dialog"` with a unique `aria-labelledby`, close on Escape, lock page scroll, and return focus to the opener.
- **AC-FND-6.4** Pages and feature components SHALL use `BaseButton` and SHALL contain no raw `<button>` elements; every in-app form SHALL be wrapped in `BaseModal`.

### REQ-FND-7 · Schema migrations

**Story:** As a deployer, I want reproducible schema changes so that production matches the models.

- **AC-FND-7.1** WHEN `flask db upgrade` runs on an empty PostgreSQL database, THEN it SHALL create all tables and `flask db downgrade base` SHALL remove them.
- **AC-FND-7.2** WHEN `flask db check` runs after upgrade, THEN it SHALL report no model drift.

### REQ-FND-8 · Quality gates and delivery

**Story:** As a maintainer, I want automated checks so that regressions and guideline violations are caught before merge.

- **AC-FND-8.1** CI SHALL run ruff, pytest (on PostgreSQL), `flask db upgrade`, ESLint, `tsc`, Vitest, `next build`, `scripts/check_guidelines.py` and `scripts/check_traceability.py`.
- **AC-FND-8.2** The API SHALL be deployed on a public Vercel URL where `GET /api/health`, register and login succeed. _(verified manually after deploy)_
- **AC-FND-8.3** The web app SHALL be deployed on a public Vercel URL connected to that API. _(verified manually after deploy)_

### REQ-E2E-1 · Kanban journey

**Story:** As a product owner, I want the complete journey automated so that deployment regressions are caught.

- **AC-E2E-1.1** WHEN the Playwright suite runs against `PLAYWRIGHT_BASE_URL`, THEN one journey SHALL cover, in order: register, login, create a board, add columns, create and drag cards, add and edit a comment, search for a card, and view the notification bell.
- **AC-E2E-1.2** WHEN a card is dragged to another column and the page is reloaded, THEN it SHALL still be in the new column.
- **AC-E2E-1.3** The suite SHALL contain no `waitForTimeout` and SHALL create uniquely named data per run.

### REQ-NFR-1 · Security

- **AC-NFR-1.1** Passwords SHALL be stored only as scrypt hashes and SHALL never appear in a response or log.
- **AC-NFR-1.2** Every board, column, card and comment operation SHALL be authorized in the service layer against board membership and role.
- **AC-NFR-1.3** JWTs SHALL expire (default 60 minutes) and every protected route SHALL require a valid token.

### REQ-NFR-2 · Reliability

- **AC-NFR-2.1** Card and column positions SHALL persist and survive a page reload.
- **AC-NFR-2.2** WHEN an optimistic move fails, THEN the UI SHALL restore the original position.
- **AC-NFR-2.3** Deleted content SHALL be recoverable (soft delete) and never silently cascade-destroyed.

### REQ-NFR-3 · Responsive and accessible UI

- **AC-NFR-3.1** At a 375 px viewport no page SHALL scroll horizontally, and the Kanban board SHALL scroll inside its own container.
- **AC-NFR-3.2** Every input SHALL have a visible label, and every drag action SHALL have a keyboard or touch alternative.

### REQ-NFR-4 · Performance

- **AC-NFR-4.1** `GET /api/boards/<id>` SHALL use a fixed number of queries regardless of the number of cards.
- **AC-NFR-4.2** Every list endpoint SHALL be bounded (pagination or a maximum limit).

### REQ-NFR-5 · Maintainability and traceability

- **AC-NFR-5.1** Every requirement SHALL have an acceptance criterion, a design mapping, a task, and a test or code reference, enforced by `scripts/check_traceability.py`.
- **AC-NFR-5.2** Code SHALL follow `guidelines/`, enforced where possible by `scripts/check_guidelines.py`.
