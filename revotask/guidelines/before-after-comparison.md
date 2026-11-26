# Before and After: Measured Effect of the Guidelines

## What was compared
| | Before | After |
|---|---|---|
| **Artifact** | The AI-generated starter scaffold, produced under five-line steering files with no checkable rules | The same project after the guidelines in this folder were written first and the code was generated and reviewed against them |
| **Snapshot** | Saved untouched before any edit (147 files) | Current repository |
| **Instrument** | `python scripts/check_guidelines.py --root <baseline>` | `python scripts/check_guidelines.py` |

The checker runs 28 mechanical checks, each tied to a rule ID in `backend.md`, `database.md` or `frontend.md`. A check ends as PASS, FAIL, or N/A when the code it inspects does not exist yet. N/A is not counted as a violation.

## Result

| Measure | Before | After |
|---|---:|---:|
| Checks passed | 11 | **28** |
| Checks failed | 11 | **0** |
| Checks not applicable (code did not exist) | 6 | 0 |
| Individual findings | 47 | **0** |
| Backend tests (pytest) | 1 (health only) | **114** (113 pass and 1 PostgreSQL-only skip on SQLite; all 114 pass on PostgreSQL 18, also with the Vercel serverless settings) |
| Frontend unit tests (Vitest) | 0 | **125** |
| Playwright tests, all asserting | 4 (2 with no assertion) | **7** (4 auth, 1 eight-step journey, 2 mobile layout) |
| Requirements with acceptance criteria | 0 | **61** (185 criteria) |
| Traceability gate | exits 0 with zero requirements | exits 0 only when every link exists |

### Per-rule detail
| Rule | Check | Before | After |
|---|---|---|---|
| BE-01 | blueprint trio with real content | FAIL (27 placeholder files) | PASS |
| BE-05 | one envelope, no ad-hoc `jsonify` | FAIL (2) | PASS |
| BE-05b | error contract defines `error` as a string | FAIL (1) | PASS |
| BE-10 | no literal secrets or database URLs | FAIL (2) | PASS |
| FE-03 | no raw `<button>` outside shared components | FAIL (1) | PASS |
| FE-03b | `BaseButton` defaults to `type="button"` | FAIL (1) | PASS |
| FE-03d | callers do not override `BaseButton` utilities | N/A (no callers) | PASS |
| FE-04 | pages are implemented | FAIL (6) | PASS |
| FE-05 | `AuthProvider` renders its context; middleware exists | FAIL (2) | PASS |
| FE-07 | error handler maps status codes | FAIL (1) | PASS |
| FE-09 | modal has a unique id and closes on Escape | FAIL (2) | PASS |
| FE-14b | every Playwright test asserts | FAIL (2) | PASS |
| DB-01 to DB-04 | UUID keys, timestamps, soft delete, Float `order` | N/A | PASS |

Reproduce it: `python scripts/check_guidelines.py` for the current state, and run the same script with `--root` pointing at a copy of the original scaffold.

## What this does and does not show
- **It shows** that the generated code now conforms to rules that were written down before the code, and that the checker is able to fail (it fails 11 of 28 on the scaffold, so a pass is meaningful).
- **It does not show** that Kiro produces better code without human review. The "after" was produced by iterating with the checker, the tests and manual review, which is the workflow being demonstrated. Treat the improvement as the effect of *guidelines plus enforcement*, not guidelines alone.
- Six scaffold checks were N/A because the scaffold had no models or guidelines to inspect. They are excluded from the pass and fail counts above.
- Several rules (BE-02, BE-06, BE-08, BE-09, FE-06, FE-08, FE-10, FE-12) cannot be checked by a script. They were enforced by review and by tests, and the violations found that way are in `violation-report.md`.

## Add a controlled run with Kiro CLI (recommended for your submission)
The comparison above uses the scaffold as the "before". For a direct A/B on a single task, run the same prompt twice and score both outputs with the same checklist:

1. Pick one task, for example: *"Implement `POST /api/columns/<id>/cards` for the cards blueprint."*
2. **Without guidelines:** start a fresh Kiro CLI session in a clean copy of the repo with `.kiro/steering/` removed.
3. **With guidelines:** run the identical prompt in the repo with steering in place.
4. Score each output with this checklist (one point each): routes call exactly one service function (BE-02); no `db` in `routes.py` (BE-03); input validated by a schema with unknown fields rejected (BE-04); uses `created()` not `jsonify` (BE-05); typed errors (BE-06); actor taken from the token (BE-07); membership checked in the service (BE-08); a test each for 201, 400, 401, 403 (BE-12).
5. Record both scores and the diff in this file, with the date and Kiro CLI version.

| Task | Without guidelines | With guidelines | Date |
|---|---:|---:|---|
| _your run_ | _/8_ | _/8_ | |
