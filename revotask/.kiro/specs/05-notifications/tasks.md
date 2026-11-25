# Notifications: Tasks

## Backend

- [x] **T-NOTIF-1** Model `Notification` and the `notify()` helper. _(REQ-NOTIF-4)_ → `backend/app/models/notification.py`, `notifications/service.py`
- [x] **T-NOTIF-2** `GET /api/notifications` with validated pagination and unread count. _(REQ-NOTIF-1)_ → `backend/app/blueprints/notifications/{routes,service,schema}.py`, `tests/test_notifications.py`
- [x] **T-NOTIF-3** `PATCH /api/notifications/<id>/read`. _(REQ-NOTIF-2)_ → same files
- [x] **T-NOTIF-4** Emit notifications on register, assignment, comment and member add. _(REQ-NOTIF-4)_ → `auth/service.py`, `cards/service.py`, `comments/service.py`, `boards/service.py`, tests in `test_auth.py`, `test_cards.py`, `test_comments.py`, `test_boards.py`

## Frontend

- [x] **T-NOTIF-5** `useNotifications` polling every 30 s without overlap. _(REQ-NOTIF-3)_ → `frontend/src/hooks/useNotifications.ts`, `useNotifications.test.tsx`
- [x] **T-NOTIF-6** `NotificationBell` badge, list and mark-read. _(REQ-NOTIF-3)_ → `frontend/src/components/notifications/NotificationBell.tsx`, `NotificationBell.test.tsx`
- [x] **T-NOTIF-7** Playwright: unread count visible after sign-up. _(REQ-NOTIF-3, REQ-E2E-1)_ → `frontend/e2e/kanban.spec.ts`
