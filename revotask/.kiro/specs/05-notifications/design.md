# Notifications: Design

## Routes and pages

| REQ         | Interface                                | Handler                                                                           | Service                                                  | Schema                                  | Authorization                          |
| ----------- | ---------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------- | -------------------------------------- |
| REQ-NOTIF-1 | `GET /api/notifications?page=&per_page=` | `notifications/routes.py::list_notifications`                                     | `notifications/service.py::list_notifications`           | `PageQuerySchema`, `NotificationSchema` | `@jwt_required`, filtered by `user_id` |
| REQ-NOTIF-2 | `PATCH /api/notifications/<id>/read`     | `notifications/routes.py::mark_read`                                              | `service.mark_read`                                      | `NotificationSchema`                    | owner or `404`                         |
| REQ-NOTIF-3 | header bell                              | `components/notifications/NotificationBell.tsx`                                   | `hooks/useNotifications.ts`, `lib/api.ts::notifications` | n/a                                     | signed in                              |
| REQ-NOTIF-4 | domain events                            | `auth/service.py`, `cards/service.py`, `comments/service.py`, `boards/service.py` | `notifications/service.py::notify`                       | n/a                                     | n/a                                    |

## Model

`notifications(id, user_id, type, message, card_id, board_id, read_at, created_at, updated_at)` with an index on `(user_id, created_at)`. The API exposes `read` (boolean) derived from `read_at`.

## Behaviour notes

- `notify()` only stages a row; the calling service commits, so a notification exists if and only if the action that caused it committed.
- `unread_count` is computed in one aggregate query, independent of the page requested.
- Polling uses a 30 s `setInterval` with an in-flight guard rather than recursive timeouts, so a slow response never causes overlapping requests.
- The bell is a `BaseButton`; its panel is a labelled region closed by Escape or an outside click.
