# Foundation: Refinement Changelog

Each entry records a real defect found in AI-generated output (the starter scaffold, or a first draft produced during this work), the targeted instruction used to correct it, the verified result, and the evidence. Round numbers are global across all slices.

## R01 · Error envelope: object → string

- **Artifact reviewed:** `docs/contracts/error-contract.md` and `frontend/src/lib/apiClient.ts` (scaffold)
- **Before:** The contract defined failures as `{"error": {"code": "...", "message": "..."}}`, while `backend.md` steering and the assignment both say `{ "error": "..." }`. The scaffold's own documents contradicted each other.
- **Refinement prompt:** "The assignment requires `{ "error": "..." }`. Make `error` a string everywhere. Keep `code` and `details` as sibling keys. Update the contract, the Flask handlers, the frontend `ApiError`, and add tests for each status."
- **After:** `error` is a string with optional `code` and `details`. `ApiError` carries `statusCode`, `message`, `code`, `details`.
- **Evidence:** `backend/tests/test_errors.py` (6 tests), `backend/tests/test_auth.py` (field-level `details`), `frontend/src/lib/apiClient.test.ts` (10 tests).
- **Guideline:** BE-05

## R02 · Hardcoded secrets and ignored CORS setting

- **Artifact reviewed:** `backend/app/__init__.py` (scaffold)
- **Before:** `create_app` set `SECRET_KEY="dev-only-change-me"`, `JWT_SECRET_KEY="dev-only-change-me"` and `SQLALCHEMY_DATABASE_URI="sqlite:///revotask.db"` as literals. It read `CORS_ORIGINS` from config, but nothing ever loaded that value from the environment, so production CORS would silently stay on `http://localhost:3000`.
- **Refinement prompt:** "Move all configuration into `config.py`, the only module that reads `os.environ`. No literal secrets. Fail fast in production on missing or short secrets and on a missing `DATABASE_URL`. Normalize `postgres://` URLs for psycopg 3. Read `CORS_ORIGINS` and the token lifetime from the environment."
- **After:** `build_config()` with fail-fast validation, URL normalization, `pool_pre_ping`, CORS and JWT lifetime from env.
- **Evidence:** `backend/tests/test_config.py` (14 tests incl. a preflight test); `check_guidelines.py` rule BE-10 reports 0 literals; a production-mode import of `wsgi.py` against PostgreSQL served health, register and login.
- **Guideline:** BE-10, DB-10

## R03 · Empty specs and a traceability check that passed vacuously

- **Artifact reviewed:** all seven `.kiro/specs/*/{requirements,design,tasks}.md` and `scripts/check_traceability.py` (scaffold)
- **Before:** Every `requirements.md` contained only headings (0 requirements, 0 acceptance criteria). Every `tasks.md` was the same seven generic checkboxes. `check_traceability.py` found no `REQ-` IDs, printed "No REQ-ID entries found yet", and exited 0, so the gate passed with nothing to check.
- **Refinement prompt:** "Write requirements as REQ-IDs with EARS acceptance criteria. Every AC maps to a route or page in design.md, every route and page has a task, every task names its files. Rewrite the traceability script so zero requirements, a requirement without an AC, an unmapped requirement, or an unreferenced requirement is a failure."
- **After:** Requirements with acceptance criteria in all seven slices, a design table per slice, and file-level tasks. The script now fails on any gap and is run in CI.
- **Evidence:** `python scripts/check_traceability.py` output (see `specs/traceability.md`); it exits 1 on the baseline scaffold.
- **Guideline:** process rules in `.kiro/steering/coding-standards.md`

## R04 · Vacuous end-to-end tests

