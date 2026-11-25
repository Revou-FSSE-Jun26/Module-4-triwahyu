# Deletion Policy

Owner rule: `guidelines/database.md` DB-03.

| Entity             | Delete behaviour              | Cascade                                                                           |
| ------------------ | ----------------------------- | --------------------------------------------------------------------------------- |
| Board              | Soft (`deleted_at`)           | Soft-deletes its columns, their cards, and their comments with the same timestamp |
| Column             | Soft                          | Soft-deletes its cards and their comments                                         |
| Card               | Soft                          | Soft-deletes its comments                                                         |
| Comment            | Soft                          | none                                                                              |
| Board member       | Hard (row removed)            | Unassigns that user's cards on the board                                          |
| User, Notification | Not deletable through the API | none                                                                              |

- All reads exclude rows where `deleted_at` is set. A soft-deleted row returns `404`.
- A parent delete and its cascade run in one transaction and share one timestamp, so a future restore can target exactly that set.
- No restore endpoint exists in this release.
- Foreign keys: containment is `ON DELETE CASCADE`, optional references are `SET NULL`, authorship is `RESTRICT` (DB-05). The API never issues a SQL `DELETE` on content tables.
