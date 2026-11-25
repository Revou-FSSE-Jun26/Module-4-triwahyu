# Boards and Members: Tasks

## Backend

- [x] **T-BOARD-1** Models `Board` and `BoardMember`. _(REQ-BOARD-1)_ → `backend/app/models/board.py`
- [x] **T-BOARD-2** `POST /api/boards` and `GET /api/boards`. _(REQ-BOARD-1, REQ-BOARD-2)_ → `backend/app/blueprints/boards/{routes,service,schema}.py`, `tests/test_boards.py`
- [x] **T-BOARD-3** `GET /api/boards/<id>` with nested columns and cards in a fixed query count. _(REQ-BOARD-3)_ → same files, `test_board_detail_uses_a_fixed_number_of_queries`
- [x] **T-BOARD-4** `PATCH /api/boards/<id>` (admin). _(REQ-BOARD-4)_ → same files
- [x] **T-BOARD-5** `DELETE /api/boards/<id>` with soft-delete cascade. _(REQ-BOARD-5)_ → same files, `columns/service.py::soft_delete_columns`
- [x] **T-BOARD-6** Member endpoints `GET /api/boards/<id>/members`, `POST /api/boards/<id>/members`, `PATCH /api/boards/<id>/members/<user_id>` and `DELETE /api/boards/<id>/members/<user_id>`, with last-admin protection and unassign-on-remove. _(REQ-BOARD-6)_ → `boards/{routes,service,schema}.py`

## Frontend

- [x] **T-BOARD-7** Dashboard page and "New board" modal. _(REQ-BOARD-7)_ → `frontend/src/app/page.tsx`, `components/boards/CreateBoardButton.tsx`, `components/shared/NameFormModal.tsx`
- [x] **T-BOARD-8** Board detail page with 403/404 handling. _(REQ-BOARD-8)_ → `frontend/src/app/boards/[id]/page.tsx`, `app/not-found.tsx`
- [x] **T-BOARD-9** Board header actions: rename, delete, analytics (admin only). _(REQ-BOARD-8)_ → `components/board/BoardView.tsx`
- [x] **T-BOARD-10** Members dialog. _(REQ-BOARD-6, REQ-BOARD-8)_ → `components/board/MembersModal.tsx`
