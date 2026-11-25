# Comments: Design

## Routes and pages

| REQ       | Interface                       | Handler                                                                       | Service                            | Schema               | Authorization                           |
| --------- | ------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------- | -------------------- | --------------------------------------- |
| REQ-CMT-1 | `POST /api/cards/<id>/comments` | `comments/routes.py::add_comment`                                             | `comments/service.py::add_comment` | `CommentWriteSchema` | `require_card_member`                   |
| REQ-CMT-2 | `GET /api/cards/<id>/comments`  | `comments/routes.py::list_comments`                                           | `service.list_comments`            | `CommentSchema`      | `require_card_member`                   |
| REQ-CMT-3 | `PATCH /api/comments/<id>`      | `comments/routes.py::edit_comment`                                            | `service.edit_comment`             | `CommentWriteSchema` | membership + `comment.user_id == actor` |
| REQ-CMT-4 | `DELETE /api/comments/<id>`     | `comments/routes.py::delete_comment`                                          | `service.delete_comment`           | n/a                  | membership + owner                      |
| REQ-CMT-5 | card dialog                     | `components/board/CardDetailModal.tsx`, `components/comments/CommentList.tsx` | `lib/api.ts::comments`             | n/a                  | owner-only buttons (UI hint only)       |

## Model

`comments(id, card_id, user_id, content, created_at, updated_at, deleted_at)`; `user_id` is `RESTRICT` so deleting a user can never silently erase content (DB-05). `Comment.author` is a joined relationship so a list is one query.

## Behaviour notes

- `_require_owner` first checks that the caller is still a board member (a removed member cannot edit), then that they wrote the comment. Both failures are `403`.
- `CommentWriteSchema` has no `user_id` field and rejects unknown keys, so the author can only come from the token (BE-07).
- A new comment notifies the card's assignee and creator, excluding the author (see 05-notifications).
- The UI hides Edit and Delete for others' comments as a convenience; the API enforces ownership regardless.
