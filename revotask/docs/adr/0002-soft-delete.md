# ADR 0002: Soft-delete user content with a single cascade timestamp

- Status: Accepted
- Related: `docs/contracts/deletion-policy.md`, guideline DB-03, `REQ-NFR-2`

## Context
The assignment requires `deleted_at` on `Card`. Boards, columns and comments hold user work too, and the scaffold's policy said not to cascade-delete user-owned content silently.

## Decision
`Board`, `Column`, `Card` and `Comment` carry a nullable `deleted_at`. Services set it instead of issuing `DELETE`. Deleting a parent soft-deletes its descendants in the same transaction with the same timestamp, updating children before parents because each statement selects through a still-live parent. Every read filters `deleted_at IS NULL`.

## Consequences
- Content is recoverable and a future restore can target exactly one deletion by its timestamp.
- Every query must filter on `deleted_at`; `check_guidelines.py` DB-03 ensures the column exists, and tests cover the read paths.
- Rows accumulate. A retention job is out of scope for this release.
- Foreign keys still declare `ON DELETE` behaviour (DB-05) so a manual hard delete cannot orphan data.

## Alternatives considered
- **Hard delete with `ON DELETE CASCADE`:** simplest, but destroys comments and history with no way back.
- **Soft delete only on `Card`:** meets the letter of the assignment but leaves deleted boards' cards visible in My Tasks and search.