- **Artifact reviewed:** `frontend/e2e/auth.spec.ts` (scaffold)
- **Before:** Two of the four tests had no assertion (`goto("/my-tasks")` followed by a comment), and the other two only asserted that some heading existed. All four passed with nothing implemented.
- **Refinement prompt:** "Every test must assert an outcome. Implement the four auth scenarios with a unique user per run, add the 8-step Kanban journey including drag-and-drop and persistence after reload, use web-first assertions and response waits, and forbid `waitForTimeout`."
- **After:** 4 auth tests, one 8-step journey, 2 mobile layout tests; unique data per run; no fixed waits.
- **Evidence:** Playwright: 7 passed against a production build. `check_guidelines.py` rule FE-14b (every test asserts) reports 2 violations on the baseline and 0 now; FE-14a (no `waitForTimeout`) passes on both and keeps the suite honest.
- **Guideline:** FE-14

## R05 · Error toasts ignored the status code

- **Artifact reviewed:** `frontend/src/hooks/useErrorHandler.ts` (scaffold)
- **Before:** Any `ApiError` was shown as `notify.error(error.message)`. The status code was never used, a 500 could surface server text, and a 401 did not end the session. The assignment says the hook "maps ApiError status codes to user-facing toast messages".
- **Refinement prompt:** "Map statusCode to fixed messages for network, 400, 401, 403, 404, 409, 429 and 5xx. Only 400/409 may show the server's authored message. Never show the message of an unknown error. Sign out on 401."
- **After:** `messageForStatus()` plus the hook; 401 triggers `logout`.
- **Evidence:** `frontend/src/hooks/useErrorHandler.test.tsx` (11 tests); `check_guidelines.py` rule FE-07 (hook references `statusCode`) fails on the baseline, passes now.
- **Guideline:** FE-07

## R06 · Modal accessibility and a scroll-lock bug found by a test

- **Artifact reviewed:** `frontend/src/components/shared/BaseModal.tsx` (scaffold, then my first revision)
- **Before:** The scaffold hardcoded `id="modal-title"` (duplicate ids when two dialogs mount), had no Escape handling, no focus management and no scroll lock. My first fix stored "previous overflow" per dialog, so with two stacked dialogs the page stayed locked after both closed. The test `locks page scroll while open and restores it after` failed.
- **Refinement prompt:** "Use `useId` for the title id, close on Escape, move focus in and return it on close. Share one scroll lock between stacked dialogs with a counter."
- **After:** Unique ids, Escape, focus return, and a reference-counted scroll lock.
- **Evidence:** `shared.test.tsx` 19 tests, including the failing-then-fixed scroll test.
- **Guideline:** FE-09

## R07 · BaseButton defaulted to submit and had low-contrast text

- **Artifact reviewed:** `frontend/src/components/shared/BaseButton.tsx` (scaffold)
- **Before:** The element had no default `type`, so a Cancel button inside a form would submit it. Variants used generic blue and red palettes with white text instead of the design-system tokens, the padding gave roughly a 36 px target (below the 44 px minimum), and there was no way to render a link, so My Tasks would have needed one-off anchors.
- **Refinement prompt:** "Default to `type="button"`. Keep a 44 px minimum target. Use the design-system tokens, with ink text on orange. Support `href`, sizes and a ghost variant so pages never need raw buttons."
- **After:** One component for every action; `check_guidelines.py` FE-03 finds no raw `<button>` outside `components/shared`.
- **Evidence:** `shared.test.tsx` ("does not submit the surrounding form unless type=submit"); FE-03 check.
- **Guideline:** FE-03, FE-10, FE-13

## R08 · Autogenerated migration reviewed and corrected

- **Artifact reviewed:** `backend/migrations/versions/0001_initial_schema.py` (autogenerated), `migrations/env.py`
- **Before:** Autogenerate named the composite unique constraint `uq_board_members_board_id` (the naming convention uses only the first column, which is misleading), emitted `NOT NULL` columns `is_done` and `role` without server defaults, and `env.py` called `db.get_engine()`, which Flask-SQLAlchemy 3.2 removes.
- **Refinement prompt:** "Read the generated revision. Name composite constraints explicitly. Add server defaults for NOT NULL columns with defaults. Replace the deprecated engine call. Verify upgrade, downgrade, re-upgrade and `db check` on PostgreSQL."
- **After:** Named constraint `uq_board_members_board_id_user_id`, server defaults, current engine API.
- **Evidence:** `backend/tests/test_migrations.py` passes on SQLite and PostgreSQL 18; `flask db check` reports no drift; deprecation warnings are errors in the test run.
- **Guideline:** DB-07, DB-08

