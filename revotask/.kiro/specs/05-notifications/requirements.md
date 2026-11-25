# Notifications: Requirements

## Scope

In-app notifications, pagination, mark-as-read, and the header bell that polls for new ones. Notifications are in-app only; no email or push.

## Requirements

### REQ-NOTIF-1 · List notifications

- **AC-NOTIF-1.1** WHEN `GET /api/notifications` is called, THEN the API SHALL return the caller's notifications newest first as `{items, page, per_page, total, pages, unread_count}`.
- **AC-NOTIF-1.2** WHEN `page` and `per_page` are given, THEN the API SHALL slice accordingly; the defaults SHALL be page 1 and 20 per page.
- **AC-NOTIF-1.3** WHEN `page` is below 1, or `per_page` is below 1, above 100, or not a number, THEN `400`.
- **AC-NOTIF-1.4** A user SHALL only ever see their own notifications; no token → `401`.

### REQ-NOTIF-2 · Mark a notification as read

- **AC-NOTIF-2.1** WHEN the owner calls `PATCH /api/notifications/<id>/read`, THEN the API SHALL set `read_at` and respond `200` with `read: true`; repeating the call SHALL be harmless.
- **AC-NOTIF-2.2** WHEN the notification belongs to another user or does not exist, THEN `404` (so ids are never confirmed); no token → `401`.

### REQ-NOTIF-3 · Polling hook and bell

**Story:** As a user, I want to see new activity without reloading.

- **AC-NOTIF-3.1** `hooks/useNotifications.ts` SHALL load notifications on mount and then poll `GET /api/notifications` every 30 seconds while signed in.
- **AC-NOTIF-3.2** The hook SHALL skip a tick while a request is in flight, stop polling on unmount or sign-out, and sign the user out on `401`.
- **AC-NOTIF-3.3** `NotificationBell.tsx` SHALL show the unread count as a badge in the header, with an accessible name that includes the count, and cap display at `99+`.
- **AC-NOTIF-3.4** The bell SHALL open a list of recent notifications, offer "Mark read" on unread ones (optimistic with rollback), and close on Escape.

### REQ-NOTIF-4 · Events that create notifications

- **AC-NOTIF-4.1** WHEN a user registers, THEN they SHALL receive one unread `welcome` notification.
- **AC-NOTIF-4.2** WHEN a card is assigned to a user other than the actor, THEN that user SHALL receive `card_assigned`; self-assignment SHALL NOT notify.
- **AC-NOTIF-4.3** WHEN someone comments on a card, THEN the card's assignee and creator SHALL receive `comment_added`, excluding the commenter.
- **AC-NOTIF-4.4** WHEN an admin adds a user to a board, THEN that user SHALL receive `member_added`.
