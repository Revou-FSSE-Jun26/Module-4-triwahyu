# Analytics: Requirements

## Scope

Per-board analytics for administrators: cards per column, cards completed this week, and member activity, all computed with SQLAlchemy joins in the service layer.

## Requirements

### REQ-ANL-1 · Cards per column

- **AC-ANL-1.1** WHEN a board admin calls `GET /api/boards/<id>/analytics`, THEN the API SHALL return `cards_per_column`: every live column in order with its live card count (zero for empty columns).
- **AC-ANL-1.2** Soft-deleted cards and columns SHALL NOT be counted.

### REQ-ANL-2 · Cards completed this week

- **AC-ANL-2.1** The response SHALL include `completed_this_week`: the number of live cards in columns flagged `is_done` whose `column_entered_at` is on or after Monday 00:00 UTC of the current ISO week.
- **AC-ANL-2.2** WHEN a card entered a done column in an earlier week, THEN it SHALL NOT be counted.
- **AC-ANL-2.3** The response SHALL include `week_start` as an ISO 8601 UTC timestamp.

### REQ-ANL-3 · Member activity

- **AC-ANL-3.1** The response SHALL include `member_activity`: for every board member, `cards_assigned`, `cards_completed` (this week) and `comments_made`, counting only live content on this board.
- **AC-ANL-3.2** Members with no activity SHALL still appear with zeros.

### REQ-ANL-4 · Access

- **AC-ANL-4.1** WHEN a non-admin member or a non-member calls, THEN `403`; WHEN no token, THEN `401`; WHEN the board does not exist, THEN `404`.

### REQ-ANL-5 · Analytics dialog

- **AC-ANL-5.1** WHEN an admin opens "Analytics" on a board, THEN a `BaseModal` SHALL show completed-this-week, cards per column, and a member activity table.
- **AC-ANL-5.2** Members SHALL NOT see the Analytics action.
