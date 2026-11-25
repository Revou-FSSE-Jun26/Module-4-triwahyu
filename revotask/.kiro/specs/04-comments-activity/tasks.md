# Comments: Tasks

## Backend

- [x] **T-CMT-1** Model `Comment`. _(REQ-CMT-1)_ → `backend/app/models/comment.py`
- [x] **T-CMT-2** `POST` and `GET /api/cards/<id>/comments`. _(REQ-CMT-1, REQ-CMT-2)_ → `backend/app/blueprints/comments/{routes,service,schema}.py`, `tests/test_comments.py`
- [x] **T-CMT-3** `PATCH /api/comments/<id>` owner only. _(REQ-CMT-3)_ → same files
- [x] **T-CMT-4** `DELETE /api/comments/<id>` owner only. _(REQ-CMT-4)_ → same files
- [x] **T-CMT-5** Comment tests for 201, 400, 401 and 403 plus edit, delete and ordering. _(REQ-CMT-1, REQ-CMT-2, REQ-CMT-3, REQ-CMT-4)_ → `backend/tests/test_comments.py`

## Frontend

- [x] **T-CMT-6** `CommentList` with inline edit, delete and states. _(REQ-CMT-5)_ → `frontend/src/components/comments/CommentList.tsx`, `CommentList.test.tsx`
- [x] **T-CMT-7** `CardDetailModal` composing `CommentList` in `BaseModal` with the comment form. _(REQ-CMT-5)_ → `frontend/src/components/board/CardDetailModal.tsx`
- [x] **T-CMT-8** Playwright: add and edit a comment. _(REQ-CMT-5, REQ-E2E-1)_ → `frontend/e2e/kanban.spec.ts`
