# Columns and Cards: Tasks

## Backend

- [x] **T-COL-1** `POST /api/boards/<id>/columns`. _(REQ-COL-1)_ → `backend/app/blueprints/columns/{routes,service,schema}.py`, `tests/test_columns.py`
- [x] **T-COL-2** `PATCH /api/columns/<id>`. _(REQ-COL-2)_ → same files
- [x] **T-COL-3** `DELETE /api/columns/<id>` with soft-delete cascade. _(REQ-COL-3)_ → same files
- [x] **T-COL-4** `PATCH /api/boards/<id>/columns/reorder` with FLOAT orders and rebalance. _(REQ-COL-4)_ → same files
- [x] **T-CARD-1** `POST /api/columns/<id>/cards`. _(REQ-CARD-1)_ → `backend/app/blueprints/cards/{routes,service,schema}.py`, `tests/test_cards.py`
- [x] **T-CARD-2** `PATCH /api/cards/<id>` with assignee validation and notification. _(REQ-CARD-2)_ → same files
- [x] **T-CARD-3** `DELETE /api/cards/<id>`. _(REQ-CARD-3)_ → same files
- [x] **T-CARD-4** `PATCH /api/cards/<id>/position` with `CardPositionSchema` and rebalance. _(REQ-CARD-4, REQ-CARD-5, REQ-CARD-6)_ → same files
- [x] **T-CARD-5** `GET /api/cards` for `assignee=me` and search. _(REQ-CARD-7, REQ-CARD-8)_ → same files

## Frontend

- [x] **T-CARD-6** Ordering and board-state helpers with unit tests. _(REQ-CARD-9)_ → `frontend/src/lib/{ordering,boardState}.ts`, `*.test.ts`
- [x] **T-CARD-7** `useDragAndDrop` with optimistic update and rollback. _(REQ-CARD-9)_ → `frontend/src/hooks/useDragAndDrop.ts`, `useDragAndDrop.test.tsx`
- [x] **T-CARD-8** Kanban layout: `BoardView`, `KanbanColumn`, `KanbanCard`, add and edit column, move column. _(REQ-COL-1, REQ-COL-2, REQ-COL-3, REQ-COL-4)_ → `frontend/src/components/board/`
- [x] **T-CARD-9** Add-card dialog and card details editing. _(REQ-CARD-1, REQ-CARD-2, REQ-CARD-3)_ → `components/board/{CardFormModal,CardDetailModal}.tsx`
- [x] **T-CARD-10** My Tasks page. _(REQ-CARD-7)_ → `frontend/src/app/my-tasks/page.tsx`, `lib/tasks.ts`, `tasks.test.ts`
- [x] **T-CARD-11** Card search with 300 ms debounce. _(REQ-CARD-8)_ → `components/board/CardSearch.tsx`, `hooks/useDebouncedValue.ts`
- [x] **T-CARD-12** "Move to column" alternative for keyboard and touch. _(REQ-CARD-9)_ → `components/board/CardDetailModal.tsx`
- [x] **T-CARD-13** Playwright: drag a card and verify it persists after reload. _(REQ-CARD-4, REQ-CARD-9, REQ-E2E-1)_ → `frontend/e2e/kanban.spec.ts`