## R09 · A health blueprint that broke the layout rules

- **Artifact reviewed:** `backend/app/blueprints/health/__init__.py` (my first draft)
- **Before:** The route, the database ping and error class all lived in `__init__.py`, which violates BE-01 (three files per blueprint) and BE-03 (database access only in services).
- **Refinement prompt:** "Split health into `routes.py`, `service.py` and `schema.py` like every other blueprint."
- **After:** Standard trio; the route is two lines.
- **Evidence:** `check_guidelines.py` BE-01 (all 9 blueprint folders have the trio) and BE-03 (no `db` import in any `routes.py`) pass.
- **Guideline:** BE-01, BE-02, BE-03

## R10 · Test infrastructure: dev server and worker count

- **Artifact reviewed:** `frontend/playwright.config.ts` and how the suite was run
- **Before:** Running the journey against `next dev` timed out on the first visit to `/` because the route compiled on demand (about 10 s). Running with the default worker count started many Chromium instances on a machine with about 1.9 GB free, and four tests failed with long gaps between requests.
- **Refinement prompt:** "Run E2E against a production build, the same artifact that is deployed. Cap workers at 2 so the suite is light on memory and on a live deployment."
- **After:** `workers: 2`; documented build-then-start procedure.
- **Evidence:** 7 passed in about 45 s against `next build` output; the same tests failed against the dev server.
- **Guideline:** FE-14

## R13 · Self-review: lint-silencing hacks and filler assertions

- **Artifact reviewed:** `backend/app/blueprints/{boards,columns}/service.py`, `backend/tests/test_{boards,columns}.py` (my first drafts)
- **Before:** To silence "unused import" warnings I had added `__all__ = [...]` lists to two services, and two tests ended with filler lines such as `assert make_column  # helper imported for symmetry`. The query-count test also defined a lambda inside a loop that captured `statements` (ruff B023). None of this tested or did anything; it only hid lint output.
- **Refinement prompt:** "Remove unused imports instead of re-exporting them. Delete assertions that check nothing. Replace the loop closure with a helper function."
- **After:** Imports pruned, filler removed, `count_queries()` helper.
- **Evidence:** `ruff check .` and `ruff format --check .` report no issues; the full backend suite passes on SQLite and PostgreSQL.
- **Guideline:** BE-12 (tests must test), process rules in `coding-standards.md`

## R14 · Tests wiped the development database
- **Artifact reviewed:** `backend/tests/conftest.py` (my first version)
- **Before:** The `app` fixture ran `db.drop_all()` against whatever `TEST_DATABASE_URL` named. I pointed it at the PostgreSQL database that the local E2E server was using, which removed every table. The next Playwright run failed with `POST /api/auth/register` returning 500 (`relation users does not exist`), found in the server log.
- **Refinement prompt:** "A test fixture that drops tables must refuse any database that is not clearly a test database. Use a separate database, restore the dev schema, and add a test for the guard."
- **After:** `resolve_test_database_uri()` raises `Refusing to run tests` unless the name contains `test`; tests use `revotask_test`.
- **Evidence:** `test_test_suite_refuses_a_non_test_database`; after a refused run the dev database still had 8 tables; 7 Playwright tests pass again after `flask db upgrade`.
- **Guideline:** BE-12

