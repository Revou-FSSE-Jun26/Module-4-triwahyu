# Foundation: Tasks

Legend: `[x]` done and verified locally, `[ ]` pending (needs your accounts or live URLs).

## Specification and guidelines

- [x] **T-FND-1** Write the project brief and requirements for all slices. _(REQ-NFR-5)_ → `.kiro/specs/*/requirements.md`, `specs/requirements.md`
- [x] **T-FND-2** Author `guidelines/{backend,database,frontend}.md` before generating code. _(REQ-NFR-5)_ → `guidelines/`
- [x] **T-FND-3** Rewrite the four behavioural contracts. _(REQ-FND-2)_ → `docs/contracts/`

## Backend foundation

- [x] **T-FND-4** `GET /api/health` with a database ping. _(REQ-FND-1)_ → `backend/app/blueprints/health/`, `tests/test_health.py`
- [x] **T-FND-5** Typed errors, central handlers, response helpers, JWT 401 loaders. _(REQ-FND-2)_ → `backend/app/common/`, `tests/test_errors.py`
- [x] **T-FND-6** `config.py` with fail-fast secrets, URL normalization, CORS. _(REQ-FND-3)_ → `backend/app/config.py`, `tests/test_config.py`
- [x] **T-FND-7** Env templates for both projects. _(REQ-FND-3)_ → `backend/.env.example`, `frontend/.env.example`
- [x] **T-FND-8** Models and reviewed migration `0001`; verify upgrade, downgrade, re-upgrade and `db check` on PostgreSQL. _(REQ-FND-7)_ → `backend/app/models/`, `backend/migrations/`, `tests/test_migrations.py`

## Frontend foundation

- [x] **T-FND-9** `apiClient`, `ApiError`, typed `createApi`. _(REQ-FND-4)_ → `frontend/src/lib/{apiClient,errors,api}.ts`
- [x] **T-FND-10** `toast` wrapper and `useErrorHandler`. _(REQ-FND-5)_ → `frontend/src/lib/toast.ts`, `hooks/useErrorHandler.ts`
- [x] **T-FND-11** `BaseButton`, `BaseBadge`, `BaseModal`, `BaseInput`, `NameFormModal`, `ConfirmModal`. _(REQ-FND-6)_ → `frontend/src/components/shared/`
- [x] **T-FND-12** Tailwind design tokens from the design system. _(REQ-NFR-3)_ → `frontend/tailwind.config.ts`, `docs/design-system/README.md`

## Quality, delivery and documentation

- [x] **T-FND-13** Playwright journey (8 steps, drag, reload persistence) and mobile layout spec. _(REQ-E2E-1, REQ-NFR-3)_ → `frontend/e2e/`
- [x] **T-FND-14** `check_guidelines.py`, `check_traceability.py`, `build_specs.py`, `export_openapi.py`. _(REQ-NFR-5)_ → `scripts/`
- [x] **T-FND-15** CI pipeline. _(REQ-FND-8)_ → `.github/workflows/ci.yml`
- [x] **T-FND-16** Deployment configuration and guide. _(REQ-FND-8)_ → `backend/wsgi.py`, `backend/.vercelignore`, `backend/app/config.py`, `docs/deployment.md`
- [x] **T-FND-17** README with workflow summary, run and test instructions. _(REQ-FND-8)_ → `README.md`
- [x] **T-FND-18** Violation report and before/after comparison. _(REQ-NFR-5)_ → `guidelines/violation-report.md`, `guidelines/before-after-comparison.md`
- [x] **T-FND-22** Security baseline: scrypt hashing, expiring JWTs, authorization in services. _(REQ-NFR-1)_ → `backend/app/blueprints/auth/service.py`, `boards/service.py::require_member`, `common/auth.py`
- [x] **T-FND-23** Reliability: soft delete with one-timestamp cascade and optimistic updates with rollback. _(REQ-NFR-2)_ → `backend/app/blueprints/columns/service.py::soft_delete_columns`, `frontend/src/lib/boardState.ts`
- [x] **T-FND-24** Performance: fixed-query board detail and bounded list endpoints. _(REQ-NFR-4)_ → `backend/app/blueprints/boards/service.py::get_board_detail`, `notifications/schema.py`, `tests/test_boards.py`
- [ ] **T-FND-19** Deploy the API to Vercel and verify health, register and login from Postman. _(REQ-FND-8)_ → owner action, see `docs/deployment.md`
- [ ] **T-FND-20** Deploy the web app to Vercel and run Playwright against the live URL. _(REQ-FND-8, REQ-E2E-1)_ → owner action
- [ ] **T-FND-21** Capture live screenshots and the production Playwright report. _(REQ-FND-8)_ → owner action, `docs/screenshots/`, `frontend/e2e-report/production/`
