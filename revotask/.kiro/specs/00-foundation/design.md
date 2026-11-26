# Foundation: Design

## Architecture

A modular-monolith Flask API (`backend/app/blueprints/<feature>/{routes,service,schema}.py`) and a Next.js App Router frontend (`frontend/src`). The browser calls the API directly with a bearer token; Server Components call it with the token read from a cookie.

```
Browser ──(Bearer JWT)──▶ Flask API ──▶ PostgreSQL
   ▲                          ▲
   └── Next.js (Vercel) ──────┘   Server Components use API_BASE_URL and the session cookie
```

Request path in the API: `route` (auth + validate) → `service` (authorization + business rules + transaction) → `models`. Errors are raised as typed `ApiError`s and rendered by one central handler.

## Interface mapping

| REQ       | Interface          | Implementation                                                                                |
| --------- | ------------------ | --------------------------------------------------------------------------------------------- |
| REQ-FND-1 | `GET /api/health`  | `blueprints/health/{routes,service}.py`                                                       |
| REQ-FND-2 | every route        | `common/errors.py` (handlers), `common/responses.py`, `common/auth.py` (JWT loaders)          |
| REQ-FND-3 | process start      | `app/config.py`, `app/__init__.py` (CORS), `backend/.env.example`, `frontend/.env.example`    |
| REQ-FND-4 | all client code    | `frontend/src/lib/apiClient.ts`, `lib/errors.ts`, `lib/api.ts`                                |
| REQ-FND-5 | all failure paths  | `hooks/useErrorHandler.ts`, `lib/toast.ts`                                                    |
| REQ-FND-6 | all pages          | `components/shared/{BaseButton,BaseBadge,BaseModal,BaseInput,NameFormModal,ConfirmModal}.tsx` |
| REQ-FND-7 | `flask db upgrade` | `backend/migrations/versions/0001_initial_schema.py`, `tests/test_migrations.py`              |
| REQ-FND-8 | CI and deploy      | `.github/workflows/ci.yml`, `backend/wsgi.py`, `backend/.vercelignore`, `docs/deployment.md`, `docs/adr/0004-backend-on-vercel.md`                      |
| REQ-E2E-1 | live app           | `frontend/e2e/kanban.spec.ts`, `playwright.config.ts`                                         |
| REQ-NFR-1 | all routes         | `blueprints/*/service.py` (`require_member`, `require_admin`), `auth/service.py`              |
| REQ-NFR-2 | board and drag UI  | `hooks/useDragAndDrop.ts`, `lib/boardState.ts`, soft delete in services                       |
| REQ-NFR-3 | all pages          | Tailwind mobile-first layout, `e2e/responsive.spec.ts`                                        |
| REQ-NFR-4 | board detail       | `boards/service.get_board_detail` (3 queries), `tests/test_boards.py`                         |
| REQ-NFR-5 | repository         | `scripts/check_traceability.py`, `scripts/check_guidelines.py`                                |

## Data model

Eight tables, all with a UUID primary key (`db.Uuid`) and UTC timestamps (DB-01, DB-02). Content tables are soft-deleted (DB-03).

| Table           | Columns (besides `id`, `created_at`, `updated_at`)                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `users`         | `name`, `email` (unique, lower-case), `password_hash`                                                                |
| `boards`        | `name`, `owner_id` → users, `deleted_at`                                                                             |
| `board_members` | `board_id`, `user_id`, `role` (`admin`/`member`); unique `(board_id, user_id)`                                       |
| `columns`       | `board_id`, `name`, `order` (Float), `is_done`, `deleted_at`                                                         |
| `cards`         | `column_id`, `title`, `description`, `order` (Float), `assignee_id`, `created_by`, `column_entered_at`, `deleted_at` |
| `comments`      | `card_id`, `user_id`, `content`, `deleted_at`                                                                        |
| `notifications` | `user_id`, `type`, `message`, `card_id`, `board_id`, `read_at`                                                       |

The `Card` model (`backend/app/models/card.py`):

```python
class Card(db.Model):
    __tablename__ = "cards"
    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    column_id = db.Column(db.Uuid, db.ForeignKey("columns.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    order = db.Column(db.Float, nullable=False)  # FLOAT ordering strategy (DB-04)
    assignee_id = db.Column(db.Uuid, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by = db.Column(db.Uuid, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    column_entered_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)
    deleted_at = db.Column(db.DateTime(timezone=True), nullable=True)
```

## Decisions

- **Envelope.** `{"data": ...}` or `{"error": "<string>", "code": ..., "details": ...}` (`docs/contracts/error-contract.md`). The scaffold's object-shaped `error` was replaced to match the assignment (CHANGELOG R01).
- **Configuration.** One `build_config()`; no literal secrets; production fails fast (CHANGELOG R02).
- **Session.** JWT kept in `AuthContext` and mirrored in a `SameSite=Lax` cookie so Server Components can fetch. Trade-off recorded in `docs/adr/0003-session-storage.md`.
- **Server vs client.** Pages are Server Components that fetch; `BoardView`, forms, hooks and modals are client leaves (FE-04).
- **Completion.** "Completed this week" means a live card whose `column_entered_at` is in the current ISO week and whose column has `is_done = true`. No separate status field is stored.
- **Migrations.** `0001_initial_schema` was reviewed by hand; two defects in the autogenerated output were fixed (CHANGELOG R08).
