# Columns and Cards: Design

## Routes and pages

| REQ              | Interface                                      | Handler                                                                                  | Service                                                           | Schema                              | Authorization                             |
| ---------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------- | ----------------------------------------- |
| REQ-COL-1        | `POST /api/boards/<id>/columns`                | `columns/routes.py::create_column`                                                       | `columns/service.py::create_column`                               | `ColumnCreateSchema`                | `require_member`                          |
| REQ-COL-2        | `PATCH /api/columns/<id>`                      | `columns/routes.py::update_column`                                                       | `service.update_column`                                           | `ColumnUpdateSchema`                | member of the column's board              |
| REQ-COL-3        | `DELETE /api/columns/<id>`                     | `columns/routes.py::delete_column`                                                       | `service.delete_column`                                           | n/a                                 | `require_admin`                           |
| REQ-COL-4        | `PATCH /api/boards/<id>/columns/reorder`       | `columns/routes.py::reorder_columns`                                                     | `service.reorder_columns`                                         | `ColumnReorderSchema`               | `require_member`                          |
| REQ-CARD-1       | `POST /api/columns/<id>/cards`                 | `cards/routes.py::create_card`                                                           | `cards/service.py::create_card`                                   | `CardCreateSchema`                  | member                                    |
| REQ-CARD-2       | `PATCH /api/cards/<id>`                        | `cards/routes.py::update_card`                                                           | `service.update_card`                                             | `CardUpdateSchema`                  | member                                    |
| REQ-CARD-3       | `DELETE /api/cards/<id>`                       | `cards/routes.py::delete_card`                                                           | `service.delete_card`                                             | n/a                                 | creator or admin                          |
| REQ-CARD-4, REQ-CARD-5, REQ-CARD-6 | `PATCH /api/cards/<id>/position`               | `cards/routes.py::move_card`                                                             | `service.move_card`                                               | `CardPositionSchema`                | member                                    |
| REQ-CARD-7       | `GET /api/cards?assignee=me`; page `/my-tasks` | `cards/routes.py::list_cards`; `app/my-tasks/page.tsx`                                   | `service.list_cards`; `lib/tasks.ts::groupByBoard`                | `CardQuerySchema`, `TaskCardSchema` | membership join                           |
| REQ-CARD-8       | `GET /api/cards?q=&board_id=`                  | `cards/routes.py::list_cards`                                                            | `service.list_cards`                                              | `CardQuerySchema`                   | `require_member` when `board_id` is given |
| REQ-CARD-8       | search box                                     | `components/board/CardSearch.tsx`                                                        | `hooks/useDebouncedValue.ts`                                      | n/a                                 | n/a                                       |
| REQ-CARD-9       | board UI                                       | `components/board/{BoardView,KanbanColumn,KanbanCard,CardDetailModal,CardFormModal}.tsx` | `hooks/useDragAndDrop.ts`, `lib/boardState.ts`, `lib/ordering.ts` | n/a                                 | n/a                                       |

## Models

`Column` and `Card` as in 00-foundation. Both have `order = db.Column(db.Float, nullable=False)`; reads use `ORDER BY order, created_at, id`. `cards` has a composite index on `(column_id, order)`.

## Ordering

Server and client share the rules in `docs/contracts/ordering.md`: append `+1024`, prepend `first/2`, insert at the midpoint. `needs_rebalance()` in `columns/service.py` checks adjacent gaps against `MIN_GAP = 1e-6`.

## Drag and drop sequence

1. `dragstart` records the card id.
2. `drop` on a column reads each card's bounding rectangle and counts cards above the pointer (`dropIndexFromPointer`) to get the target index.
3. `orderForIndex` turns the index into a float from the neighbours (ignoring the dragged card).
4. `applyMove` updates state at once; the original card is kept for rollback.
5. `PATCH /position` runs. On success the server's card replaces the local one and `rebalanced` triggers `router.refresh()`. On failure `placeCard(original)` restores it and `useErrorHandler` toasts.

## Notes

- `PATCH /api/cards/<id>` deliberately does not accept `order` or `column_id`; moves go only through `/position` so `CardPositionSchema` is the single gate.
- Cards can only move within their board (`INVALID_MOVE`).
- Listing endpoints exclude deleted columns, cards and boards, and join `board_members` so a user never sees cards of boards they left.
