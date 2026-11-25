# RevoTask Guidelines

Steering guidelines that Kiro and Kiro CLI follow when generating code, and that reviewers use to check it.
They were written **before** the code they govern and are enforced mechanically where possible.

| File | Rules | Owns |
|---|---|---|
| [`backend.md`](backend.md) | BE-01 … BE-12 | HTTP layer, validation, envelope, authN/authZ, config and secrets, pytest |
| [`database.md`](database.md) | DB-01 … DB-10 | Models, keys, timestamps, soft delete, FLOAT ordering, migrations, connection |
| [`frontend.md`](frontend.md) | FE-01 … FE-14 | Types, API client, shared components, auth session, forms, a11y, responsive, Playwright |

Every rule has the same three parts: **Rule**, **Rationale**, **Example** (a concrete RevoTask case).
`scripts/check_guidelines.py` verifies that structure for every rule.

## No overlap: one owner per topic

| Topic | Owner | Other files only reference it |
|---|---|---|
| Secrets and environment variables | BE-10 | FE-11 covers only what may reach the browser |
| Input validation | BE-04 (server) | FE-08 states client validation is UX only |
| Authorization | BE-08 | FE-05 covers route protection, not permissions |
| Ordering algorithm | DB-04 | `docs/contracts/ordering.md` has the full contract |
| Deletion behaviour | DB-03 | `docs/contracts/deletion-policy.md` |
| Error envelope | BE-05 | FE-07 covers how the UI presents errors |
| Test conventions | BE-12 (pytest), FE-14 (Playwright) | `.kiro/steering/testing.md` indexes both |

## How the guidelines are applied

1. `.kiro/steering/{backend,frontend,database}.md` include these files, so Kiro loads them when a matching file is open.
2. `python scripts/check_guidelines.py` runs the mechanical checks (also in CI).
3. Human review covers what a script cannot, and each finding is logged in [`violation-report.md`](violation-report.md).
4. [`before-after-comparison.md`](before-after-comparison.md) records the measured effect.
