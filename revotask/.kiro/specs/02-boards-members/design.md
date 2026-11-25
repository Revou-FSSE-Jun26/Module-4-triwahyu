# Boards and Members: Design

## Routes and pages

| REQ         | Interface                                                                              | Handler                                                                           | Service                                                                  | Schema                                                  | Authorization                                     |
| ----------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------- |
| REQ-BOARD-1 | `POST /api/boards`                                                                     | `boards/routes.py::create_board`                                                  | `boards/service.py::create_board`                                        | `BoardCreateSchema`                                     | `@jwt_required`                                   |
| REQ-BOARD-2 | `GET /api/boards`                                                                      | `boards/routes.py::list_boards`                                                   | `service.list_boards`                                                    | `BoardSummarySchema`                                    | `@jwt_required`, membership join                  |
| REQ-BOARD-3 | `GET /api/boards/<id>`                                                                 | `boards/routes.py::get_board`                                                     | `service.get_board_detail`                                               | `BoardDetailSchema`                                     | `require_member`                                  |
| REQ-BOARD-4 | `PATCH /api/boards/<id>`                                                               | `boards/routes.py::update_board`                                                  | `service.rename_board`                                                   | `BoardUpdateSchema`                                     | `require_admin`                                   |
| REQ-BOARD-5 | `DELETE /api/boards/<id>`                                                              | `boards/routes.py::delete_board`                                                  | `service.delete_board`, `columns/service.soft_delete_columns`            | n/a                                                     | `require_admin`                                   |
| REQ-BOARD-6 | `GET/POST /api/boards/<id>/members`, `PATCH/DELETE /api/boards/<id>/members/<user_id>` | `boards/routes.py`                                                                | `service.list_members`, `add_member`, `set_member_role`, `remove_member` | `MemberAddSchema`, `MemberUpdateSchema`, `MemberSchema` | `require_member` (list), `require_admin` (change) |
| REQ-BOARD-7 | page `/`                                                                               | `app/page.tsx`                                                                    | `lib/serverApi.ts`, `components/boards/CreateBoardButton.tsx`            | n/a                                                     | middleware + `withSession`                        |
| REQ-BOARD-8 | page `/boards/[id]`                                                                    | `app/boards/[id]/page.tsx` → `components/board/BoardView.tsx`, `MembersModal.tsx` | `lib/api.ts::boards`                                                     | n/a                                                     | middleware + 403/404 handling                     |

## Model

`boards(id, name, owner_id, created_at, updated_at, deleted_at)` and `board_members(id, board_id, user_id, role, created_at, updated_at)` with `UNIQUE(board_id, user_id)` and `CHECK (role in ('admin','member'))`.

## Behaviour notes

- `require_member` and `require_admin` in `boards/service.py` are the single authorization entry points reused by columns, cards, comments and analytics (BE-08).
- The board detail runs three queries: members, columns, and one `IN` query for cards; cards are grouped to columns in memory (DB-09).
- Soft-delete cascade updates comments, cards, then columns, because each statement selects through its still-live parent; all rows share one timestamp.
- The last-admin rule counts admins in the same transaction before changing a role or removing a member.
