---
inclusion: fileMatch
fileMatchPattern: "**/tests/**, **/*.test.*, **/*.spec.*, frontend/e2e/**"
---

# Testing steering

The rules are in `guidelines/`; this file is only an index so each rule has one owner.

- **pytest:** BE-12 in `guidelines/backend.md`. Cover 201, 400, 401 and 403/404 per endpoint, name the `REQ-` id in each test, and never point `TEST_DATABASE_URL` at a dev database (the fixtures refuse names without `test`).
- **Vitest and React Testing Library:** test behaviour through roles and labels, not implementation details. Mock `next/navigation` and `next/link` at the module boundary.
- **Playwright:** FE-14 in `guidelines/frontend.md`. No `waitForTimeout`, every test asserts, unique data per run, run against a production build.
- **Traceability:** every requirement id in `.kiro/specs/*/requirements.md` must appear in at least one test or code file (`python scripts/check_traceability.py`).