## R15 · Screenshots exposed layout defects that every test missed
- **Artifact reviewed:** Kanban board UI, captured at 1366px and 390px (`docs/screenshots/refinement/r15-before-*.png`)
- **Before:** Column titles broke mid-word ("In Progre/ss", "To/Do", "Do/ing") because four controls shared the title's row. Card titles were centered while their descriptions were left-aligned: I passed `justify-start` through `className`, but `BaseButton` already set `justify-center`, and Tailwind resolves conflicts by stylesheet order, not class order, so the override was silently ignored (the same cause as R07). "+ Add column" was clipped at the right edge. The card dialog scrolled as one block, so its title and Close button scrolled out of view. All seven Playwright tests were passing.
- **Refinement prompt:** "Look at the rendered pages, not only the test output. Give the title its own row. Make alignment a `BaseButton` prop instead of a class override. Pin the dialog header and scroll only its body. Add a checker rule so overriding BaseButton utilities fails the build."
- **After:** Two-row column header, `align` and `size="card"` props, a dialog with a fixed header and scrolling body, and rule FE-03d in `check_guidelines.py` (verified against a probe file containing the original mistakes).
- **Evidence:** `docs/screenshots/local/04-board-detail.png`, `m2-board.png`, `05-card-detail-modal-comments.png`; `BaseButton.test.tsx` and a modal-structure test in `shared.test.tsx`; 7 Playwright tests still pass, including the mobile overflow check.
- **Guideline:** FE-03, FE-10

## R16 · A new comment was labelled "edited"
- **Artifact reviewed:** all `updated_at` columns in `backend/app/models/*.py` and the Kanban journey test
- **Before:** `created_at` and `updated_at` each called `utcnow()` separately on insert, so a new row had two timestamps a few microseconds apart. The UI shows "edited" when they differ, so every fresh comment said "edited". The journey test asserted `getByText(/edited/)` only once, after the edit, so it could not tell a real edit from this bug and passed anyway.
- **Refinement prompt:** "On insert, default `updated_at` to the row's own `created_at`. Test that an unmodified row has equal timestamps and an edit advances `updated_at`. In the E2E test, assert the comment is not edited before the edit and is edited after."
- **After:** `same_as_created` insert default on all seven models; the journey asserts both states.
- **Evidence:** `backend/tests/test_timestamps.py`; `CommentList.test.tsx` ("does not mark a comment edited when its timestamps are equal"); the journey passes with the stricter assertion; migration drift check still clean on PostgreSQL.
- **Guideline:** DB-02

## R17 · Stale server served an old build
- **Artifact reviewed:** my local E2E procedure (not a product defect)
- **Before:** Twice I started `next start` in parallel with, or just before, a rebuild. The server then answered with HTML for the old build while `.next/` held new chunks, so the browser got `400` on `page-<hash>.js` and the app showed its error boundary ("ChunkLoadError"). Two E2E tests and the screenshot run failed with no application bug behind them.
- **Refinement prompt:** "Never trust a running server to match the last build. Verify it, and fail loudly when it does not."
- **After:** `frontend/scripts/verify-build.mjs` compares the build id in the served HTML with `.next/BUILD_ID` and exits 1 on a mismatch; the final runs call it first.
- **Evidence:** the script passes on a fresh server and fails when the id differs (exercised both ways).
- **Guideline:** FE-14

## R18 · The OpenAPI exporter was non-deterministic
- **Artifact reviewed:** `scripts/export_openapi.py` (my first version) and its CI drift check
- **Before:** Path parameters were listed in the order of `rule.arguments`, a Python `set`. Its order depends on hash randomization, so the same code produced two different `contracts/openapi.json` files depending on `PYTHONHASHSEED` (two distinct hashes over six seeds). The final gate run reported the committed file as "out of date" after unrelated edits. In CI, `export_openapi.py --check` would have failed at random.
- **Refinement prompt:** "A generator that is checked for drift must be deterministic. Order parameters by their position in the path, and prove the output is identical across many hash seeds. Check the other generators the same way."
- **After:** Parameters follow path order. 12 seeds give 1 hash for `openapi.json`; 8 seeds give 1 hash for every file from `build_specs.py` and `build_postman.py`.
- **Evidence:** the seed sweeps above; `export_openapi.py --check` passes.
- **Guideline:** process rules in `.kiro/steering/coding-standards.md`
