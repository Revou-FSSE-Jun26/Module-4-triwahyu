# Analytics: Design

## Routes and pages

| REQ                | Interface                        | Handler                                                             | Service                                 | Schema            | Authorization               |
| ------------------ | -------------------------------- | ------------------------------------------------------------------- | --------------------------------------- | ----------------- | --------------------------- |
| REQ-ANL-1, REQ-ANL-2, REQ-ANL-3, REQ-ANL-4 | `GET /api/boards/<id>/analytics` | `analytics/routes.py::board_analytics`                              | `analytics/service.py::board_analytics` | `AnalyticsSchema` | `require_admin`             |
| REQ-ANL-5          | board header action              | `components/board/AnalyticsModal.tsx` (opened from `BoardView.tsx`) | `lib/api.ts::boards.analytics`          | n/a               | admin-only button (UI hint) |

## Queries (all SQLAlchemy joins in `analytics/service.py`)

- **Cards per column:** `Column LEFT OUTER JOIN Card ON card.column_id = column.id AND card.deleted_at IS NULL`, `GROUP BY` column, ordered by `order`. The outer join keeps empty columns.
- **Completed this week:** `Card JOIN Column` filtered by `Column.is_done` and `Card.column_entered_at >= week_start`.
- **Member activity:** `User JOIN BoardMember` for the roster, plus three grouped queries (`Card JOIN Column` by assignee, the same restricted to done columns this week, `Comment JOIN Card JOIN Column` by author) merged by user id. Separate queries avoid the row multiplication that chaining several outer joins would cause.

## Behaviour notes

- `week_start(now)` is Monday 00:00 UTC of the ISO week; the service accepts an injectable `now` so the boundary is testable.
- Completion is derived from `is_done` plus `column_entered_at`, so toggling a column's `is_done` flag corrects the numbers retroactively and no status column needs maintaining.
- Total cost is five queries regardless of board size.
